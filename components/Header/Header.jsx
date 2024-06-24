import logo from "./../../public/charisma_logo.png";

export default function Header() {
  return (
    <div className="logo">
      <div id="headerWrap">
        <img src={logo} alt="logo" height={36} />
      </div>
      <h1>Raman spectra search</h1>
    </div>
  );
}
