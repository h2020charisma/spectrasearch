import "./App.css";

import { useLocation } from "react-router-dom";

import SearchComp from "../components/SearchComp/SearchComp";
import H5web from "../components/h5web/h5web";
import Footer from "../components/Footer/Footer";

function App() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // const domainParams = queryParams.get("domain");
  const h5webParams = queryParams.get("h5web");
  console.log(h5webParams);
  return (
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
  );
}

export default App;
