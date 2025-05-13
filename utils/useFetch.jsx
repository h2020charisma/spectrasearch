import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import axios from "axios";

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = useAuth();

  const kc_token = auth?.user?.access_token;

  const axiosInstance = axios.create({
    baseURL: `${import.meta.env.VITE_BaseURL}`,
    timeout: 1000,
    headers: { "Content-Type": "application/json" },
  });

  axiosInstance.interceptors.request.use(
    function (config) {
      if (kc_token) {
        config.headers.Authorization = `Bearer ${kc_token}`;
      }
      return config;
    },
    function (error) {
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    if (kc_token) {
      axiosInstance
        .get(url)
        .then((response) => {
          setData(response.data);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [axiosInstance, kc_token, url]);

  return { data, loading };
}

export default useFetch;
