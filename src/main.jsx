import React, { useEffect } from "react";
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
  { basename: "/search/" }
);

const Main = () => {
  const { keycloak } = useKeycloak();

  const stored_token = localStorage.getItem("token");
  const token = keycloak.token ? keycloak.token : stored_token;

  const base_url = import.meta.env.PROD
    ? "/search/serviceWorker.js"
    : "/serviceWorker.js";
  const scope_url = import.meta.env.PROD
    ? "https://spectra-dev.adma.ai/search/"
    : "http://localhost:5173/search/";

  const registerServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(base_url, {
          scope: "./",
        });
        console.log("scope", registration.scope);

        await registration.active.postMessage({
          type: "TOKEN",
          token: token,
        });
      } catch (error) {
        console.log(`Registration failed with ${error}`);
      }
    }
  };

  useEffect(() => {
    registerServiceWorker();
  }, [token]);

  // if ("serviceWorker" in navigator) {
  //   window.addEventListener("load", () => {
  //     navigator.serviceWorker
  //       .register(base_url)
  //       .then((registration) => {
  //         console.log(
  //           "Service Worker registered with scope: ",
  //           registration.scope
  //         );
  //         if (token && registration.active) {
  //           console.log("registration.active");

  //           registration.active.postMessage({
  //             type: "SET_TOKEN",
  //             token: token,
  //           });
  //         }
  //       })
  //       .catch((error) => {
  //         console.log("ServiceWorker registration failed: ", error);
  //       });
  //   });
  // }

  // if (navigator.serviceWorker.controller) {
  //   console.log("post message", navigator);

  //   navigator.serviceWorker.controller.postMessage({
  //     type: "SET_TOKEN",
  //     token: token,
  //   });
  // } else {
  //   console.log("no message", navigator.serviceWorker);
  // }

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
