/* eslint-disable react/prop-types */
import { Fragment, useMemo, useState } from "react";
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
};

// What the grouping field means, in the reader's terms. The backend picks the
// fields; this only names them, and falls back to the field itself so a field
// added later still renders sensibly.
const FIELD_LABEL = {
  __input_file_s: "Input file",
  nexus_file_ss: "NeXus file",
  reference_s: "Dataset",
  reference_owner_s: "Data provider",
};

function fieldLabel(field) {
  return FIELD_LABEL[field] || field;
}

// A NeXus study's textValue_s is "<file>.nxs#<path inside it>". A row stands for
// a whole import, not one measurement inside it, so open the FILE -- that view
// covers every study the row counts. Without this the row's link opened one
// arbitrary entry out of hundreds and silently claimed to represent the rest.
function wholeFileDomain(value) {
  if (typeof value !== "string") return null;
  const cut = value.indexOf(".nxs#");
  return cut > 0 ? value.slice(0, cut + 4) : null;
}

// The row's representative document, shaped as a search hit so the viewers
// registry dispatches it exactly as it dispatches a result -- on `value`.
// Nothing here decides which viewer is right.
function representativeItem(row, label) {
  const fileDomain = wholeFileDomain(row.value);
  if (!row.uuid && !row.value) return null;
  // entries = distinct protocol applications; row.count is a raw document
  // count and is inflated by the per-effect duplication, so never use it here.
  const n = row.entries ?? 0;
  return {
    item: {
      type: "study",
      id: row.uuid,
      uuid: row.uuid,
      substance_uuid: row.substance_uuid,
      value: fileDomain || row.value,
      text: label,
    },
    // Whether the link's target really is the whole row. A single document is;
    // a whole .nxs file is, because the row IS that import. The no-input-file
    // bucket never is -- it lumps together every record whose origin was not
    // recorded, which is not one import and has no single thing to open.
    coversAll: row.key !== null && (Boolean(fileDomain) || n <= 1),
  };
}

function docLabel(doc, i) {
  // What the study IS, never its uuid -- uuids are for the API. Falls back only
  // as far as it has to, so an entry is always pickable.
  const parts = [doc.material, doc.method].filter(Boolean);
  if (parts.length) return parts.join(" — ");
  return `Study ${i + 1}`;
}

function InspectLink({ row, label }) {
  const rep = representativeItem(row, label);
  // resolveViewersForItem returns {viewer, href, external} -- already-resolved
  // hrefs, not viewers -- so the dispatch decision is entirely the registry's,
  // same as ResultActions.
  const primary = rep ? resolveViewersForItem(rep.item)[0] : null;
  const docs = row.documents || [];

  // One link is right when it genuinely opens the whole row: a single study, or
  // a whole .nxs file whose view covers every study the row counts.
  if (primary && rep.coversAll) {
    const Anchor = primary.external ? "a" : Link;
    const props = primary.external
      ? { href: primary.href, target: "_blank", rel: "noreferrer" }
      : { to: primary.href };
    return (
      <Anchor className="im-inspect" {...props} title={`Open ${primary.viewer.label}`}>
        {primary.viewer.label} {primary.external ? "↗" : "→"}
      </Anchor>
    );
  }

  // Otherwise the row covers several studies. Offer them all rather than picking
  // one: handing over an arbitrary member leaves the reader unable to reach the
  // rest, and unable to tell which one they were given.
  const openable = docs
    .map((doc, i) => {
      const item = {
        type: "study",
        id: doc.uuid,
        uuid: doc.uuid,
        substance_uuid: doc.substance_uuid,
        value: doc.value,
        text: docLabel(doc, i),
      };
      const viewer = resolveViewersForItem(item)[0];
      return viewer ? { key: doc.uuid || i, label: docLabel(doc, i), viewer } : null;
    })
    .filter(Boolean);

  if (!openable.length) {
    return (
      <span className="im-noview" title="This row has no study to open">
        —
      </span>
    );
  }

  const total = row.entries ?? openable.length;
  return (
    <details className="im-picker">
      <summary title="Choose a study from this import">
        {total} {total === 1 ? "study" : "studies"}
      </summary>
      <ul>
        {openable.map((o) => (
          <li key={o.key}>
            {o.viewer.external ? (
              <a href={o.viewer.href} target="_blank" rel="noreferrer">
                {o.label} ↗
              </a>
            ) : (
              <Link to={o.viewer.href}>{o.label} →</Link>
            )}
          </li>
        ))}
        {total > openable.length && (
          <li className="im-more">
            showing {openable.length} of {total}
          </li>
        )}
      </ul>
    </details>
  );
}

// What was measured. This is the line a partner actually reads: "TEM, AUC, DLS"
// says whether the right work arrived, where an investigation title does not.
function methodLine(row) {
  const names = row.method_names || [];
  if (!names.length) return null;
  const extra = (row.methods || 0) - names.length;
  return extra > 0 ? `${names.join(" · ")} +${extra} more` : names.join(" · ");
}

// investigation_title_s. Shown only when a title flag fired, as the evidence for
// it -- otherwise it is noise: in several corpora the value is a method name, a
// placeholder, or a whole paragraph, which is the defect being reported rather
// than something worth reading on every row.
const TITLE_FLAGS = [
  "multi-investigation",
  "title-reused",
  "title-is-description",
  "placeholder",
];

function titleEvidence(row) {
  if (!row.flags.some((f) => TITLE_FLAGS.includes(f))) return null;
  const titles = row.investigation || [];
  if (!titles.length) return null;
  return titles.length > 1
    ? `${titles.length} investigations: ${titles.join(" · ")}`
    : `Investigation: ${titles[0]}`;
}

export default function ImportSection({ section, sharedKeys }) {
  const [filter, setFilter] = useState(null);

  const groupBy = section.group_by || [];
  // The subject being assessed is the import -- the first grouping level. The
  // levels under it (topcategory / endpointcategory) break one import into
  // readable rows, which matters when a whole collection came from one
  // spreadsheet, but they are attributes of the row, not the thing being judged.
  const keyField = groupBy[0];
  const breakdownFields = groupBy.slice(1);

  const rows = useMemo(
    () => flagRows(section.rows || [], [keyField], METRICS, sharedKeys),
    [section.rows, keyField, sharedKeys],
  );
  // methods is fetched but not a column: the names are listed under the file,
  // and a bare count beside them says nothing extra.
  const columns = useMemo(
    () => reportedMetrics(rows, METRICS).filter((m) => m !== "methods"),
    [rows],
  );
  const counts = useMemo(() => countFlags(rows), [rows]);

  const visible = filter ? rows.filter((r) => r.flags.includes(filter)) : rows;

  // Grouped by data provider, because that is how people arrive here: a partner
  // looks for their own organisation, then their own files. The provider is a
  // value on the row, not a grouping level -- reference_owner_s lives on the study
  // record while the grouping key lives on the params child, so the backend reads
  // it through the join and the grouping is done here.
  const groups = useMemo(() => {
    const byProvider = new Map();
    for (const row of visible) {
      const provider = row.provider?.length ? row.provider.join(", ") : null;
      if (!byProvider.has(provider)) byProvider.set(provider, []);
      byProvider.get(provider).push(row);
    }
    const out = [...byProvider.entries()].map(([parent, rows]) => ({ parent, rows }));
    // a single unnamed provider is no grouping at all -- don't draw a band for it
    if (out.length === 1 && out[0].parent === null) return [{ parent: null, rows: visible }];
    return out;
  }, [visible]);

  const grouped = groups.some((g) => g.parent !== null);

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

  const colSpan = columns.length + 3 + (groupBy.length > 1 ? 1 : 0);

  return (
    <section className="im-section" id={`source-${section.data_source}`}>
      <div className="im-sectionhead">
        <h2 className="im-h2">{section.data_source}</h2>
        <p className="im-sub">
          {rows.length} {rows.length === 1 ? "entry" : "entries"} ·{" "}
          <code>{keyField}</code>
          {breakdownFields.length ? ` × ${breakdownFields.join(" × ")}` : ""}
          {grouped ? ", by data provider" : ""} · {section.entries} studies
        </p>
      </div>

      {/* The question is "which files were imported". A collection that records
          no input file cannot answer it, and saying so is the useful output --
          grouping by something else instead would produce a full-looking table
          that answers a different question. */}
      {section.records_input_files === false && (
        <p className="im-error" role="status">
          <b>No input files recorded.</b> None of this data source&rsquo;s{" "}
          {section.numFound} documents carries <code>__input_file_s</code>, so
          there is no way to tell which file each record came from. This is an
          import-pipeline gap, not an empty collection — the records below are
          grouped by data provider only.
        </p>
      )}

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
                <th scope="col">{fieldLabel(keyField)}</th>
                {breakdownFields.length > 0 && <th scope="col">Category</th>}
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
              {groups.map((group, gi) => (
                <Fragment key={group.parent ?? `group-${gi}`}>
                  {grouped && (
                    <tr className="im-grouprow">
                      <td colSpan={colSpan}>
                        {group.parent === null ? (
                          <em>no data provider recorded</em>
                        ) : (
                          group.parent
                        )}
                        <span>
                          {group.rows.length}{" "}
                          {group.rows.length === 1 ? "entry" : "entries"}
                        </span>
                      </td>
                    </tr>
                  )}
                  {group.rows.map((row, i) => {
                    const label =
                      row.key === null ? "no input file recorded" : String(row.key);
                    const methods = methodLine(row);
                    const title = titleEvidence(row);
                    // Repeated only once per import: the breakdown rows beneath
                    // it belong to the same file, and restating it on each would
                    // read as separate imports.
                    const repeat = i > 0 && group.rows[i - 1].key === row.key;
                    return (
                      <tr key={`${row.key ?? "missing"}-${gi}-${i}`}>
                        <td className="im-key">
                          {!repeat && (
                            <span
                              className={row.key === null ? "im-missing" : "im-name"}
                            >
                              {label}
                            </span>
                          )}
                          {methods && <span className="im-inv">{methods}</span>}
                          {title && (
                            <span className="im-inv im-inv-bad">{title}</span>
                          )}
                        </td>
                        {breakdownFields.length > 0 && (
                          <td className="im-cat">
                            {breakdownFields
                              .map((f) => row[f])
                              .filter(Boolean)
                              .join(" / ") || <em>uncategorised</em>}
                          </td>
                        )}
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
                                  className={`im-chip im-${
                                    FLAGS[f]?.severity || "warn"
                                  }`}
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
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
