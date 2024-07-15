import { useState } from "react";
import { motion } from "framer-motion";
import { useMeasure } from "@uidotdev/usehooks";
import ArrowOpen from "../Icons/Arrow";
import { IconContext } from "react-icons";

import { MdFileUpload } from "react-icons/md";
import { PiEyedropperFill, PiWaveSineBold } from "react-icons/pi";
import { AiFillDatabase, AiFillTool } from "react-icons/ai";
import { TbZoomCodeFilled } from "react-icons/tb";
import { SiPowerpages } from "react-icons/si";
import { FaChartBar } from "react-icons/fa";

// eslint-disable-next-line react/prop-types
export default function Expander({ children, title, status }) {
  const [open, setOpen] = useState(status);
  const [ref, { height }] = useMeasure();

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "0.8rem",
        borderRadius: "6px",
        margin: "0 0 0.5rem 0",
        overflow: "hidden",
        backgroundColor: "#f8fcff",
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <p
          style={{
            margin: "0",
            cursor: "pointer",
            fontWeight: "700",
            userSelect: "none",
          }}
        >
          <IconContext.Provider value={{ size: "1.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {title == "Search by Spectrum File" && <MdFileUpload />}
              {title == "Search by Sample" && <PiEyedropperFill />}
              {title == "Search by Data provider" && <AiFillDatabase />}
              {title == "Search by Investigation" && <TbZoomCodeFilled />}
              {title == "Search by Instrument" && <AiFillTool />}
              {title == "Search by Wavelenth" && <PiWaveSineBold />}
              {title == "Pages" && <SiPowerpages />}
              {title == "Select Spectrum" && <FaChartBar />}
              {title}
            </div>
          </IconContext.Provider>
        </p>

        <ArrowOpen open={open} />
      </div>
      <motion.div animate={{ height }}>
        <div ref={ref}>
          {open && (
            <div>
              <hr
                style={{
                  border: "1px solid #e7e7e7",
                  marginTop: "1rem",
                }}
              />
              {children}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
