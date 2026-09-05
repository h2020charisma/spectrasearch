import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import axios from "axios";
import { apiUrl } from "../config";

const axiosInstance = axios.create({
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

const BACKEND_UNREACHABLE =
  "There is a problem connecting to the data backend server. Please wait a few minutes and try again. If the problem persists, please write to <support@ideaconsult.net>";

// Renewals are shared across every hook instance. A page runs up to a dozen of
// these at once, and without this a single expiry would fire a dozen concurrent
// silent renews at the identity provider.
let pendingRenewal = null;

function renewOnce(signinSilent) {
  if (!pendingRenewal) {
    pendingRenewal = Promise.resolve(signinSilent()).finally(() => {
      pendingRenewal = null;
    });
  }
  return pendingRenewal;
}

/** A message the user can act on, preferring what the backend actually said.
 *
 *  The API's 401/403 details distinguish "your session ended" from "this source
 *  needs different permissions", which the generic texts cannot, and it echoes
 *  back only the caller's own input -- never the names of collections the caller
 *  cannot see. React escapes it on render. */
function describe(err, isAuthenticated) {
  if (!axios.isAxiosError(err)) {
    return `An unexpected error occurred: ${err.message}.`;
  }
  if (!err.response) {
    return err.request
      ? "There is a problem connecting to the data backend server. Please check your internet connectivity. If it works, please wait a few minutes and try again. If the problem persists, please write to <support@ideaconsult.net>."
      : `An error occurred: ${err.message}.`;
  }

  const { status, data } = err.response;
  const detail = typeof data?.detail === "string" ? data.detail : null;

  switch (status) {
    case 400:
      return "The request was invalid. Please check the request parameters and try again.";
    case 401:
      return (
        detail ||
        (isAuthenticated
          ? "Your session has ended. Please sign in again."
          : "The requested information requires authorization. Please log in first, or select at least one publicly available data source.")
      );
    case 403:
      return (
        detail ||
        "You are not granted access to some of the requested information. Please click the data sources button and select the desired sources again."
      );
    case 404:
    case 502:
    case 503:
    case 504:
      return BACKEND_UNREACHABLE;
    default:
      return `An unexpected server error occurred (Status: ${status}). Please try again.`;
  }
}

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = useAuth();
  const { isAuthenticated, isLoading } = auth;

  // Latest-value refs, refreshed after every render and read only at the moment
  // a request is issued.
  //
  // The access token deliberately does not drive the fetch. automaticSilentRenew
  // rotates it every few minutes, and while it was a dependency each rotation
  // re-issued every query on the page -- including the multi-collection facet
  // query behind the import report, the heaviest in the app -- and blanked the
  // results while it re-ran. A rotation that actually matters is caught by the
  // 401 retry below instead.
  const tokenRef = useRef(undefined);
  const signinSilentRef = useRef(auth.signinSilent);
  useEffect(() => {
    tokenRef.current = auth.user?.access_token;
    signinSilentRef.current = auth.signinSilent;
  });

  const fetchData = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      setData(null);

      // Authorization is omitted rather than sent empty when there is no token:
      // the backend reads an absent header as anonymous, and anything it cannot
      // parse as a failed authentication.
      const request = (token) =>
        axiosInstance.get(apiUrl(url), {
          signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

      try {
        let response;
        try {
          response = await request(tokenRef.current);
        } catch (err) {
          // A 401 while signed in means the token went stale between renewals,
          // not that this data needs different permissions -- the API rejects an
          // expired token before it looks at which source was asked for, so even
          // a public source fails. Renew once and retry. Once only: a session the
          // identity provider has genuinely ended must surface, not loop.
          const stale =
            axios.isAxiosError(err) &&
            err.response?.status === 401 &&
            isAuthenticated &&
            Boolean(tokenRef.current) &&
            Boolean(signinSilentRef.current);
          if (!stale) throw err;

          const renewed = await renewOnce(signinSilentRef.current);
          const fresh = renewed?.access_token;
          if (!fresh || fresh === tokenRef.current) throw err;
          tokenRef.current = fresh;
          response = await request(fresh);
        }

        if (signal.aborted) return;
        setData(response.data);
      } catch (err) {
        if (signal.aborted || axios.isCancel(err)) return;
        console.error("Request failed:", err?.response?.status ?? "", err.message);
        setError(describe(err, isAuthenticated));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [url, isAuthenticated],
  );

  useEffect(() => {
    if (!url) return undefined;
    // Nothing is fetched until the session has been restored. Firing during the
    // restore sent an anonymous request that any private source answered with
    // 401, then raced a second authenticated request -- and whichever landed
    // last won, so a stale failure could overwrite a good result.
    if (isLoading) return undefined;

    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData, url, isLoading]);

  return { data, loading, error };
}

export default useFetch;
