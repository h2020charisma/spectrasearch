/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import SearchIcon from "../Icons/SearchIcon";
import "./Select.css";
import Close from "../Icons/Close";

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
  const [selected, setSelected] = useState("");
  // console.log(
  //   "qQuery:",
  //   qQuery,
  //   "search:",
  //   search,
  //   "label:",
  //   label,
  //   "selected:",
  //   selected
  // );

  useEffect(() => {
    const found = qQuery?.some((obj) => obj.name === label);
    if (!found) {
      setSelected("");
      setSearch("");
    }
  }, [qQuery, label]);

  useEffect(
    () =>
      setFiltered(
        data?.filter((item) => {
          return item.value
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase());
        })
      ),
    [data, search]
  );

  return (
    <section>
      <div
        onClick={() => {
          !search && setOpen(!open);
        }}
        className="selectBtn"
        style={{ position: "relative" }}
      >
        <SearchIcon />
        <input
          id={`Search for ${label}`}
          data-cy={label.replace(/\s+/g, "-").toLowerCase()}
          className={
            selected ? "searchSelectInput active" : "searchSelectInput"
          }
          value={selected || search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search for ${label}`}
        />
        <div
          style={{ position: "absolute", right: "0.5rem", cursor: "pointer" }}
          onClick={() => {
            setqQuery((prev) => [
              ...prev.filter((item) => item.value !== selected),
            ]);
            setSearch("");
            setSelected("");
            setImageSelected("");
          }}
        >
          {selected && <Close />}
        </div>
      </div>

      {open && (
        <div className="selectOptions" style={{ scrollbarWidth: "thin" }}>
          {/* <p
            className="selectItem"
            onClick={() => {
              setqQuery((prev) => [
                ...prev.filter((item) => item !== selected),
              ]);
              setSearch("");
              setImageSelected("");
            }}
          >
            {selected === null ? "" : <strong>{selected}</strong>}
          </p> */}
          <hr />

          {!search &&
            data &&
            data.map((item, i) => (
              <p
                data-project={item.value}
                className="selectItem"
                key={i}
                onClick={() => {
                  if (selected !== item.value) {
                    setqQuery((prev) => [
                      ...prev,
                      { name: label, value: item.value },
                    ]);
                  }
                  setSelected(item.value);
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
                data-project={item.value}
                className="selectItem"
                key={i}
                onClick={() => {
                  if (selected !== item.value) {
                    setqQuery((prev) => [
                      ...prev,
                      { name: label, value: item.value },
                    ]);
                  }
                  setSearch(item.value);
                  setSelected(item.value);
                  setOpen(false);
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
