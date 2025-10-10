import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      const token = auth.user?.access_token;
      const exp = auth.user?.expires_at;
      const now = Math.floor(Date.now() / 1000);

      if (token && exp && now >= exp) {
        console.log("Token expired. Redirecting to login...");
        auth.signinRedirect({
          state: {
            returnUrl: window.location.href,
          },
        });
      }
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [auth]);

  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <div className="helpUserMenu">
        {auth.isAuthenticated ? (
          <div className="userInfo">
            <p className="userName">{auth.user?.profile.name}</p>
            <button
              className="shareBtn"
              style={{ marginLeft: "18px" }}
              onClick={() => {
                sessionStorage.removeItem("dataSources");

                auth.signoutRedirect();
              }}
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="userInfo">
            <p className="loginWelcom">
              To access non-public sources, please log in.
            </p>
            <button
              className="shareBtn"
              style={{ marginLeft: "18px" }}
              onClick={() => {
                sessionStorage.removeItem("dataSources");
                auth.signinRedirect();
              }}
            >
              Log in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
