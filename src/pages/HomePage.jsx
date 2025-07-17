import { useState } from "react";
import { useLocation } from "react-router-dom";

import SearchComp from "../components/SearchComp/SearchComp";

import UnderDevelopent from "../components/UnderDevelopent/UnderDevelopent";
import H5web from "../components/h5web/h5web";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import ToastComp from "../components/UI/Toast/Toast";

export default function HomePage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const h5webParams = queryParams.get("h5web");
  let [domain, setDomain] = useState(null);

  return (
    <main>
      <ToastComp />
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
    </main>
  );
}
