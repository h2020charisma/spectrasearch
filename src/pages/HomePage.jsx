import { useState } from "react";
import { useLocation } from "react-router-dom";

import SearchComp from "../components/SearchComp/SearchComp";

import Footer from "../components/Footer/Footer";
import H5web from "../components/h5web/h5web";
import Header from "../components/Header/Header";
import ToastComp from "../components/UI/Toast/Toast";

export default function HomePage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const h5webParams = queryParams.get("h5web");
  let [domain, setDomain] = useState(null);

  return (
    <div>
      <ToastComp />
      <Header />

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
    </div>
  );
}
