import { useState } from "react";
import { motion } from "framer-motion";
import { useMeasure } from "@uidotdev/usehooks";
import ArrowOpen from "../Icons/Arrow";

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
          {title}
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
