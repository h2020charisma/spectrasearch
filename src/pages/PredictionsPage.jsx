import { useParams, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { ErrorBoundary } from "react-error-boundary";
import PredictionViewer from "@ideaconsult/qubounds-viewer";
import "@ideaconsult/qubounds-viewer/style.css";
import Header from "../components/Header/Header";
import { getRuntimeConfig } from "../config";

// Embeds the qu-bounds prediction viewer as a React component (like h5web).
// Auth is native: the Keycloak token is passed as a prop; same origin/scope so
// the service worker + token cover the viewer's requests. No URL token.
export default function PredictionsPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const auth = useAuth();
  const config = getRuntimeConfig();

  const token = auth?.user?.access_token;
  const dataSource =
    params.get("data_source") ||
    config.predictionsCore ||
    "vega";
  const chemicalsCore = config.chemicalsCore || "dsstox";
  const subjectField = config.subjectField || "dsstox_id_s";
  const hsds = {
    url: config.hsdsUrl || "https://hsds.adma.ai",
    domain: config.hsdsDomain || "/qubounds",
  };
  const apiBase = (config.apiBaseUrl || "").replace(/\/$/, "");

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
            predictionsCore={dataSource}
            chemicalsCore={chemicalsCore}
            subjectField={subjectField}
            hsds={hsds}
            token={token}
            apiBase={apiBase}
            showHeader={false}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
