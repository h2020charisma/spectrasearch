import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { ErrorBoundary } from "react-error-boundary";
import SubstanceStudyViewer from "@ideaconsult/jtoxkit-react";
import "@ideaconsult/jtoxkit-react/style.css";
import Header from "../components/Header/Header";
import { substance2server } from "../utils/tagdbs";
import { getRuntimeConfig } from "../config";

// Embeds the jtoxkit-react substance/study viewer.
//
// URL params (produced by viewers.js viewerHref via the Solr doc fields):
//   ?substanceId=<s_uuid_hs>            e.g. NNRG-2cb3446e-c9c4-...
//   ?dbtag=<dbtag_hss[0]>               e.g. NNRG  (optional — UUID prefix is sufficient)
//   ?studyId=<document_uuid_s>          a study hit: open that one study inside the
//                                       substance instead of the whole study list
//
// apiBase is derived from the substance UUID prefix via TAG_DBS (no manual env var needed).
// Falls back to runtime config ambitUrl if the prefix is not in the table (unlikely).
export default function SubstancePage() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const config = getRuntimeConfig();

  const token = auth?.user?.access_token;
  const substanceId = params.get("substanceId") || undefined;
  const dbtag = params.get("dbtag") || undefined;
  const studyId = params.get("studyId") || undefined;

  // Derive apiBase: prefer explicit dbtag param, else extract from UUID prefix.
  const resolved = substance2server(dbtag || substanceId);
  const apiBase = resolved || config.ambitUrl || "";
  // An unrecognised prefix falls back to the configured default server, which
  // then answers "substance not found" for a substance that exists perfectly
  // well somewhere else. That reads like an authentication problem and costs
  // real debugging time, so say what actually happened.
  const unknownTag = Boolean(substanceId) && !resolved;

  // ramanchada-api base — used only for the dose-response conversion endpoint
  // (POST /dataset/convert?format=effectarray). Everything-except-AMBIT goes here.
  const convertBase = (config.apiBaseUrl || "").replace(/\/$/, "");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />
      <div style={{ padding: "6px 16px", borderBottom: "1px solid #eaecf0" }}>
        <Link to="/">← Back to search</Link>
      </div>
      {unknownTag && (
        <p
          role="status"
          style={{
            margin: 0,
            padding: "9px 16px",
            background: "#fdf3e0",
            color: "#7a5510",
            borderBottom: "1px solid #eaecf0",
            fontSize: 13,
          }}
        >
          <b>{String(dbtag || substanceId).split("-")[0]}</b> is not a known AMBIT
          database prefix, so this is being looked up on the default server (
          {apiBase}). If the substance is not found, it is most likely stored
          elsewhere — add the prefix to <code>src/utils/tagdbs.js</code>.
        </p>
      )}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <ErrorBoundary
          fallbackRender={({ error }) => (
            <div style={{ padding: 20 }}>
              Failed to load substance viewer: {error?.message}
            </div>
          )}
        >
          <SubstanceStudyViewer
            substanceId={substanceId}
            documentUuid={studyId}
            apiBase={apiBase}
            convertBase={convertBase}
            token={token}
            showHeader={false}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
