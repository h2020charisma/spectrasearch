import H5web from "../components/h5web/h5web";
import { useLocation } from "react-router-dom";
import Header from "../components/Header/Header";

export default function H5webPage() {
  const location = useLocation();

  let domain = decodeURIComponent(location.pathname.substring(6));

  return (
    <>
      <Header />
      <H5web domain={domain} />;
    </>
  );
}
