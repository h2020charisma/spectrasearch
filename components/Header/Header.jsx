// import logo from "./../../public/charisma_logo.png";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  return (
    <div className="logo">
      {/* <div id="headerWrap">
        <img src={logo} alt="logo" height={36} />
      </div> */}
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
    </div>
  );
}
