/* eslint-disable react/prop-types */
import { useEffect, useMemo } from "react";
import SelectNumber from "../UI/SelectNumber";
import { useMemorizedValue } from "../../utils/useMemorizedValue";

import "./Pagination.css";

function Pagination({ pagesize, setPagesize, pages, setPages, founds }) {
  const totalPages = useMemo(() => {
    if (!pagesize) return 0;
    if (founds) {
      return Math.ceil(founds / pagesize);
    }
  }, [founds, pagesize]);
  const memorizedTotalPages = useMemorizedValue(totalPages);

  useEffect(() => {
    if (founds === 0) {
      setPagesize(0);
      setPages(0);
    } else if (founds > 0 && pagesize === 0) {
      setPagesize(10);
    } else if (pagesize > 100 || pagesize < 0) {
      setPagesize(10);
    }
  }, [founds, pagesize, setPages, setPagesize]);

  const currentPage = pages + 1;

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const pageNumber = parseInt(e.target.value, 10);
      if (!isNaN(pageNumber) && pageNumber > 0 && pageNumber <= totalPages) {
        setPages(pageNumber - 1);
        e.target.value = "";
      }
    }
  };

  return (
    <div className="pagination-wrap">
      <SelectNumber
        value={pagesize}
        setValue={setPagesize}
        setPages={setPages}
        founds={founds}
        label="Numbers of Hits"
      />
      <div className="btns-wrap">
        <button
          className="next-page-btn"
          onClick={() => {
            setPages(pages - 1);
          }}
          disabled={pages < 1}
        >
          Previous Page
        </button>
        <div className="pages-numbers">
          {pages > 0 && (
            <div
              className="firstPageNumber"
              onClick={() => {
                setPages(0);
              }}
            >
              1
            </div>
          )}
          {currentPage < 3 ? null : <p>&nbsp;...</p>}
          <div className="pages-info">
            <span className="current-page">{pages + 1}</span>
          </div>
          {currentPage !== totalPages && (
            <div
              className="lastPageNumber"
              onClick={() => {
                setPages(totalPages - 1);
              }}
            >
              ...&nbsp;&nbsp;{memorizedTotalPages ? memorizedTotalPages : null}
            </div>
          )}
        </div>
        <input
          onKeyDown={handleKeyDown}
          className="pageNumberInput"
          type="text"
          placeholder="Page"
        />
        <button
          className="next-page-btn"
          onClick={() => {
            setPages(pages + 1);
          }}
          disabled={pages > totalPages - 2}
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

export default Pagination;
