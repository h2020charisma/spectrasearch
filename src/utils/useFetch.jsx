import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import axios from "axios";

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = useAuth();

  const kc_token = auth?.user?.access_token;

  const axiosInstance = axios.create({
    baseURL: `${import.meta.env.VITE_BaseURL}`,
    timeout: 10000,
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
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    axiosInstance
      .get(url, { signal: controller.signal })
      .then((response) => {
        if (!response.data) {
          throw new Error("No data found");
        }
        if (response.status === 401) {
          setError("Please log in again.");
          throw new Error("Unauthorized access - please log in again.");
        }
        if (response.data.error) {
          throw new Error(`API error: ${response.data.error}`);
        }
        // if (response.status !== 200) {
        //   throw new Error(`HTTP error! status: ${response.status}`);
        // }

        setData(response.data);
        console.log("Data fetched successfully.");
      })
      .catch((error) => {
        if (axios.isCancel(error) || error.name === "CanceledError") {
          console.log("Request was cancelled");
          return;
        }
        if (error.response.status === 401) {
          setError("Please log in again.");
          return;
        }
        if (error.response.status === 403) {
          setError("Check your sources.");
          return;
        }

        setError("Please log in." || "Error fetching data");
        console.error("Error fetching data:", error);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort(); // Cancel request if component unmounts or deps change
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kc_token, url]);

  return { data, loading, error };
}

export default useFetch;
