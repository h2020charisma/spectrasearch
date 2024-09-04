import "@h5web/app/dist/styles.css";

import { App, HsdsProvider } from "@h5web/app";
import { useLocation, useSearchParams, useParams } from "react-router-dom";
import { useState } from "react";

// eslint-disable-next-line react/prop-types
export default function H5web({ domain }) {

  let [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const h5webParams = queryParams.get("h5web");

  const initialPathParams = searchParams.get("initialPath");

  const [hash, useHash] = useState(decodeURIComponent(window.location.hash.substring(1)))


  const initialPath = initialPathParams ? initialPathParams :
    hash ? hash : '/'

  const downloadFile = () => {
    fetch(`${import.meta.env.VITE_BaseURL}download?what=h5&domain=${domain}`)
    .then(resp => resp.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${domain}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
      })
      .catch(() => alert("oh no!"));
}

  return (
    <div>
      <div className="downloadBtn">
        <button
          className="shareBtn"
          onClick={() => downloadFile()}
        >
          Download the file
        </button>
      </div>
      <div >
        <HsdsProvider
          url="https://hsds-kc.ideaconsult.net"
          username="system-public-user"
          password="system-public-user"
          filepath={`${domain ? domain : h5webParams}`}
        >
          <App initialPath={initialPath} />
        </HsdsProvider>
      </div>
    </div>
  );
}
