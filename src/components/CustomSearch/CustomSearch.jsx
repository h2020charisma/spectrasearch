/* eslint-disable react/prop-types */
import { useState } from "react";
import Close from "../Icons/Close";
import SearchIcon from "../Icons/SearchIcon";
import "./CustomSearch.css";

export default function CustomSearch({ label, setFreeSearch }) {
  const [searchInput, setSearchInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

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
