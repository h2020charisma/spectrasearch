import { FaGlobe } from "react-icons/fa";
import { IoMdMail } from "react-icons/io";

export default function Footer() {
  return (
    <footer className="footer">
      <p className="acknowledgements">
        🇪🇺 This project has received funding from the European Union’s Horizon 2020 research and innovation program under grant agreements{' '}
        <a href="https://cordis.europa.eu/project/id/952921">952921</a>{' '}
        and{' '}
        <a href="https://cordis.europa.eu/project/id/964766">964766</a>
        .
      </p>
      <div>
        <p className="company">IDEAconsult Ltd.</p>
        <a
          className="contactsLink"
          href="https://ideaconsult.net/"
          target="_blank"
        >
          <div className="website">
            <FaGlobe />
            <span style={{ display: "block", marginTop: "-4px" }}>
              ideaconsult.net
            </span>
          </div>
        </a>
        <a className="contactsLink" href="mailto:support@ideaconsult.net">
          <div className="website">
            <IoMdMail />
            <span style={{ display: "block", marginTop: "-4px" }}>
              support@ideaconsult.net
            </span>
          </div>
        </a>
        {/* <p>email: support@ideaconsult.net</p> */}
      </div>
    </footer>
  );
}
