import React, { useEffect, useLayoutEffect } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import ReactDOM from "react-dom/client";
import HitPage from "./pages/HitPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import H5webPage from "./pages/H5webPage.jsx";
import NexusOverviewPage from "./pages/NexusOverviewPage.jsx";
import PredictionsPage from "./pages/PredictionsPage.jsx";
import CollectionPage from "./pages/CollectionPage.jsx";
import CallbackPage from "./pages/CallbackPage.jsx";
import SubstancePage from "./pages/SubstancePage.jsx";
import ImportsPage from "./pages/ImportsPage.jsx";
import { loadRuntimeConfig, getRuntimeConfig } from "./config.js";

import "./index.css";

let serviceWorkerAuth = {
  token: "",
  apiOrigin: "",
};

function postServiceWorkerAuth(worker) {
  worker?.postMessage({
    type: "TOKEN",
    ...serviceWorkerAuth,
  });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "TOKEN_REQUEST") return;

    const replyPort = event.ports?.[0];
    if (!replyPort) return;

    if (event.source !== navigator.serviceWorker.controller) {
      replyPort.close();
      return;
    }

    replyPort.postMessage({
      type: "TOKEN_RESPONSE",
      ...serviceWorkerAuth,
    });
    replyPort.close();
  });
}

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
      path: "/nexus-overview/:domain/*",
      Component: NexusOverviewPage,
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
      path: "/imports",
      Component: ImportsPage,
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

  const apiOrigin = (() => {
    try {
      return new URL(getRuntimeConfig().apiBaseUrl).origin;
    } catch {
      return "";
    }
  })();

  useLayoutEffect(() => {
    serviceWorkerAuth = {
      token: typeof token === "string" ? token : "",
      apiOrigin,
    };
    postServiceWorkerAuth(navigator.serviceWorker?.controller);
  }, [token, apiOrigin]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    let cancelled = false;
    const handleControllerChange = () => {
      postServiceWorkerAuth(navigator.serviceWorker.controller);
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    navigator.serviceWorker
      .register("/search/serviceWorker.js", { scope: "/search/" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        if (!cancelled) {
          postServiceWorkerAuth(
            navigator.serviceWorker.controller || registration.active,
          );
        }
      })
      .catch((error) => {
        console.log(`Registration failed with ${error}`);
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

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
