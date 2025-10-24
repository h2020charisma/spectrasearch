/* eslint-disable react/prop-types */
import { AnimatePresence, motion } from "framer-motion";
import "../../App.css";
import Close from "../Icons/Close";
import SourcesDialog from "../SourcesDialog/SourcesDialog";
import Pagination from "../Pagination/Pagination";

export default function DisplaySearchFilters({
  qQuery,
  setqQuery,
  provider,
  setProvider,
  instrument,
  setInstrument,
  wavelengths,
  setWavelengths,
  reference,
  setReference,
  sources,
  dialog,
  setDialog,
  setSources,
  allDataSources,

  freeSearch,
  setFreeSearch,
  methods,
  setMethods,
  pagesize,
  pages,
  setPagesize,
  setPages,
  founds,
}) {
  const filters = [
    // {
    //   label: "File",
    //   value: fileName,
    //   onClick: () => setFileName(""),
    // },
    {
      label: "Free Search",
      value: freeSearch,
      onClick: () => setFreeSearch(""),
    },
    { label: "Sample", value: qQuery, onClick: () => setqQuery("*") },
    {
      label: "Provider",
      value: provider,
      onClick: () => setProvider("*"),
    },
    {
      label: "Instrument",
      value: instrument,
      onClick: () => setInstrument("*"),
    },
    {
      label: "Methods",
      value: methods,
      onClick: () => setMethods("*"),
    },
    { label: "Dataset", value: reference, onClick: () => setReference("*") },
  ];

  return (
    <div className="search-filters-wrap">
      <Pagination
        pagesize={pagesize}
        pages={pages}
        setPagesize={setPagesize}
        setPages={setPages}
        founds={founds}
      />
      <div className="search-filters">
        <AnimatePresence>
          {filters
            .filter(
              ({ value }) =>
                value !== "" && value !== "*" && value?.length !== 0
            )
            .map(({ label, value, onClick }) => (
              <FilterBadge
                key={label}
                label={label}
                value={value}
                onClick={onClick}
              />
            ))}
        </AnimatePresence>
      </div>
      {/* <span className="vdataSourcesCaption">Select Data Sources</span> */}
      <SourcesDialog
        sources={sources}
        setSources={setSources}
        allDataSources={allDataSources}
        dialog={dialog}
        setDialog={setDialog}
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
