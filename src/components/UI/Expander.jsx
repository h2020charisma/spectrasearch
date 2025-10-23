/* eslint-disable react/prop-types */
import { useMeasure } from "@uidotdev/usehooks";
import { motion } from "framer-motion";
import { useState } from "react";
import { IconContext } from "react-icons";
import ArrowOpen from "../Icons/Arrow";

import { AiFillDatabase, AiFillTool } from "react-icons/ai";
import { FaChartBar } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";
import { MdFileUpload } from "react-icons/md";
import { PiEyedropperFill, PiWaveSineBold } from "react-icons/pi";
import { FaSignsPost } from "react-icons/fa6";
import { TbZoomCodeFilled } from "react-icons/tb";

import GridViewIcon from "../Icons/GridViewIcon";
import TableViewIcon from "../Icons/TableViewIcon";

import { useStore } from "../../store/store";
import Notification from "./Notification";

// eslint-disable-next-line react/prop-types
export default function Expander({ children, title, status, data }) {
  const [open, setOpen] = useState(status);
  const [ref, { height }] = useMeasure();

  const tableView = useStore((state) => state.tableView);
  const setTableView = useStore((state) => state.setTableView);

  return (
    <div className="expander">
      <div
        onClick={() => title !== "Search Results" && setOpen(!open)}
        data-cy={title.replace(/\s+/g, "-").toLowerCase()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            margin: "0",
            cursor: "pointer",
            fontWeight: "700",
            userSelect: "none",
          }}
        >
          <IconContext.Provider value={{ size: "1.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {title == "Search by Spectrum File" ? <MdFileUpload /> : null}
              {title == "Search by Sample" ? <PiEyedropperFill /> : null}
              {title == "Search by Data provider" ? <AiFillDatabase /> : null}
              {title == "Search by Dataset" ? <TbZoomCodeFilled /> : null}
              {title == "Search by Instrument" ? <AiFillTool /> : null}
              {title == "Search by Method" ? <PiWaveSineBold /> : null}
              {title == "Pages" ? <FaSignsPost /> : null}
              {title == "Search Results" ? <FaChartBar /> : null}
              {title == "Free text search" ? <IoSearch /> : null}
              {title}
              {title == "Search Results" && (
                <p className="foundLabel">{data?.numFound} hits found</p>
              )}
            </div>
          </IconContext.Provider>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "26px" }}>
          {title == "Search Results" && (
            <>
              <Notification>Description goes here</Notification>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginRight: "1rem",
                }}
              >
                <div className="viewMode" onClick={() => setTableView(false)}>
                  <GridViewIcon active={!tableView} />
                </div>
                <div className="viewMode" onClick={() => setTableView(true)}>
                  <TableViewIcon active={tableView} />
                </div>
              </div>
            </>
          )}
          {title !== "Search Results" && <ArrowOpen open={open} />}
        </div>
      </div>
      <motion.div animate={{ height }}>
        <div
          ref={ref}
          className={title == "Search Results" && open ? "expanderContent" : ""}
        >
          {open && <div style={{ marginTop: "1rem" }}>{children}</div>}
        </div>
      </motion.div>
    </div>
  );
}
