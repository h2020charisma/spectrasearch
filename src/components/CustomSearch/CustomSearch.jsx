/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import SearchIcon from "../Icons/SearchIcon";
import Close from "../Icons/Close";
import "./CustomSearch.css";

export default function CustomSearch({
  label,
  setFreeSearch,
  freeSearch,
  setIsCustomSearch,
}) {
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (freeSearch === "") {
      setIsCustomSearch(false);
    }
  }, [freeSearch, setIsCustomSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsCustomSearch(true);
    setFreeSearch(searchInput.trim());
  };

  return (
    <div className="searchContainer">
      <form onSubmit={handleSubmit} className="searchForm">
        <input
          id="projectSearch"
          className="searchSelectInput"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
          }}
          placeholder={`Search for ${label}`}
        />
        <button
          type="button"
          className="closeBtn"
          onClick={() => {
            setSearchInput("");
            setFreeSearch("");
            setIsCustomSearch(false);
          }}
        >
          <Close />
        </button>
        <button type="submit" className="searchButton">
          <SearchIcon />
        </button>
      </form>
    </div>
  );
}
