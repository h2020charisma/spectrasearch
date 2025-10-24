/* eslint-disable react/prop-types */
import { useEffect, useMemo } from "react";
import SelectNumber from "../UI/SelectNumber";
import "./Pagination.css";

function Pagination({ pagesize, setPagesize, pages, setPages, founds }) {
  const totalPages = useMemo(() => {
    if (!pagesize) return 0;
    if (founds) {
      return Math.ceil(founds / pagesize);
    }
  }, [founds, pagesize]);

  useEffect(() => {
    if (pagesize > 50) {
      setPagesize(10);
    }
  }, [pagesize, setPagesize]);

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
          onClick={() => setPages(pages - 1)}
          disabled={pages < 1}
        >
          Previous Page
        </button>
        <div className="pages-numbers">
          {pages > 0 && (
            <div className="firstPageNumber" onClick={() => setPages(0)}>
              1
            </div>
          )}
          {currentPage < 3 ? null : <p>...</p>}
          <div className="pages-info">
            <span className="current-page">{currentPage}</span>
          </div>
          {currentPage !== totalPages && (
            <div
              className="lastPageNumber"
              onClick={() => setPages(totalPages - 1)}
            >
              ... {totalPages ? totalPages : null}
            </div>
          )}
        </div>
        <input
          onKeyDown={handleKeyDown}
          className="pageNumberInput"
          type="text"
          placeholder="Page Number"
        />
        <button
          className="next-page-btn"
          onClick={() => setPages(pages + 1)}
          disabled={pages > totalPages - 2}
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

export default Pagination;
