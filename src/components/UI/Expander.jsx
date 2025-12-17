/* eslint-disable react/prop-types */

import { useMeasure } from "@uidotdev/usehooks";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { IconContext } from "react-icons";
import DynamicIcon from "../../utils/DynamicIcon";
import ArrowOpen from "../Icons/Arrow";

import { FaChartBar } from "react-icons/fa";
import { FaSignsPost } from "react-icons/fa6";
import { IoSearch } from "react-icons/io5";
import { MdFileUpload } from "react-icons/md";

import GridViewIcon from "../Icons/GridViewIcon";
import TableViewIcon from "../Icons/TableViewIcon";

import { useStore } from "../../store/store";
import Notification from "./Notification";

// eslint-disable-next-line react/prop-types
export default function Expander({ children, title, status, data, icon }) {
  const [open, setOpen] = useState(status);
  const [ref, { height }] = useMeasure();

  const tableView = useStore((state) => state.tableView);
  const setTableView = useStore((state) => state.setTableView);

  const [iconName, setIconName] = useState("");
  const [iconPack, setIconPack] = useState("");

  useEffect(() => {
    if (!icon) return;
    const [pack, name] = icon.split("/");
    setIconName(name);
    setIconPack(pack);
  }, [icon]);

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
              <div style={{ height: "26px", width: "26px" }}>
                <DynamicIcon name={iconName} pack={iconPack} />

                {title == "Search by Similarity" ? <MdFileUpload /> : null}
                {title == "Pages" ? <FaSignsPost /> : null}
                {title == "Search Results" ? <FaChartBar /> : null}
                {title == "Free text search" ? <IoSearch /> : null}
              </div>
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
