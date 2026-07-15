/* eslint-disable react/prop-types */
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import "../../App.css";
import Close from "../Icons/Close";

export default function DisplaySearchFilters({ params, setParams }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div className="search-filters-wrap">
        <div className="search-filters-container">
          {params.length > 1 && (
            <div className="resetFilters" onClick={() => setParams([])}>
              <p className="resetLabel">Clear</p>
            </div>
          )}
          <div className="search-filters">
            <AnimatePresence>
              {params?.map(({ name, value }) => (
                <FilterBadge
                  key={name}
                  label={name}
                  value={value}
                  onClick={() =>
                    setParams((prev) =>
                      prev.filter((item) => item.value !== value),
                    )
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

const FilterBadge = ({ label, value, onClick }) => {
  const [show, setShow] = useState(false);

  return (
    <>
      <motion.div
        className="search-filters-item"
        style={{ position: "relative" }}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
      >
        <p className="metadataLabel">{label}</p>
        <p
          className="metadataInfoValue"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          {value}
        </p>
        <div
          data-cy="close-badge-btn"
          onClick={onClick}
          style={{ cursor: "pointer" }}
        >
          <Close />
        </div>
        {show && <div className="badgeHover">{value}</div>}
      </motion.div>
    </>
  );
};
