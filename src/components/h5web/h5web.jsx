import "@h5web/app/dist/styles.css";
import { App, HsdsProvider, createBasicFetcher } from "@h5web/app";
import { useState, useMemo } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useQueryStringSourcesParams } from "../../utils/useQueryStringSourcesParams";
import BackArrow from "../Icons/BackArrow";

// eslint-disable-next-line react/prop-types
export default function H5web({ domain }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { querySourcesString } = useQueryStringSourcesParams();

  const queryParams = new URLSearchParams(location.search);
  const h5webParams = queryParams.get("h5web");
  const initialPathParams = searchParams.get("initialPath");
  const [hash] = useState(decodeURIComponent(window.location.hash.substring(1)));

  // Dynamic fetcher: headers are read each time a request is made

  const fetcher = useMemo(() => {
    if (auth?.user?.access_token) {
      // Logged-in user
      return createBasicFetcher({
        headers: { Authorization: 'Bearer ' + auth.user.access_token },
      });
    } else {
      // Public access using basic auth
      const username = 'system-public-user';
      const password = 'system-public-user';
      const basic = btoa(`${username}:${password}`);
      return createBasicFetcher({
        headers: { Authorization: `Basic ${basic}` },
      });
    }
  }, [auth?.user?.access_token]);

  const initialPath = initialPathParams || hash || "/";

  const downloadFile = () => {
    const token = auth?.user?.access_token;

    fetch(
      `${import.meta.env.VITE_BaseURL}db/download?what=h5&domain=${
        domain || h5webParams
      }&${querySourcesString}`,
      {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      }
    )
      .then((resp) => resp.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${domain || h5webParams}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => alert("Failed to download the file!"));
  };

  return (
    <div>
      <div className="downloadBtn">
        <div className="backArrow" onClick={() => navigate("/")}>
          <BackArrow />
          <p>Back to Home page</p>
        </div>
        <button className="shareBtn" onClick={downloadFile}>
          Download the file
        </button>
      </div>
      <div style={{ height: "100vh" }}>
        <HsdsProvider
          url="https://hsds-kc.ideaconsult.net"
          fetcher={fetcher}
          username="system-public-user"
          password="system-public-user"
          filepath={`${domain || h5webParams}`}
        >
          <App initialPath={initialPath} />
        </HsdsProvider>
      </div>
    </div>
  );
}
