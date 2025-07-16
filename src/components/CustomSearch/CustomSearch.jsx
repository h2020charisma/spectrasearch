/* eslint-disable react/prop-types */
import SearchIcon from "../Icons/SearchIcon";

export default function CustomSearch({ label, setqQuery, qQuery }) {
  return (
    <div className="selectBtn">
      <SearchIcon />
      <input
        id="projectSearch"
        className="searchSelectInput"
        value={qQuery}
        onChange={(e) => setqQuery(e.target.value)}
        placeholder={`Search for ${label}`}
      />
    </div>
  );
}
