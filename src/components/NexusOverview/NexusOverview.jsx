/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import * as Plot from "@observablehq/plot";

import Spinner from "../Icons/Spinner";
import { readOverview } from "./nexus.js";
import { createHsdsClient } from "./hsdsClient.js";
import "./nexusOverview.css";

// A curated, per-file NeXus view: the materials a `.nxs` carries, the shared
// investigation's title and free-text description, and the default plot per
// NXentry -- the same facts the import_pipeline `corpus_overview` task
// renders, read here straight from HSDS.
//
// Props (host-owned unless noted):
//   domain      string, required -- the HSDS filepath of the file to open.
//   hsdsUrl     string, required -- HSDS service base URL.
//   authHeader  string, required -- the Authorization header value
//               ("Bearer <token>" for a signed-in user, "Basic <base64>"
//               for anonymous access). The host builds it; this component
//               never reads a token, env var, or storage.
//
// Changing any prop after mount re-reads the file.

function fileLabel(domain) {
  const parts = String(domain || "").split("/").filter(Boolean);
  return parts[parts.length - 1] || String(domain || "");
}

function IdentityLine({ meta }) {
  const bits = [meta.material, meta.method, meta.provider].filter(Boolean);
  if (!bits.length) return null;
  return <p className="nov-identity">{bits.join(" · ")}</p>;
}

function NexusPlot({ plot }) {
  const ref = useRef(null);

  useEffect(() => {
    const host = ref.current;
    if (!host || !plot || plot.kind === "unsupported") return undefined;

    const ACCENT = "#2a78d6";
    const marks = [
      Plot.axisY({ label: plot.yLabel ?? null, labelAnchor: "center", marginLeft: 64 }),
      Plot.axisX({ label: plot.xLabel ?? null, labelAnchor: "center" }),
    ];

    if (plot.kind === "heatmap") {
      const chart = Plot.plot({
        width: 640,
        height: 320,
        marginLeft: 72,
        color: { scheme: "blues", legend: true, label: plot.valueLabel ?? null },
        x: { label: plot.xLabel ?? null },
        y: { label: plot.yLabel ?? null },
        marks: [Plot.cell(plot.cells, { x: "x", y: "y", fill: "v", inset: 0.5 })],
      });
      host.append(chart);
      return () => chart.remove();
    }

    if (plot.kind === "replicates") {
      if (Number.isFinite(plot.meanY)) {
        if (plot.sdY > 0) {
          marks.push(
            Plot.rect([{}], {
              y1: plot.meanY - plot.sdY,
              y2: plot.meanY + plot.sdY,
              fill: ACCENT,
              fillOpacity: 0.08,
            }),
          );
        }
        marks.push(Plot.ruleY([plot.meanY], { stroke: ACCENT, strokeWidth: 1.4 }));
      }
      marks.push(Plot.dot(plot.points, { x: "x", y: "y", fill: ACCENT, r: 4 }));
    } else {
      if (plot.points.some((p) => Number.isFinite(p.sd) && p.sd > 0)) {
        marks.push(
          Plot.areaY(plot.points, {
            x: "x",
            y1: (d) => d.y - d.sd,
            y2: (d) => d.y + d.sd,
            fill: ACCENT,
            fillOpacity: 0.1,
          }),
        );
      }
      const dense = plot.points.length > 40;
      marks.push(Plot.line(plot.points, { x: "x", y: "y", stroke: ACCENT }));
      if (!dense) {
        marks.push(Plot.dot(plot.points, { x: "x", y: "y", fill: ACCENT, r: 3 }));
      }
    }

    const chart = Plot.plot({
      grid: true,
      width: 640,
      height: 300,
      style: { background: "transparent" },
      x: plot.log ? { type: "log" } : undefined,
      marks,
    });
    host.append(chart);
    return () => chart.remove();
  }, [plot]);

  if (!plot || plot.kind === "unsupported") {
    return (
      <p className="nov-muted">
        No default plot here{plot?.reason ? ` (${plot.reason})` : ""} — open the
        file in h5web for the full tree.
      </p>
    );
  }
  return <div className="nov-plot" ref={ref} />;
}

function EntryCard({ entry }) {
  return (
    <section className="nov-entry">
      <h3 className="nov-entry-title">
        <code>{entry.name}</code>
      </h3>
      <IdentityLine meta={entry} />
      {entry.investigation && (
        <p className="nov-inv-title">
          <strong>{entry.investigation}</strong>
        </p>
      )}
      {entry.investigationDescription && (
        <blockquote className="nov-inv-desc">{entry.investigationDescription}</blockquote>
      )}
      {entry.error ? (
        <p className="nov-muted">could not read: {entry.error}</p>
      ) : (
        <NexusPlot plot={entry.plot} />
      )}
    </section>
  );
}

function OverviewContent({
  domain,
  hsdsUrl,
  authHeader,
  focusEntry,
  focusPath,
  onClearFocus,
}) {
  const [state, setState] = useState({ status: "loading" });
  const focusPathKey = (focusPath || []).join("/");

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    const client = createHsdsClient({ hsdsUrl, domain, authHeader });
    const focus = focusEntry
      ? { name: focusEntry, path: focusPathKey ? focusPathKey.split("/") : [] }
      : null;
    readOverview(client, focus)
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) =>
        !cancelled && setState({ status: "error", message: String(err?.message || err) }),
      );
    return () => {
      cancelled = true;
    };
  }, [domain, hsdsUrl, authHeader, focusEntry, focusPathKey]);

  if (state.status === "loading") {
    return (
      <p className="nov-loading" role="status" aria-live="polite">
        <Spinner />
        <span>Reading {fileLabel(domain)}…</span>
      </p>
    );
  }
  if (state.status === "error") {
    return <p className="nov-error">Could not read this file: {state.message}</p>;
  }

  const { materials, entries } = state.data;
  const focused = focusEntry
    ? entries.filter((e) => e.name === focusEntry)
    : entries;
  const shown = focused.length ? focused : entries;
  const scopedToOne = focusEntry && focused.length > 0 && entries.length > 1;

  return (
    <>
      <header className="nov-header">
        <h2>{fileLabel(domain)}</h2>
        <p className="nov-materials">
          <strong>Materials in this file:</strong>{" "}
          {materials.length ? materials.join(", ") : "none recorded"}
        </p>
        <p className="nov-note">
          Test items and the controls / vehicles / blanks dosed alongside them
          are listed together; the investigation text below each plot is what
          says what a study set out to test.
        </p>
        {scopedToOne && (
          <p className="nov-note">
            Showing one entry from the link.{" "}
            {onClearFocus && (
              <button type="button" className="nov-linkbtn" onClick={onClearFocus}>
                Show all {entries.length}
              </button>
            )}
          </p>
        )}
        {focusEntry && focused.length === 0 && (
          <p className="nov-note">
            No entry <code>{focusEntry}</code> in this file — showing all{" "}
            {entries.length}.
          </p>
        )}
      </header>
      {entries.length === 0 && <p className="nov-muted">No NXentry groups in this file.</p>}
      {shown.map((entry, i) => (
        <EntryCard key={`${entry.name}-${i}`} entry={entry} />
      ))}
    </>
  );
}

export default function NexusOverview({
  domain,
  hsdsUrl,
  authHeader,
  focusEntry,
  focusPath,
  onClearFocus,
}) {
  if (!domain || !hsdsUrl || !authHeader) {
    return (
      <div className="nexus-overview-root">
        <p className="nov-error">
          NeXus overview needs a domain, an HSDS URL and an auth header.
        </p>
      </div>
    );
  }

  return (
    <div className="nexus-overview-root">
      <OverviewContent
        domain={domain}
        hsdsUrl={hsdsUrl}
        authHeader={authHeader}
        focusEntry={focusEntry || null}
        focusPath={focusPath || null}
        onClearFocus={onClearFocus}
      />
    </div>
  );
}
