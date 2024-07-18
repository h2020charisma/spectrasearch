/* eslint-disable react/prop-types */
import { useEffect } from "react";
import Close from "../Icons/Close";

// eslint-disable-next-line react/prop-types
export default function UploadFile({
  setImageData,

  setType,
  file,
  setFile,
}) {
  // const [file, setFile] = useState(null);

  const fileQuery = `${import.meta.env.VITE_BaseURL}download?what=knnquery`;

  useEffect(() => {
    async function fetchDate() {
      const formData = new FormData();
      formData.append("file[]", file);
      const response = await fetch(fileQuery, {
        method: "POST",
        body: formData,
      });
      const img = await response.json();
      setImageData(img);
    }
    if (file) fetchDate();
    if (!file) setType("knnquery");
  }, [file, fileQuery, setImageData, setType]);

  return (
    <form>
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
      </div>
      {file && (
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
