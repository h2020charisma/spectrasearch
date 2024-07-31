import { useNavigate } from "react-router-dom";

import "@h5web/app/dist/styles.css";

import { App, MockProvider } from "@h5web/app";

export default function H5web() {
  const navigate = useNavigate();
  return (
    <div>
      <button
        className="shareBtn"
        style={{ marginLeft: "16px" }}
        onClick={() => navigate(`/`)}
      >
        Back
      </button>
      <div style={{ height: "100vh" }}>
        <MockProvider>
          <App />
        </MockProvider>
      </div>
    </div>
  );
}
