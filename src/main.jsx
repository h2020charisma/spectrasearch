import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import ReactDOM from "react-dom/client";
import HitPage from "./pages/HitPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import H5webPage from "./pages/H5webPage.jsx";
import PredictionsPage from "./pages/PredictionsPage.jsx";
import CollectionPage from "./pages/CollectionPage.jsx";
import CallbackPage from "./pages/CallbackPage.jsx";
import SubstancePage from "./pages/SubstancePage.jsx";
import { loadRuntimeConfig } from "./config.js";

import "./index.css";

const oidcConfig = {
  authority: "https://iam.ideaconsult.net/auth/realms/nano",
  client_id: "idea-ui",
  redirect_uri: window.location.origin + "/search/",
  automaticSilentRenew: true,
  post_logout_redirect_uri: window.location.origin + "/search/",
  response_type: "code",
  scope: "openid profile email",
  loadUserInfo: true,
};

const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: HomePage,
    },
    {
      path: "/h5web/:domain/*",
      Component: H5webPage,
    },
    {
      path: "/predictions",
      Component: PredictionsPage,
    },
    {
      path: "/predictions/:id/*",
      Component: PredictionsPage,
    },
    {
      path: "/substance",
      Component: SubstancePage,
    },
    {
      path: "/collection",
      Component: CollectionPage,
    },
    {
      path: "/hits/:hitId/*",
      Component: HitPage,
    },
    {
      path: "/callback",
      Component: CallbackPage,
    },
  ],
  { basename: "/search/" }
);

export const Main = () => {
  const auth = useAuth();

  const token = auth.user?.access_token;

  const registerServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          "/search/serviceWorker.js",
          {
            scope: "/search/",
          }
        );

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

function onSigninCallback() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      <React.StrictMode>
        <Main />
        <RouterProvider router={router} />
      </React.StrictMode>
    </AuthProvider>
  );
}

function renderConfigError(error) {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Configuration error</h1>
      <p>{error.message}</p>
    </div>
  );
}

loadRuntimeConfig().then(renderApp).catch(renderConfigError);
