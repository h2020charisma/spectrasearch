import { useAuth } from "react-oidc-context";
import { useSessionStorage } from "./useSessionStorage";

export function useQueryStringSourcesParams() {
  const auth = useAuth();

  const dataSourcesString = `${
    auth.isAuthenticated ? "protectedDataSources" : "dataSources"
  }`;

  const [sources] = useSessionStorage("dataSources", []);
  const sourcesParams = new URLSearchParams();

  if (sources?.length > 0) {
    sources.forEach((source) => {
      if (source?.name) {
        sourcesParams.append("data_source", source.name.toLowerCase());
      }
    });
  }
  const querySourcesString = sourcesParams.toString().replace(/\+/g, "%20");

  return { querySourcesString };
}
