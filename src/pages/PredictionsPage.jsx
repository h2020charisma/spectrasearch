import { useParams, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { ErrorBoundary } from "react-error-boundary";
import PredictionViewer from "@adma/qubounds-viewer";
import "@adma/qubounds-viewer/style.css";
import Header from "../components/Header/Header";

// Embeds the qu-bounds prediction viewer as a React component (like h5web).
// Auth is native: the Keycloak token is passed as a prop; same origin/scope so
// the service worker + token cover the viewer's requests. No URL token.
export default function PredictionsPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const auth = useAuth();

  const token = auth?.user?.access_token;
  const dataSource =
    params.get("data_source") ||
    import.meta.env.VITE_PredictionsCore ||
    "vega";
  const apiBase = (import.meta.env.VITE_BaseURL || "").replace(/\/$/, "");

  // List mode: repeatable ?item= / ?compound= (e.g. from a collection) shows
  // several together. Single mode: the :id path param + ?mode= (item|compound).
  const listItems = params.getAll("item");
  const listSubjects = params.getAll("compound");
  const hasList = listItems.length > 0 || listSubjects.length > 0;
  const mode = params.get("mode") || "item";
  const selector = hasList
    ? { items: listItems, subjects: listSubjects }
    : mode === "compound"
    ? { subjects: id ? [id] : [] }
    : { items: id ? [id] : [] };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />
      <div style={{ padding: "6px 16px", borderBottom: "1px solid #eaecf0" }}>
        <Link to="/">← Back to search</Link>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ErrorBoundary
          fallbackRender={() => (
            <div style={{ padding: 20 }}>Failed to load the prediction viewer.</div>
          )}
        >
          <PredictionViewer
            {...selector}
            type="prediction"
            dataSource={dataSource}
            token={token}
            apiBase={apiBase}
            showHeader={false}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
