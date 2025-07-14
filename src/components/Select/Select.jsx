/* eslint-disable react/prop-types */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import CloseIcon from "../Icons/Close";
import SearchIcon from "../Icons/SearchIcon";
import ErrorComp from "../UI/ErrorComp";
import "./Select.css";

import useFetch from "../../utils/useFetch";

// const mockData = [
//   {
//     id: 1,
//     name: "Charisma",
//     description:
//       "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus interdum mi id ex dapibus, ac viverra libero facilisis. Maecenas feugiat libero viverra placerat sodales. Suspendisse potenti.",
//     licence: "MIT",
//   },
//   {
//     id: 2,
//     name: "Polygonum",
//     description:
//       "Nullam tincidunt, enim sit amet malesuada euismod, velit augue convallis eros, quis consectetur felis massa non ligula. Proin ac urna mattis, accumsan justo at, eleifend libero. Maecenas vestibulum enim sed risus convallis pulvinar.",
//     licence: "MIT",
//   },
//   {
//     id: 3,
//     name: "Nulla sodales",
//     description:
//       "Nulla sodales, lacus ac placerat auctor, velit augue iaculis eros, at pretium enim turpis et leo. Nulla bibendum nibh id est scelerisque, at venenatis ante convallis.",
//     licence: "MIT",
//   },
//   {
//     id: 4,
//     name: "Pretium",
//     description:
//       "velit augue iaculis eros, at pretium enim turpis et leo. Nulla bibendum nibh id est scelerisque, at venenatis ante convallis.",
//     licence: "MIT",
//   },
//   {
//     id: 5,
//     name: "Velit",
//     description:
//       "Nullam tincidunt, enim sit amet malesuada euismod, velit augue convallis eros, quis consectetur felis massa non ligula. Proin ac urna mattis, accumsan justo at, eleifend libero. Maecenas vestibulum enim sed risus convallis pulvinar.",
//     licence: "MIT",
//   },
// ];

export default function Select({ sources, setSources }) {
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  // const [data, setData] = useState([]);

  const url = `${import.meta.env.VITE_BaseURL}db/query/sources`;

  const { data, loading, error } = useFetch(url);

  useEffect(
    () =>
      setFiltered(
        data?.data_sources?.filter((item) =>
          item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
        )
      ),
    [search, data]
  );
  const sourcesJSON = JSON.stringify(sources);

  localStorage.setItem("dataSources", sourcesJSON);

  const resetSource = () => {
    localStorage.setItem("source", "");
    localStorage.clear();
  };

  const removeSorce = (name) => {
    const updatedSources = sources.filter((item) => item.name !== name);
    setSources(updatedSources);
  };

  return (
    <section>
      <ErrorComp loading={loading} error={error} />
      <div className="projectName">
        <AnimatePresence>
          {sources?.map((item) => (
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
                  resetSource();
                  removeSorce(item.name);
                }}
              >
                <CloseIcon />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {!error && (
        <div data-cy="select-btn" className="sourcesSelectBtn">
          <SearchIcon />
          <input
            id="projectSearch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search for the source...`}
          />
        </div>
      )}

      {open && (
        <div
          className="selectOptionsSourses"
          style={{ scrollbarWidth: "thin" }}
        >
          {filtered?.map((item) => {
            let isSelected = !sources?.some(
              (source) => source.name === item.name
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
