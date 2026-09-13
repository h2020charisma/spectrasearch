/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

const base = import.meta.env.BASE_URL;

function readCookie(name) {
  return document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function request(path, options = {}) {
  return fetch(`${base}${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      "X-Requested-With": "JavaScript",
      ...options.headers,
    },
  });
}

function AuthProbe() {
  const [session, setSession] = useState({ state: "loading" });
  const [diagnostics, setDiagnostics] = useState(null);

  async function refreshSession() {
    const response = await request("api/auth/session");
    if (!response.ok) {
      setSession({ state: "unavailable", status: response.status });
      setDiagnostics(null);
      return;
    }

    const current = await response.json();
    setSession({ state: current.authenticated ? "authenticated" : "anonymous", ...current });
    if (current.authenticated) {
      const diagnosticResponse = await request("api/auth/diagnostics");
      setDiagnostics(diagnosticResponse.ok ? await diagnosticResponse.json() : null);
    } else {
      setDiagnostics(null);
    }
  }

  useEffect(() => {
    refreshSession();
  }, []);

  async function localLogout() {
    const csrfToken = readCookie("csrf-token");
    const response = await request("api/auth/local-logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRF-TOKEN": csrfToken ?? "",
      },
      body: "",
    });
    if (!response.ok) {
      setSession({ state: "logout-failed", status: response.status });
      return;
    }
    await refreshSession();
  }

  return (
    <main>
      <p className="eyebrow">Phase 2 auth boundary</p>
      <h1>Encrypted session probe</h1>
      <p className="lede">
        This isolated page exercises Quarkus OIDC without loading the legacy browser token client.
      </p>

      <section aria-live="polite">
        <span className={`status status-${session.state}`}>{session.state}</span>
        {session.name && <strong data-testid="principal">{session.name}</strong>}
        {session.status && <code data-testid="status-code">HTTP {session.status}</code>}
      </section>

      {diagnostics && (
        <dl data-testid="diagnostics">
          <div><dt>Access token bytes</dt><dd>{diagnostics.accessTokenBytes}</dd></div>
          <div><dt>ID token bytes</dt><dd>{diagnostics.idTokenBytes}</dd></div>
          <div><dt>Top-level roles</dt><dd>{diagnostics.roleCount}</dd></div>
          <div><dt>Allowed origins</dt><dd>{diagnostics.allowedOriginCount}</dd></div>
        </dl>
      )}

      <nav aria-label="Authentication controls">
        <button type="button" onClick={() => window.location.assign(`${base}api/auth/login`)}>Sign in</button>
        <button type="button" onClick={refreshSession}>Refresh session</button>
        <button type="button" onClick={localLogout}>Local logout</button>
        <button type="button" onClick={() => window.location.assign(`${base}api/auth/rp-logout`)}>Keycloak logout</button>
      </nav>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("auth-probe-root")).render(
  <React.StrictMode>
    <AuthProbe />
  </React.StrictMode>,
);
