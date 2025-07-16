/* eslint-disable react/prop-types */
import { useEffect } from "react";
import SearchIcon from "../Icons/SearchIcon";

export default function CustomSearch({
  label,
  setqQuery,
  qQuery,
  setIsCustomSearch,
}) {
  useEffect(() => {
    if (qQuery === "") {
      setIsCustomSearch(false);
    }
  }, [qQuery, setIsCustomSearch]);

  return (
    <div className="selectBtn">
      <SearchIcon />
      <input
        id="projectSearch"
        className="searchSelectInput"
        value={qQuery}
        onChange={(e) => {
          setqQuery(e.target.value);
          setIsCustomSearch(true);
        }}
        placeholder={`Search for ${label}`}
      />
    </div>
  );
}
