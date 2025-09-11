/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import SearchIcon from "../Icons/SearchIcon";
import "./Select.css";

export default function SearchSelect({
  data,
  qQuery,
  setqQuery,
  setImageSelected,
  label,
}) {
  const [open, setOpen] = useState(false);

  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (qQuery === "*" || qQuery === "") {
      setSearch("");
    }
  }, [qQuery]);

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
          id={`Search for ${label}`}
          data-cy={label.replace(/\s+/g, "-").toLowerCase()}
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
              setImageSelected("");
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
                  setImageSelected("");
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
                  setImageSelected("");
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
