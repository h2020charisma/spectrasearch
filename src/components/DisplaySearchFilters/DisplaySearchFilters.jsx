/* eslint-disable react/prop-types */
import { AnimatePresence, motion } from "framer-motion";
import "../../App.css";
import Close from "../Icons/Close";
import SourcesDialog from "../SourcesDialog/SourcesDialog";
import Pagination from "../Pagination/Pagination";

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
  return (
    <div>
      <div className="search-filters-wrap">
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

        <SourcesDialog
          sources={sources}
          setSources={setSources}
          allDataSources={allDataSources}
          dialog={dialog}
          setDialog={setDialog}
        />
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
  return (
    <motion.div
      className="search-filters-item"
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      <p className="metadataLabel">{label}</p>
      <p className="metadataInfoValue">{value}</p>
      <div
        data-cy="close-badge-btn"
        onClick={onClick}
        style={{ cursor: "pointer" }}
      >
        <Close />
      </div>
    </motion.div>
  );
};
