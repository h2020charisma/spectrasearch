import { useState, useEffect } from "react";
import { useKeycloak } from "@react-keycloak/web";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [auth, setAuth] = useState(false);

  const { keycloak } = useKeycloak();
  const navigate = useNavigate();

  const stored_token = localStorage.getItem("token");
  const kc_token = keycloak.token ? keycloak.token : stored_token;

  const axiosInstance = axios.create({
    baseURL: `${import.meta.env.VITE_BaseURL}`,
    timeout: 1000,
    headers: { "Content-Type": "application/json" },
  });

  axiosInstance.interceptors.request.use(
    function (config) {
      if (kc_token) {
        config.headers.Authorization = `Bearer ${kc_token}`;
        console.log("axios interseption");
      }
      return config;
    },
    function (error) {
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    if (keycloak.authenticated) {
      setAccessToken(keycloak.token);
      setAuth(true);
    }

    if (kc_token) {
      keycloak
        .updateToken(30)
        .then((refreshed) => {
          if (refreshed) {
            console.log(
              "useFetch: Token refreshed and updated in localStorage."
            );
            localStorage.setItem("token", keycloak.token);
          } else {
            console.log("useFetch: Token is still valid.");
          }
        })
        .catch(() => {
          console.error("useFetch: Failed to refresh token.");
        });
      axiosInstance
        .get(url)
        .then((response) => {
          setData(response.data);
        })
        .catch((error) => {
          // navigate("/");
          // keycloak.login();
          console.error("Error fetching data:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [kc_token, url, keycloak]);

  return { data, loading, auth };
}

export default useFetch;
