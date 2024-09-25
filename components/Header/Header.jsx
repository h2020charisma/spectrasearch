import { useNavigate } from "react-router-dom";

import { useKeycloak } from "@react-keycloak/web";

export default function Header() {
  const { keycloak } = useKeycloak()
  const navigate = useNavigate();

  
  if (keycloak.authenticated) {
    localStorage.setItem("refreshToken", keycloak.refreshToken)
    localStorage.setItem("token", keycloak.token)
    localStorage.setItem("username", keycloak.tokenParsed.preferred_username)
  }
  
  const username = keycloak.tokenParsed?.preferred_username 
      ? keycloak.tokenParsed?.preferred_username 
      : localStorage.getItem("username");

  const logoutHandle = () => {
    localStorage.removeItem("username")
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
  }
  


  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <div className="usersInfo">
        <div className="username">{username}</div>
        {keycloak.authenticated || username ?
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
