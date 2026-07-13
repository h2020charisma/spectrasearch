import { apiUrl } from "../config";

async function useDataSources() {
  const sorcesUrl = apiUrl("db/query/sources");
  const data = await fetch(sorcesUrl);

  return { data };
}

export default useDataSources;
