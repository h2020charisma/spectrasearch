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
  const stored_token = localStorage.getItem("token");
  // const token = keycloak.token ? keycloak.token : stored_token;

  // if (navigator.serviceWorker.controller) {
  //   console.log("post message", navigator.serviceWorker);

  //   navigator.serviceWorker.controller.postMessage({
  //     type: "SET_TOKEN",
  //     token: token,
  //   });
  // }
  useEffect(() => {
    if (keycloak.authenticated) {
      localStorage.setItem("refreshToken", keycloak.refreshToken);
      localStorage.setItem("token", keycloak.token);
      localStorage.setItem("username", keycloak.tokenParsed.preferred_username);
    }
  }, [keycloak.authenticated]);

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
