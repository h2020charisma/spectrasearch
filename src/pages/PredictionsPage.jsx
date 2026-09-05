import {
  useParams,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { ErrorBoundary } from "react-error-boundary";
import PredictionViewer from "@ideaconsult/qubounds-viewer";
import "@ideaconsult/qubounds-viewer/style.css";
import Header from "../components/Header/Header";
import { getRuntimeConfig } from "../config";

// Embeds the qu-bounds prediction viewer as a React component (like h5web).
// The token prop covers fetch-based data requests. Synthesized thumbnail URLs
// stay anonymous; the host service worker may authenticate eligible images.
export default function PredictionsPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const config = getRuntimeConfig();

  // Same as the other viewer pages: return where the visitor came from, since
  // this is reachable from search, from a collection and from the import report.
  const hasHistory = location.key !== "default";

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
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            if (hasHistory) navigate(-1);
            else navigate("/");
          }}
        >
          {hasHistory ? "← Back" : "← Back to search"}
        </a>
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
