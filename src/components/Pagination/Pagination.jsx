/* eslint-disable react/prop-types */
import { useEffect, useMemo } from "react";
import SelectNumber from "../UI/SelectNumber";

import "./Pagination.css";

function Pagination({
  pagesize,
  setPagesize,
  pages,
  setPages,
  founds,
  loading,
  error,
}) {
  const totalPages = useMemo(() => {
    const totalFounds = Number(founds ?? 0);

    if (!pagesize) {
      return 0;
    }

    return Math.ceil(totalFounds / pagesize);
  }, [founds, pagesize]);

  useEffect(() => {
    if (founds === 0) {
      // Keep pagesize unchanged.
      // Reset only the page index.
      setPages(0);
    } else if (pagesize > 100 || pagesize < 0) {
      setPagesize(10);
      setPages(0);
    }
  }, [founds, pagesize, setPages, setPagesize]);

  const currentPage = pages + 1;

  // During loading/error, don't allow pagination actions
  // based on incomplete/failed data.
  const canNavigate = !loading && !error && totalPages > 0;

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const pageNumber = parseInt(e.target.value, 10);

      if (
        !isNaN(pageNumber) &&
        pageNumber > 0 &&
        pageNumber <= totalPages &&
        canNavigate
      ) {
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
          disabled={!canNavigate || pages < 1}
        >
          Previous Page
        </button>

        <div className="pages-numbers">
          {canNavigate && pages > 0 && (
            <div
              className="firstPageNumber"
              onClick={() => {
                setPages(0);
              }}
            >
              1
            </div>
          )}

          {canNavigate && currentPage >= 3 && <p>&nbsp;...</p>}

          <div className="pages-info">
            <span className="current-page">{currentPage}</span>
          </div>

          {canNavigate && currentPage !== totalPages && (
            <div
              className="lastPageNumber"
              onClick={() => {
                setPages(totalPages - 1);
              }}
            >
              ...&nbsp;&nbsp;{totalPages}
            </div>
          )}
        </div>

        <input
          onKeyDown={handleKeyDown}
          className="pageNumberInput"
          type="text"
          placeholder="Page"
          disabled={!canNavigate}
        />

        <button
          className="next-page-btn"
          onClick={() => {
            setPages(pages + 1);
          }}
          disabled={!canNavigate || pages >= totalPages - 1}
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

export default Pagination;
