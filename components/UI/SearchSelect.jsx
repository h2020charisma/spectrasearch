/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import SearchIcon from "../Icons/SearchIcon";
import "./Select.css";

export default function SearchSelect({ data, setqQuery, label }) {
  const [open, setOpen] = useState(false);

  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(
    () =>
      setFiltered(
        data &&
          data.filter((item) => {
            return item.value
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase());
          })
      ),
    [data, search]
  );

  return (
    <section>
      <div onClick={() => setOpen(!open)} className="selectBtn">
        <SearchIcon />
        <input
          id="projectSearch"
          className="searchSelectInput"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search for ${label}`}
        />
      </div>

      {open && (
        <div className="selectOptions" style={{ scrollbarWidth: "thin" }}>
          <p
            className="selectItem"
            onClick={() => {
              setqQuery("*");
              setSearch("");
            }}
          >
            {`All ${label}`}
          </p>
          <hr />

          {!search &&
            data &&
            data.map((item, i) => (
              <p
                data-project={item}
                className="selectItem"
                key={i}
                onClick={() => {
                  setqQuery(item.value);
                  setOpen(false);
                  setSearch(item.value);
                }}
              >
                {item.value}
              </p>
            ))}
          {search &&
            filtered &&
            filtered.map((item, i) => (
              <p
                data-project={item}
                className="selectItem"
                key={i}
                onClick={() => {
                  setqQuery(item.value);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {item.value}
              </p>
            ))}
        </div>
      )}
    </section>
  );
}
