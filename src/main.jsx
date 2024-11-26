import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const oidcConfig = {
  authority: "https://iam.ideaconsult.net/auth/realms/nano",
  client_id: "idea-ui",
  redirect_uri: window.location.origin + "/search/",
  post_logout_redirect_uri: window.location.origin + "/search/",
  response_type: "code",
  scope: "openid profile email",
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
  const auth = useAuth();

  const token = auth.user?.access_token;

  const base_url = import.meta.env.PROD
    ? "/search/serviceWorker.js"
    : "/serviceWorker.js";

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
  window.location.href = "/search/";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
    <React.StrictMode>
      <Main />
      <RouterProvider router={router} />
    </React.StrictMode>
  </AuthProvider>
);
