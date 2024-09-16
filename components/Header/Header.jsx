// import logo from "./../../public/charisma_logo.png";
import { Link, useNavigate } from "react-router-dom";

import doLogin from "../../utils/auth";

export default function Header() {
  const navigate = useNavigate();
  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <button onClick={() => doLogin()}>Log in</button>
    </div>
  );
}
