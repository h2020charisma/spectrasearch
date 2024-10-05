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

const stored_token = localStorage.getItem("token");
const token = keycloak.token ? keycloak.token : stored_token;

const base_url = import.meta.env.PROD ? "/search/worker.js" : "/worker.js";

console.log("base url", base_url);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(base_url)
      .then((registration) => {
        console.log(
          "Service Worker registered with scope: ",
          registration.scope
        );
        if (token && registration.active) {
          registration.active.postMessage({
            type: "SET_TOKEN",
            token: token,
          });
        }
      })
      .catch((error) => {
        console.log("ServiceWorker registration failed: ", error);
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
