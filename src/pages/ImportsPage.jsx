import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import Header from "../components/Header/Header";
import ImportSection from "../components/Imports/ImportSection";
import { METRICS, sharedKeysAcross } from "../components/Imports/importFlags";
import useFetch from "../utils/useFetch";
import { useQueryStringSourcesParams } from "../utils/useQueryStringSourcesParams";
import "../components/Imports/imports.css";

// The import report: for every data source the user has selected, what has been
// imported into it, what each import produced, and whether that looks right.
//
// One section per source rather than one merged table: the collections genuinely
// differ in what they record -- the grouping key, the available measures, whether
// there is any file provenance at all -- so merging would force incompatible things
// into shared columns and invent zeroes. Which source is which kind is never
// configured here; /db/query/summary derives it from the index and reports both the
// probe and the field it chose.
export default function ImportsPage() {
  const auth = useAuth();
  const { querySourcesString } = useQueryStringSourcesParams();

  const metricParams = METRICS.map((m) => `metrics=${m}`).join("&");
  const url = `db/query/summary?${metricParams}${
    querySourcesString ? `&${querySourcesString}` : ""
  }`;
  const { data, loading, error } = useFetch(url);

  // memoized so `sections` is a stable reference: a fresh [] on every render
  // would re-run sharedKeysAcross, and re-flag every row, on every keystroke
  // elsewhere in the tree.
  const sections = useMemo(() => data?.response || [], [data]);
  const sharedKeys = useMemo(() => sharedKeysAcross(sections), [sections]);
  const comparable = sharedKeys.size > 0;

  return (
    <>
      <Header />
      <div className="im-page">
        <Link className="im-back" to="/">
          ← Back to search
        </Link>

        <h1 className="im-h1">Data imports</h1>
        <p className="im-dek">
          One row per imported file, for each data source you have selected. Open a
          row to see what that import actually produced.
        </p>

        {loading && (
          <p className="im-status" role="status">
            Reading the selected data sources…
          </p>
        )}

        {error && (
          <p className="im-error" role="status">
            {error}
          </p>
        )}

        {!loading && !error && sections.length === 0 && (
          <p className="im-status" role="status">
            {auth.isAuthenticated
              ? "No data sources selected. Pick one on the search page and come back."
              : "Sign in, or select a public data source on the search page, to see what has been imported."}
          </p>
        )}

        {sections.length > 1 && (
          <nav className="im-jump" aria-label="Data sources in this report">
            {sections.map((s) => (
              <a key={s.data_source} className="im-jumpitem" href={`#source-${s.data_source}`}>
                <b>{s.data_source}</b>
                <span>
                  {s.error ? "unavailable" : `${(s.rows || []).length} entries`}
                </span>
              </a>
            ))}
          </nav>
        )}

        {sections.length > 1 && !comparable && (
          <p className="im-note">
            These data sources record provenance differently, so their rows are not
            comparable with one another. Each section says what it is grouped by.
          </p>
        )}

        {sections.map((section) => (
          <ImportSection
            key={section.data_source}
            section={section}
            sharedKeys={sharedKeys}
          />
        ))}
      </div>
    </>
  );
}
