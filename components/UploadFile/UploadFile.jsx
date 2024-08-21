/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import Close from "../Icons/Close";
import Spinner from "../Icons/Spinner";

// eslint-disable-next-line react/prop-types
export default function UploadFile({ setImageData, setType, file, setFile }) {
  const fileQuery = `${import.meta.env.VITE_BaseURL}download?what=knnquery`;

  const [isNotRightFile, setIsNotRightFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchDate() {
      const formData = new FormData();
      formData.append("file[]", file);
      const response = await fetch(fileQuery, {
        method: "POST",
        body: formData,
      });
      if (response) setIsLoading(false);

      if (file && !response.ok) {
        setIsNotRightFile(true);
      }

      if (response.ok) {
        setIsNotRightFile(false);
        const img = await response.json();
        setImageData(img);
      }
    }
    if (file) {
      fetchDate();
    }
  }, [file, fileQuery, isLoading, setFile, setImageData, setType]);

  return (
    <form>
      <div className="fileNameWrap">
        <div>
          {file && !isNotRightFile && !isLoading && (
            <div>
              <>
                <span className="fileName">File Name</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span className="fileNameStr">{file.name}</span>

                  <div className="closeBtn" onClick={() => setFile(null)}>
                    <Close />
                  </div>
                </div>
              </>
            </div>
          )}
        </div>
        {!file && <span className="uploadPlaceholder">No file selected</span>}
        {isNotRightFile && (
          <span className="uploadPlaceholder">
            Please upload a spectrum file
          </span>
        )}
        {isLoading && <Spinner />}
      </div>
      <div className="uploadBtnsWrap">
        <label className="fileNameBtn">
          Choose a File
          <input
            type="file"
            id="file"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setIsLoading(true);
              setIsNotRightFile(false);
            }}
          />
        </label>
      </div>
      {file && !isNotRightFile && (
        <div className="searchOptions">
          <label
            onClick={() => setType("text")}
            htmlFor="tx"
            style={{
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <input
              id="tx"
              type="radio"
              name="searchType"
              style={{ width: "16px", height: "16px", marginRight: "12px" }}
            />
            Text search
          </label>

          <label
            onClick={() => setType("knnquery")}
            htmlFor="sp"
            style={{
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <input
              id="sp"
              type="radio"
              name="searchType"
              defaultChecked
              style={{ width: "16px", height: "16px", marginRight: "12px" }}
            />
            Spectrum search
          </label>
        </div>
      )}
    </form>
  );
}
