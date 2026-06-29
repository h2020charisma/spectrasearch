import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { ErrorBoundary } from "react-error-boundary";
import SubstanceStudyViewer from "@ideaconsult/jtoxkit-react";
import "@ideaconsult/jtoxkit-react/style.css";
import Header from "../components/Header/Header";
import { substance2server } from "../utils/tagdbs";

// Embeds the jtoxkit-react substance/study viewer.
//
// URL params (produced by viewers.js viewerHref via the Solr doc fields):
//   ?substanceId=<s_uuid_hs>            e.g. NNRG-2cb3446e-c9c4-...
//   ?dbtag=<dbtag_hss[0]>               e.g. NNRG  (optional — UUID prefix is sufficient)
//
// apiBase is derived from the substance UUID prefix via TAG_DBS (no manual env var needed).
// Falls back to VITE_AMBIT_URL if the prefix is not in the table (unlikely).
export default function SubstancePage() {
  const [params] = useSearchParams();
  const auth = useAuth();

  const token = auth?.user?.access_token;
  const substanceId = params.get("substanceId") || undefined;
  const dbtag = params.get("dbtag") || undefined;

  // Derive apiBase: prefer explicit dbtag param, else extract from UUID prefix.
  const apiBase =
    substance2server(dbtag || substanceId) ||
    import.meta.env.VITE_AMBIT_URL ||
    "";

  // ramanchada-api base — used only for the dose-response conversion endpoint
  // (POST /dataset/convert?format=effectarray). Everything-except-AMBIT goes here.
  const convertBase = (import.meta.env.VITE_BaseURL || "").replace(/\/$/, "");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />
      <div style={{ padding: "6px 16px", borderBottom: "1px solid #eaecf0" }}>
        <Link to="/">← Back to search</Link>
      </div>
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
