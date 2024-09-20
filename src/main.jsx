import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ReactKeycloakProvider } from '@react-keycloak/web'
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
  { basename: "/search/" }
);

ReactDOM.createRoot(document.getElementById("root")).render(
 <ReactKeycloakProvider authClient={keycloak}
    initOptions={{
      onLoad: 'check-sso',
      checkLoginIframe: false,
      // Optionally add automatic silent refresh
      silentCheckSsoRedirectUri:
        window.location.origin + '/silent-check-sso.html',
    }}
  >
    <RouterProvider router={router} />
  </ReactKeycloakProvider>

);
