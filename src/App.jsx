import "./App.css";

import { useLocation } from "react-router-dom";

import SearchComp from "../components/SearchComp/SearchComp";
// import UnderDevelopent from "./../components/UnderDevelopent";
import UnderDevelopent from "../components/UnderDevelopent/UnderDevelopent";
import H5web from "../components/h5web/h5web";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";

function App() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // const domainParams = queryParams.get("domain");
  const h5webParams = queryParams.get("h5web");

  return (
    <>
      <Header />
      <UnderDevelopent />
      <div>
        {h5webParams ? (
          <H5web />
        ) : (
          <div>
            <SearchComp />
            <Footer />
          </div>
        )}
      </div>
    </>
  );
}

export default App;
