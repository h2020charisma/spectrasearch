import "@h5web/app/dist/styles.css";

import { App, HsdsProvider } from "@h5web/app";
import { useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

// eslint-disable-next-line react/prop-types
export default function H5web({ domain }) {
  let [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const h5webParams = queryParams.get("h5web");

  const initialPathParams = searchParams.get("initialPath");

  const [hash, useHash] = useState(
    decodeURIComponent(window.location.hash.substring(1))
  );

  const initialPath = initialPathParams ? initialPathParams : hash ? hash : "/";

  const downloadFile = () => {
    fetch(
      `${import.meta.env.VITE_BaseURL}db/download?what=h5&domain=${
        domain ? domain : h5webParams
      }`
    )
      .then((resp) => resp.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${domain ? domain : h5webParams}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => alert("Failed to download the file!"));
  };

  return (
    <div>
      <div className="downloadBtn">
        <button className="shareBtn" onClick={() => downloadFile()}>
          Download the file
        </button>
      </div>
      <div style={{ height: "100vh" }}>
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
