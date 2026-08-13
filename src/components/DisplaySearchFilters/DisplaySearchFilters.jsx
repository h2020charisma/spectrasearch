/* eslint-disable react/prop-types */
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import "../../App.css";
import Close from "../Icons/Close";
import SourcesDialog from "../SourcesDialog/SourcesDialog";
import Pagination from "../Pagination/Pagination";
import { useCollection } from "../../store/collection";

export default function DisplaySearchFilters({
  params,
  setParams,
  sources,
  dialog,
  setDialog,
  setSources,
  allDataSources,
  pagesize,
  pages,
  setPagesize,
  setPages,
  founds,
}) {
  const collectionCount = useCollection((s) => s.items.length);
  return (
    <div style={{ textAlign: "right", paddingTop: "0.4rem" }}>
      <Link
        to="/collection"
        className="sourcesBtn"
        style={{ marginRight: 8, textDecoration: "none", display: "inline-block" }}
      >
        My collection{collectionCount ? ` (${collectionCount})` : ""}
      </Link>
      <SourcesDialog
        sources={sources}
        setSources={setSources}
        allDataSources={allDataSources}
        dialog={dialog}
        setDialog={setDialog}
      />
      <div className="search-filters-wrap">
        <div className="search-filters-container">
          <div className="resetFilters" onClick={() => setParams([])}>
            {params.length > 1 && <p className="resetLabel">Clear</p>}
          </div>
          <div className="search-filters">
            <AnimatePresence>
              {params?.map(({ name, value }) => (
                <FilterBadge
                  key={name}
                  label={name}
                  value={value}
                  onClick={() =>
                    setParams((prev) =>
                      prev.filter((item) => item.value !== value)
                    )
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <Pagination
        pagesize={pagesize}
        pages={pages}
        setPagesize={setPagesize}
        setPages={setPages}
        founds={founds}
      />
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
