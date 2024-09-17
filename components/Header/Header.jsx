// import logo from "./../../public/charisma_logo.png";
import { useNavigate } from "react-router-dom";

import { useKeycloak } from "@react-keycloak/web";
import { useEffect } from "react";

export default function Header() {
  const { keycloak } = useKeycloak()
  const navigate = useNavigate();


  useEffect(() => {
    if (keycloak.authenticated) {
      localStorage.setItem("token", keycloak.token)
    }
  }, [keycloak.authenticated])

  const logoutHandle = () => localStorage.setItem("token", "")

  const stored_token = localStorage.getItem("token")
  
  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
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
  );
}
