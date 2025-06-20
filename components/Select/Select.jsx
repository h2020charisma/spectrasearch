import { useEffect, useState } from "react";
import "./Select.css";
import SearchIcon from "../Icons/SearchIcon";
import CloseIcon from "../Icons/Close";
import useSWR from "swr";

export default function Select() {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(); // localStorage?
  const [sourceName, setSourceName] = useState(); // localStorage?

  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  //   const setSourceID = useSetProjectID();

  const url = `${import.meta.env.VITE_BaseURL}db/query/sources`;
  const fetcher = (url) => fetch(url).then((res) => res.json());

  const { data } = useSWR(url, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(
    () =>
      setFiltered(
        data?.data_sources.filter((item) =>
          item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
        )
      ),
    [search, data]
  );

  const resetSource = () => {
    setSourceName("");
    localStorage.setItem("source", "");
    localStorage.clear();
  };

  return (
    <section>
      <div className="projectName">
        {sourceName ? (
          <>
            <span className="projectLabel">Source:</span>
            <span className="sourceName">{sourceName}</span>

            <div
              data-cy="clean-btn"
              id="cleanProject"
              className="closeSourceBtn"
              onClick={() => resetSource()}
            >
              <CloseIcon />
            </div>
          </>
        ) : null}
      </div>
      <div
        data-cy="select-btn"
        onClick={() => setOpen(!open)}
        className="sourcesSelectBtn"
      >
        <SearchIcon />
        <input
          id="projectSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search for the source...`}
        />
      </div>
      {open && (
        <div className="selectOptions" style={{ scrollbarWidth: "thin" }}>
          {filtered.map((item) => (
            <p
              data-source={item.name}
              className="selectItem"
              key={item.name}
              onClick={() => {
                localStorage.setItem("source", item.name);
                setSource(item.name);
                setSourceName(item.name);
                setOpen(false);
              }}
            >
              {item.name}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
