// import { useState, useEffect, useCallback } from "react";
// import { useAuth } from "react-oidc-context";
import useFetch from "./useFetch";

async function useDataSources() {
  const sorcesUrl = `${import.meta.env.VITE_BaseURL}db/query/sources`;
  const data = await fetch(sorcesUrl);

  return { data };
}

export default useDataSources;
