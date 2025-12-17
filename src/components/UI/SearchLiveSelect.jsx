/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import useDebounce from "../../utils/useDebounce";
import SearchIcon from "../Icons/SearchIcon";
import Close from "../Icons/Close";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function SearchSelect({
  qQuery,
  setqQuery,
  setImageSelected,
  queryStringSourcesParams, // new prop for data sources
  label,
  field,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");

  const baseURL = `${import.meta.env.VITE_BaseURL}`;
  const debounced = useDebounce(search, 300);

  // Build full endpoint including data sources
  const apiURL =
    debounced && debounced.length > 0
      ? `${baseURL}db/query/field/terms?name=${field}&prefix=${encodeURIComponent(
          debounced
        )}&limit=25${
          queryStringSourcesParams ? `&${queryStringSourcesParams}` : ""
        }`
      : null;

  const { data, error } = useSWR(apiURL, fetcher);
  const terms = data?.response || [];

  useEffect(() => {
    const found = qQuery?.some((obj) => obj.name === label);
    if (!found) {
      setSelected("");
      setSearch("");
    }
  }, [qQuery, label]);

  return (
    <section>
      <div
        // onClick={() => {
        //   if (!search) setOpen(!open);
        // }}
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
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
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
          {(search || selected) && <Close />}
        </div>
      </div>

      <div className="selectOptions" style={{ scrollbarWidth: "thin" }}>
        {debounced !== "" &&
          terms.map((value, i) => (
            <p
              data-project={value}
              className="selectItem"
              key={i}
              onClick={() => {
                if (selected !== value) {
                  setqQuery((prev) => [...prev, { name: label, value, field }]);
                }
                setSearch(value);
                setSelected(value);
                setOpen(false);
                setImageSelected("");
              }}
            >
              {value}
            </p>
          ))}

        {!search && terms.length === 0 && (
          <p style={{ opacity: 0.8, textAlign: "center" }}>
            Start typing to display available values
          </p>
        )}

        {debounced !== "" && terms.length === 0 && (
          <p style={{ opacity: 0.8, textAlign: "center" }}>No matches</p>
        )}
      </div>
    </section>
  );
}
