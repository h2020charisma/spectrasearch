import "@h5web/app/dist/styles.css";

import { App, HsdsProvider } from "@h5web/app";

// eslint-disable-next-line react/prop-types
export default function H5web({ domain, h5webParams }) {
  console.log("h5web", domain);
  console.log("h5webParams", h5webParams);

  return (
    <div>
      <div style={{ height: "90vh" }}>
        <HsdsProvider
          url="https://hsds-kc.ideaconsult.net"
          username="system-public-user"
          password="system-public-user"
          filepath={`${domain ? domain : h5webParams}`}
        >
          <App initialPath="/"/>
        </HsdsProvider>
      </div>
    </div>
  );
}
