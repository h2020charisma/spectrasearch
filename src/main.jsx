import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import keycloak from "../utils/keycloak.jsx";

const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: App,
    },
  ],
  { basename: "/search" }
);

const base_url = import.meta.env.PROD ? "/search/worker.js" : "/worker.js";
const scope_url = import.meta.env.PROD
  ? "https://spectra-dev.adma.ai/search/"
  : "http://localhost:5173/search/";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(base_url, { scope: scope_url })
      .then((registration) => {
        console.log(
          "Service Worker registered with scope: ",
          registration.scope
        );
      })
      .catch((error) => {
        console.log("Service Worker registration failed: ", error);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ReactKeycloakProvider
    authClient={keycloak}
    initOptions={{
      onLoad: "check-sso",
      checkLoginIframe: false,
      silentCheckSsoRedirectUri:
        window.location.origin + "/silent-check-sso.html",
    }}
  >
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  </ReactKeycloakProvider>
);
