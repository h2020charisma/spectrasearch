/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import SearchIcon from "../Icons/SearchIcon";
import "./Select.css";
// import SearchIcon from "@/IconsComponents/SearchIcon";
// import CloseIcon from "@/IconsComponents/CloseIcon";

import { q_query } from "../../data/q_query";

export default function SearchSelect({ setqQuery, qQuery }) {
  const [open, setOpen] = useState(false);

  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(
    () =>
      setFiltered(
        q_query &&
          q_query.filter((item) =>
            item.toLocaleLowerCase().includes(search.toLocaleLowerCase())
          )
      ),
    [search]
  );

  return (
    <section>
      <div onClick={() => setOpen(!open)} className="selectBtn">
        <SearchIcon />
        <input
          id="projectSearch"
          className="searchSelectInput"
          value={qQuery}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search`}
        />
      </div>

      {open && (
        <div className="selectOptions" style={{ scrollbarWidth: "thin" }}>
          {filtered &&
            filtered.map((item) => (
              <p
                data-project={item.id}
                className="selectItem"
                key={item.id}
                onClick={() => {
                  setqQuery(item);
                  setOpen(false);
                }}
              >
                {item}
              </p>
            ))}
        </div>
      )}
    </section>
  );
}
