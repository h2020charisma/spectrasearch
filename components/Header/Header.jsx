// import logo from "./../../public/charisma_logo.png";
import { Link, useNavigate } from "react-router-dom";

import { useKeycloak } from "@react-keycloak/web";
import { useEffect, useState } from "react";

export default function Header() {
  const { keycloak } = useKeycloak()
  const navigate = useNavigate();

  const [authenticated, setAuthenticated] = useState(false);

  
  

  if (keycloak.authenticated) {
    const userName = keycloak.tokenParsed.preferred_username;
    localStorage.setItem("username", userName)
  }

  const [username, setUsername] = useState(() => localStorage.getItem("username"))

  useEffect(() => {
    if (keycloak.authenticated) {
      const userName = keycloak.tokenParsed.preferred_username;
      setUsername(userName)
      localStorage.setItem("token", keycloak.token)
      console.log("header", keycloak.token);
      
    }
  }, [keycloak.authenticated])


  const logoutHandle = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
  }

  const stored_token = localStorage.getItem("token")

  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <div className="usersInfo">
        <div className="username">{username}</div>
        {stored_token ?
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
