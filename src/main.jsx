import React, { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { ReactKeycloakProvider } from "@react-keycloak/web";

import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import _kc from "../utils/keycloak.jsx";
import { useKeycloak } from "@react-keycloak/web";

const oidcConfig = {
  authority: "https://iam.ideaconsult.net/auth",
  client_id: "idea-ui",
  client_secret: "idea-ui",
  redirect_uri: window.location.origin,
  response_type: "code", // or 'token' for implicit flow
  scope: "openid profile email", // Adjust according to your needs
  post_logout_redirect_uri: window.location.origin,
};

const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: App,
    },
  ],
  { basename: "/search/" }
);

const Main = () => {
  const { keycloak } = useKeycloak();

  const stored_token = localStorage.getItem("token");
  const token = keycloak.token ? keycloak.token : stored_token;

  const base_url = import.meta.env.PROD
    ? "/search/serviceWorker.js"
    : "/serviceWorker.js";

  const registerServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(base_url, {
          scope: "/search/",
        });

        await registration.active.postMessage({
          type: "TOKEN",
          token: token,
        });
      } catch (error) {
        console.log(`Registration failed with ${error}`);
      }
    }
  };

  registerServiceWorker();

  useEffect(() => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "TOKEN",
        token: token,
      });
    }
  }, [token]);
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
    <AuthProvider {...oidcConfig}>
      <React.StrictMode>
        <Main />
        <RouterProvider router={router} />
      </React.StrictMode>
    </AuthProvider>
  </ReactKeycloakProvider>
);
