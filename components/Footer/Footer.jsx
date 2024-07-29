import { FaGlobe } from "react-icons/fa";
import { IoMdMail } from "react-icons/io";

export default function Footer() {
  return (
    <footer className="footer">
      <p className="acknowledgements">
        This project has received funding from the European Union's Horizon 2020
        research and innovation programme under grant agreement 952921 CHARISMA
      </p>
      <div>
        <p className="company">Ideaconsult Ltd.</p>
        <a
          className="contactsLink"
          href="https://www.ideaconsult.net/"
          target="_blank"
        >
          <div className="website">
            <FaGlobe />
            <span style={{ display: "block", marginTop: "-4px" }}>
              www.ideaconsult.net
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
