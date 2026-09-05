/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { resolveViewersForItem } from "../../viewers";
import {
  FLAGS,
  METRICS,
  countFlags,
  flagRows,
  reportedMetrics,
} from "./importFlags";

const METRIC_LABEL = {
  studies: "Studies",
  materials: "Materials",
  methods: "Methods",
  endpoints: "Endpoints",
  effects: "Effects",
  spectra: "Spectra",
};

// What the grouping field means, in the reader's terms. The backend picks the
// field; this only names it, and falls back to the field itself so a field added
// later still renders sensibly.
const KEY_LABEL = {
  __input_file_s: "Input file",
  nexus_file_ss: "NeXus file",
  reference_s: "Dataset",
};

function keyLabel(field) {
  return KEY_LABEL[field] || field;
}

// The row's representative document, shaped as a search hit so the viewers
// registry can dispatch it exactly as it dispatches a result: on `value`
// (a ".nxs#" domain goes to the NeXus viewers, anything else to the AMBIT study
// viewer). Nothing here decides which viewer is right.
function representativeItem(row, label) {
  if (!row.uuid && !row.value) return null;
  return {
    type: "study",
    id: row.uuid,
    uuid: row.uuid,
    substance_uuid: row.substance_uuid,
    value: row.value,
    text: label,
  };
}

function InspectLink({ row, label }) {
  const item = representativeItem(row, label);
  // resolveViewersForItem returns {viewer, href, external} -- already-resolved
  // hrefs, not viewers -- so the dispatch decision is entirely the registry's,
  // same as ResultActions.
  const primary = item ? resolveViewersForItem(item)[0] : null;

  if (!primary) {
    return (
      <span className="im-noview" title="This row has no document to open">
        —
      </span>
    );
  }
  if (primary.external) {
    return (
      <a
        className="im-inspect"
        href={primary.href}
        target="_blank"
        rel="noreferrer"
      >
        {primary.viewer.label} ↗
      </a>
    );
  }
  return (
    <Link className="im-inspect" to={primary.href}>
      {primary.viewer.label} →
    </Link>
  );
}

function shortTitle(titles) {
  if (!titles?.length) return null;
  if (titles.length > 1) return `${titles.length} titles: ${titles.join(" · ")}`;
  return titles[0];
}

export default function ImportSection({ section, sharedKeys }) {
  const [filter, setFilter] = useState(null);

  const groupField = section.group_by?.[0];
  const rows = useMemo(
    () => flagRows(section.rows || [], section.group_by || [], METRICS, sharedKeys),
    [section.rows, section.group_by, sharedKeys],
  );
  const columns = useMemo(() => reportedMetrics(rows, METRICS), [rows]);
  const counts = useMemo(() => countFlags(rows), [rows]);

  const visible = filter ? rows.filter((r) => r.flags.includes(filter)) : rows;

  if (section.error) {
    return (
      <section className="im-section" id={`source-${section.data_source}`}>
        <h2 className="im-h2">{section.data_source}</h2>
        <p className="im-error" role="status">
          {section.error}
        </p>
      </section>
    );
  }

  return (
    <section className="im-section" id={`source-${section.data_source}`}>
      <div className="im-sectionhead">
        <h2 className="im-h2">{section.data_source}</h2>
        <p className="im-sub">
          {rows.length} {rows.length === 1 ? "entry" : "entries"} · grouped by{" "}
          <code>{groupField}</code> ({keyLabel(groupField).toLowerCase()}) ·{" "}
          {section.numFound} documents
        </p>
      </div>

      {Object.keys(counts).length > 0 && (
        <div className="im-findings">
          {Object.entries(counts).map(([flag, n]) => (
            <button
              key={flag}
              type="button"
              className={`im-finding im-${FLAGS[flag]?.severity || "warn"}`}
              aria-pressed={filter === flag}
              title={FLAGS[flag]?.hint}
              onClick={() => setFilter(filter === flag ? null : flag)}
            >
              <span className="im-n">{n}</span>
              <span>{FLAGS[flag]?.label || flag}</span>
            </button>
          ))}
          {filter && (
            <button type="button" className="im-clear" onClick={() => setFilter(null)}>
              Show all {rows.length}
            </button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="im-empty">Nothing imported into this data source yet.</p>
      ) : (
        <div className="im-tablewrap">
          <table className="im-table">
            <thead>
              <tr>
                <th scope="col">{keyLabel(groupField)}</th>
                {columns.map((m) => (
                  <th scope="col" key={m} className="im-num">
                    {METRIC_LABEL[m]}
                  </th>
                ))}
                <th scope="col">Findings</th>
                <th scope="col">
                  <span className="im-sr">Inspect</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => {
                const label =
                  row.key === null ? "no value recorded" : String(row.key);
                const title = shortTitle(row.investigation);
                return (
                  <tr key={row.key ?? `missing-${i}`}>
                    <td className="im-key">
                      <span className={row.key === null ? "im-missing" : "im-name"}>
                        {label}
                      </span>
                      {title && (
                        <span
                          className={
                            row.flags.some((f) => f.startsWith("title") || f === "placeholder")
                              ? "im-inv im-inv-bad"
                              : "im-inv"
                          }
                        >
                          {title}
                        </span>
                      )}
                    </td>
                    {columns.map((m) => (
                      <td key={m} className="im-num">
                        {typeof row[m] === "number" ? row[m] : "—"}
                      </td>
                    ))}
                    <td>
                      <span className="im-chips">
                        {row.flags.length === 0 ? (
                          <span className="im-chip im-ok">clean</span>
                        ) : (
                          row.flags.map((f) => (
                            <span
                              key={f}
                              className={`im-chip im-${FLAGS[f]?.severity || "warn"}`}
                              title={FLAGS[f]?.hint}
                            >
                              {FLAGS[f]?.label || f}
                            </span>
                          ))
                        )}
                      </span>
                    </td>
                    <td>
                      <InspectLink row={row} label={label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
