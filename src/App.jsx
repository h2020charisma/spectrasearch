import "./App.css";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { useKeycloak } from "@react-keycloak/web";

import { lazy } from "react";

const H5web = lazy(() => import("../components/h5web/h5web"));

import SearchComp from "../components/SearchComp/SearchComp";

import UnderDevelopent from "../components/UnderDevelopent/UnderDevelopent";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";

function App() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const h5webParams = queryParams.get("h5web");

  let [domain, setDomain] = useState(null);

  const { keycloak } = useKeycloak();

  useEffect(() => {
    if (keycloak.authenticated) {
      localStorage.setItem("refreshToken", keycloak.refreshToken);
      localStorage.setItem("token", keycloak.token);
      localStorage.setItem("username", keycloak.tokenParsed.preferred_username);
    }
  }, [keycloak.authenticated]);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  // keycloak
  //   .updateToken(30)
  //   .then((refreshed) => {
  //     if (refreshed) {
  //       console.log("app: Token refreshed and updated in localStorage.");
  //       localStorage.setItem("token", keycloak.token);
  //     } else {
  //       console.log("app: Token is still valid.");
  //     }
  //   })
  //   .catch(() => {
  //     console.error("app: Failed to refresh token.");
  //   });
  //   }, 10000);

  //   return () => clearInterval(interval);
  // }, []);

  return (
    <>
      <Header />
      <UnderDevelopent />
      <div>
        {h5webParams ? (
          <H5web domain={domain} />
        ) : (
          <div>
            <SearchComp setDomain={setDomain} />
            <Footer />
          </div>
        )}
      </div>
    </>
  );
}

export default App;
