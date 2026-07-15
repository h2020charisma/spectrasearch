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
    if (pagesize > 100 || pagesize < 1) {
      setPagesize(10);
    }
    if (localStorage.getItem("currentPage")) {
      setPages(parseInt(localStorage.getItem("currentPage")));
    }
  }, [pagesize, setPages, setPagesize]);

  const currentPage = pages + 1;

  const storedPage = localStorage.getItem("currentPage");

  // const currentPageNumber = localStorage.getItem("currentPage") || currentPage;

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
            localStorage.setItem("currentPage", pages - 1);
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
                localStorage.setItem("currentPage", 1);
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
                localStorage.setItem("currentPage", totalPages);
              }}
            >
              ...&nbsp;&nbsp;{totalPages ? totalPages : null}
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
            localStorage.setItem("currentPage", pages + 1);
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
