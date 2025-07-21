import { useState, useEffect, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_BaseURL}`,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = useAuth();
  const kc_token = auth?.user?.access_token;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);

    const controller = new AbortController();

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

    try {
      const response = await axiosInstance.get(url, {
        signal: controller.signal,
        headers: {
          Authorization: kc_token ? `Bearer ${kc_token}` : "",
        },
      });
      setData(response.data);
      console.log("Data fetched successfully.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          switch (err.response.status) {
            case 401:
              setError(
                "The requested information requires authorization. Please log in first, or select at least one publicly available data source."
              );
              console.error("Unauthorized access:", err.message);

              break;
            case 403:
              setError(
                "You are not granted access to some of the requested information. Please click the data sources button and select the desired sources again."
              );
              console.error("Forbidden access:", err.message);
              break;
            case 404:
            case 502:
            case 503:
            case 504:
              setError(
                "There is a problem connecting to the data backend server. Please wait a few minutes and try again. If the problem persists, please write to <support@ideaconsult.net>"
              );
              console.error("Server/Resource issue:", err.message);
              break;
            default:
              setError(
                `An unexpected server error occurred (Status: ${err.response.status}). Please try again.`
              );
              console.error(
                "Unhandled HTTP error:",
                err.response.status,
                err.response.data
              );
              break;
          }
        } else if (err.request) {
          setError(
            "There is a problem connecting to the data backend server. Please check your internet connectivity. If it works, please wait a few minutes and try again. If the problem persists, please write to <support@ideaconsult.net>."
          );
          console.error("Network Error: No response received.", err.message);
        } else {
          setError(`An error occurred: ${err.message}.`);
          console.error("Axios request setup error:", err.message);
        }
      } else {
        setError(`An unexpected error occurred: ${err.message}.`);
        console.error("Non-Axios error:", err);
      }
    } finally {
      setLoading(false);
    }

    return () => {
      controller.abort();
    };
  }, [url, kc_token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}

export default useFetch;
