// import logo from "./../../public/charisma_logo.png";
import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  return (
    <div className="logo">
      <h1 onClick={() => navigate("/")}>Raman spectra search</h1>
      <Link
        to="https://docs.google.com/presentation/d/13oULefmyNbXaNhhmvrEQIrZaQ9DSCqBHNc-Wm2jRDP0/edit#slide=id.p"
        target="_blank"
        rel="noopener noreferrer"
      >
        <button className="shareBtn">Help</button>
      </Link>
    </div>
  );
}
