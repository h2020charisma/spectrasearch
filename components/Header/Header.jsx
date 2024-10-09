import { useNavigate } from "react-router-dom";

import { useKeycloak } from "@react-keycloak/web";
import { useEffect } from "react";

export default function Header() {
  const { keycloak } = useKeycloak();
  const navigate = useNavigate();

  keycloak.onTokenExpired = () => {
    console.log("Token expired, attempting to refresh...");
  };

  const username = keycloak.tokenParsed?.preferred_username
    ? keycloak.tokenParsed?.preferred_username
    : localStorage.getItem("username");

  const stored_token = localStorage.getItem("token");

  const logoutHandle = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  };
  setInterval(async () => {
    try {
      await keycloak.updateToken(5);
      localStorage.setItem("token", keycloak.token);
      console.log("Refreshed!");
    } catch (error) {
      console.log("Falied to refresh token..", error);
    }
  }, [30000]);

  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <div className="usersInfo">
        <div className="username">
          {keycloak.authenticated || username ? username : ""}
        </div>
        {keycloak.authenticated || stored_token ? (
          <button
            className="shareBtn"
            onClick={() => {
              navigate("/");
              keycloak.logout();
              logoutHandle();
            }}
          >
            Log out
          </button>
        ) : (
          <button
            className="shareBtn"
            onClick={() => {
              navigate("/");
              keycloak.login();
            }}
          >
            Log in
          </button>
        )}
      </div>
    </div>
  );
}
