import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <div className="helpUserMenu">
        {/* <Link
          to="https://zenodo.org/records/14163315"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="shareBtn">Help</button>
        </Link> */}
        {auth.isAuthenticated ? (
          <div className="userInfo">
            <p className="userName">{auth.user?.profile.name}</p>
            <button
              className="shareBtn"
              style={{ marginLeft: "18px" }}
              onClick={() => void auth.removeUser()}
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            className="shareBtn"
            style={{ marginLeft: "18px" }}
            onClick={() => void auth.signinRedirect()}
          >
            Log in
          </button>
        )}
      </div>
    </div>
  );
}
