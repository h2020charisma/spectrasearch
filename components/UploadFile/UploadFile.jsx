import { useState } from "react";
import Close from "../Icons/Close";

export default function UploadFile() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(
      "https://api.charisma.ideaconsult.net/download?what=knnquery",
      {
        method: "POST",
        body: formData,
      }
    );
    setData(response);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="fileNameWrap">
        <p>
          {file ? (
            <>
              <span className="fileName">File Name</span>
              <span>{file.name}</span>
            </>
          ) : (
            <span className="uploadPlaceholder">No file selected</span>
          )}
        </p>
        {file && (
          <div className="closeBtn" onClick={() => setFile(null)}>
            <Close />
          </div>
        )}
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
          Upload File
        </button>
      </div>
    </form>
  );
}
