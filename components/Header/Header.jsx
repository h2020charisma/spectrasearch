// import logo from "./../../public/charisma_logo.png";
import { useNavigate } from "react-router-dom";

import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";

export default function Header() {
  const { keycloak } = useKeycloak()
  const navigate = useNavigate();

  const refreshToken = async () => {
    try {
      await keycloak.updateToken(30);
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }
  const username = localStorage.getItem("username");
  const token = keycloak.token;
  const storedToken = localStorage.getItem("token");

  // useEffect(() => {
  //   if(!token || !storedToken) {
  //     keycloak.login()
  //   }
  //    }, 
  //   [keycloak.token])

  if (keycloak.authenticated) {
    localStorage.setItem("refreshToken", keycloak.refreshToken)
    localStorage.setItem("token", keycloak.token)
    const userName = keycloak.tokenParsed.preferred_username;
    localStorage.setItem("username", userName)
  }


  const logoutHandle = () => {
    localStorage.removeItem("username")
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    setIsAuthenticated(false)
  }

  

  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <div className="usersInfo">
        <div className="username">{username}</div>
        {keycloak.authenticated ?
          <button className="shareBtn" onClick={() => {
            keycloak.logout()
            logoutHandle()
          }}>
            Log out
          </button> :
          <button className="shareBtn" onClick={() => keycloak.login()}>
            Log in
          </button>
        }
      </div>
    </div>
  );
}
