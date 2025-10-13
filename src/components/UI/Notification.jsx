/* eslint-disable react/prop-types */
import InfoIcon from "../Icons/InfoIcon";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function Notification({ children }) {
  const [isHovering, setIsHovering] = useState(false);

  const messageVariants = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
  };
  return (
    <div className="infoSection">
      <AnimatePresence>
        {isHovering && (
          <motion.p
            className="describLabel"
            variants={messageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {children}
          </motion.p>
        )}
      </AnimatePresence>
      <div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{ marginTop: "6px" }}
      >
        <InfoIcon />
      </div>
    </div>
  );
}
