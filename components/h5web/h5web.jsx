import "@h5web/app/dist/styles.css";

import { App, HsdsProvider } from "@h5web/app";
import { useLocation, useSearchParams } from "react-router-dom";

// eslint-disable-next-line react/prop-types
export default function H5web({ domain }) {

  let [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const h5webParams = queryParams.get("h5web");

  const initialPathParams = searchParams.get("initialPath")


  return (
    <div>
      <div style={{ height: "90vh" }}>
        <HsdsProvider
          url="https://hsds-kc.ideaconsult.net"
          username="system-public-user"
          password="system-public-user"
          filepath={`${domain ? domain : h5webParams}`}
        >
          <App initialPath={initialPathParams ? initialPathParams : '/'} />
        </HsdsProvider>
      </div>
    </div>
  );
}
