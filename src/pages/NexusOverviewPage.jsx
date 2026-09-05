import { useMemo } from "react";
import { useAuth } from "react-oidc-context";
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import Header from "../components/Header/Header";
import BackArrow from "../components/Icons/BackArrow";
import NexusOverview from "../components/NexusOverview/NexusOverview";

// The NeXus corpus is served from the same HSDS instance the h5web viewer
// reads (see src/components/h5web/h5web.jsx). Kept here in the host page, not
// the reusable component, along with anonymous-access identity.
const HSDS_URL = "https://hsds-kc.ideaconsult.net";
const PUBLIC_USER = "system-public-user";
const ROUTE_PREFIX = "/nexus-overview/";

export default function NexusOverviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();

  const domain = decodeURIComponent(
    location.pathname.startsWith(ROUTE_PREFIX)
      ? location.pathname.slice(ROUTE_PREFIX.length)
      : location.pathname.replace(/^\/+/, ""),
  );

  // Reached from search results and from the import report alike, so return
  // where the visitor came from. location.key is "default" only for the first
  // history entry -- a pasted link, with nothing behind it to go back to.
  const hasHistory = location.key !== "default";

  const token = auth.user?.access_token;
  const authHeader = useMemo(
    () => (token ? `Bearer ${token}` : `Basic ${btoa(`${PUBLIC_USER}:${PUBLIC_USER}`)}`),
    [token],
  );

  // Result links carry the same `#/<entry>/<path>` fragment h5web uses as its
  // initial path (e.g. `#/PA6.6 <1um_MNTM-.../Processed_Data/S0B_1`). When
  // present, scope the overview to that one NXentry and use the rest of the
  // path as the plot hint.
  const [focusEntry, focusPath] = useMemo(() => {
    const raw = decodeURIComponent((location.hash || "").replace(/^#\/?/, ""));
    if (!raw) return [null, null];
    const segs = raw.split("/").filter(Boolean);
    return [segs[0] || null, segs.slice(1)];
  }, [location.hash]);

  if (auth.isLoading) {
    return (
      <>
        <Header />
        <div role="status" style={{ padding: 20 }}>
          Loading viewer…
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={{ padding: "12px 20px" }}>
        <div
          className="backArrow"
          onClick={() => (hasHistory ? navigate(-1) : navigate("/"))}
        >
          <BackArrow />
          <p>{hasHistory ? "Back" : "Back to Home page"}</p>
        </div>
      </div>
      <ErrorBoundary
        fallback={
          <div style={{ padding: 20 }}>Failed to load the NeXus overview.</div>
        }
      >
        <NexusOverview
          domain={domain}
          hsdsUrl={HSDS_URL}
          authHeader={authHeader}
          focusEntry={focusEntry}
          focusPath={focusPath}
          onClearFocus={() => navigate(location.pathname + location.search)}
        />
      </ErrorBoundary>
    </>
  );
}
