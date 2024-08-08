import "@h5web/app/dist/styles.css";

import { App, HsdsProvider } from "@h5web/app";

export default function H5web() {
  return (
    <div>
      <div style={{ height: "90vh" }}>
        <HsdsProvider
          url="https://hsds.adma.ai"
          username="system-public-user"
          password="system-public-user"
          filepath="/TEST/129aac84-3015-4333-af39-9efa544d54f6.nxs"
        >
          <App />
        </HsdsProvider>
      </div>
    </div>
  );
}
