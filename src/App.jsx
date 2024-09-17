import "./App.css";
import { useState } from "react";
import { useLocation } from "react-router-dom";

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
