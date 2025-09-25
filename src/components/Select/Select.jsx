/* eslint-disable react/prop-types */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import CloseIcon from "../Icons/Close";
import SearchIcon from "../Icons/SearchIcon";
import "./Select.css";

import useFetch from "../../utils/useFetch";

export default function Select({ sources, setSources }) {
  const defaultSource = localStorage.getItem("defaultSource") || "";

  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  const url = `${import.meta.env.VITE_BaseURL}db/query/sources`;

  const { data } = useFetch(url);

  useEffect(() => {
    if (sources?.length < 1) {
      setSources(
        data?.data_sources.filter((item) => item.name === defaultSource)
      );
    }
  }, [data, defaultSource, setSources, sources]);

  useEffect(
    () =>
      setFiltered(
        data?.data_sources?.filter((item) =>
          item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
        ),
        localStorage.setItem("numberOfsources", data?.data_sources?.length || 0)
      ),
    [search, data, defaultSource]
  );

  const removeSource = (name) => {
    const updatedSources = sources.filter((item) => item.name !== name);
    setSources(updatedSources);
  };

  return (
    <section>
      <div className="projectName">
        <div
          className="resetLabel"
          onClick={() => {
            setSources([]);
          }}
        >
          Reset to default
        </div>
        <AnimatePresence>
          {sources?.map((item) => {
            return (
              <motion.div
                key={item.name}
                className="sourceItemLabel"
                layout
                initial={{ opacity: 0, scale: 0.8, x: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="sourceNameLabel">{item.name}</span>
                <div
                  data-cy="clean-btn"
                  id="cleanProject"
                  className="closeSourceBtn"
                  onClick={() => {
                    removeSource(item.name);
                  }}
                >
                  <CloseIcon />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div data-cy="select-btn" className="sourcesSelectBtn">
        <SearchIcon />
        <input
          id="projectSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search for the source...`}
        />
      </div>

      {open && (
        <div
          className="selectOptionsSourses"
          style={{ scrollbarWidth: "thin" }}
        >
          {filtered?.map((item) => {
            let isSelected = !sources?.some(
              (source) => source?.name === item?.name
            );

            return (
              <div
                data-source={item.name}
                className={`${
                  isSelected ? "sourceItem" : "sourceItem sourceItemActive"
                }`}
                key={item.name}
                onClick={() => {
                  if (isSelected) {
                    setSources((prev) => [...prev, item]);
                  } else {
                    setSources(() =>
                      sources.filter((source) => source.name !== item.name)
                    );
                  }
                }}
              >
                <p className="sourceName">{item.name}</p>
                <p className="sourceDesc">{item.description}</p>
                <p className="sourceLicence">{item.licence}</p>
                {item.name === defaultSource && (
                  <span className="defaultSourceLabel">default</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
