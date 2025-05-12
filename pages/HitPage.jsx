import { useLocation } from "react-router-dom";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import Chart from "../components/Chart/Chart";
import BackArrow from "../components/Icons/BackArrow";
import { useNavigate } from "react-router-dom";

import { useImageStore } from "../store/store";

export default function HitPage() {
  const location = useLocation();
  const navigate = useNavigate();

  let imageSelected = location.pathname + location.hash;

  const imgSelected = useImageStore((state) => state.imageSelected);

  let isNexusFile = false;

  return (
    <div>
      <Header />

      <div style={{ padding: "20px" }}>
        <div className="backArrow" onClick={() => navigate("/")}>
          <BackArrow />
          <p>Back to Home page</p>
        </div>

        <Chart
          imageSelected={imgSelected ? imgSelected : imageSelected}
          setDomain=""
          isNexusFile={isNexusFile}
        />
      </div>
      <Footer />
    </div>
  );
}
