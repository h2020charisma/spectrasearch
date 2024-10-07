import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import _kc from "../utils/keycloak.jsx";
import { useKeycloak } from "@react-keycloak/web";

const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: App,
    },
  ],
  { basename: "/search" }
);

const Main = () => {
  const { keycloak } = useKeycloak();

  const stored_token = localStorage.getItem("token");
  const token = keycloak.token ? keycloak.token : stored_token;

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

  if (navigator.serviceWorker.controller) {
    console.log("post message", navigator.serviceWorker);

    navigator.serviceWorker.controller.postMessage({
      type: "SET_TOKEN",
      token: token,
    });
  }

  return <></>;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <ReactKeycloakProvider
    authClient={_kc}
    initOptions={{
      onLoad: "check-sso",
      checkLoginIframe: false,
      silentCheckSsoRedirectUri:
        window.location.origin + "/silent-check-sso.html",
    }}
  >
    <React.StrictMode>
      <Main />
      <RouterProvider router={router} />
    </React.StrictMode>
  </ReactKeycloakProvider>
);
