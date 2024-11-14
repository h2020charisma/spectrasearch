// import logo from "./../../public/charisma_logo.png";
import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <Link
        to="https://zenodo.org/records/14163315"
        target="_blank"
        rel="noopener noreferrer"
      >
        <button className="shareBtn">Help</button>
      </Link>
    </div>
  );
}
