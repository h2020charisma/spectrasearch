import { useEffect, useState } from "react";
import Close from "../Icons/Close";

// eslint-disable-next-line react/prop-types
export default function UploadFile({ imageData, setImageData, type, setType }) {
  const [file, setFile] = useState(null);

  const fileQuery = `${import.meta.env.VITE_BaseURL}download?what=knnquery`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("file[]", file);
    const response = await fetch(fileQuery, {
      method: "POST",
      body: formData,
    });
    const img = await response.json();
    setImageData(img);
  };
  useEffect(() => {}, [file]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="fileNameWrap">
        <p>
          {file ? (
            <div>
              <span className="fileName">File Name</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span className="fileNameStr">{file.name}</span>
                {file && (
                  <div className="closeBtn" onClick={() => setFile(null)}>
                    <Close />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="uploadPlaceholder">No file selected</span>
          )}
        </p>
      </div>
      <div className="uploadBtnsWrap">
        <label className="fileNameBtn">
          Choose a File
          <input
            type="file"
            id="file"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>
        <button type="submit" disabled={!file} className="fileNameBtn">
          Search
        </button>
      </div>
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
          onClick={() => setType("spectrum")}
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
            style={{ width: "16px", height: "16px", marginRight: "12px" }}
          />
          Spectrum search
        </label>
      </div>
    </form>
  );
}
