import { useNavigate } from "react-router-dom";

import { useKeycloak } from "@react-keycloak/web";

export default function Header() {
  const { keycloak } = useKeycloak();
  const navigate = useNavigate();

  if (keycloak.authenticated) {
    localStorage.setItem("refreshToken", keycloak.refreshToken);
    localStorage.setItem("token", keycloak.token);
    localStorage.setItem("username", keycloak.tokenParsed.preferred_username);
  }

  // console.log("HEADER", keycloak.authenticated);

  const username = keycloak.tokenParsed?.preferred_username
    ? keycloak.tokenParsed?.preferred_username
    : localStorage.getItem("username");

  const logoutHandle = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  };
  setInterval(async () => {
    try {
      await keycloak.updateToken(30);
      console.log("Refreshed!");
    } catch (error) {
      console.log("Falied to refresh token..", error);
    }
  }, [30000]);

  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <div className="usersInfo">
        <div className="username">{keycloak.authenticated && username}</div>
        {keycloak.authenticated ? (
          <button
            className="shareBtn"
            onClick={() => {
              keycloak.logout();
              logoutHandle();
            }}
          >
            Log out
          </button>
        ) : (
          <button className="shareBtn" onClick={() => keycloak.login()}>
            Log in
          </button>
        )}
      </div>
    </div>
  );
}
