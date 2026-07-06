/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import Close from "../Icons/Close";
import Spinner from "../Icons/Spinner";
import { useSessionStorage } from "../../utils/useSessionStorage";
import { ModeSelect } from "../UI/Select";
import EditorDialog from "../EditorDialog/EditorDialog";


// eslint-disable-next-line react/prop-types
export default function UploadFile({
  setImageData,
  setType,
  file,
  setFile,
  dataSources,
  similarity,
  setSimilarity,
  smiles,
  setSmiles,
}) {
  const fileQuery = `${import.meta.env.VITE_BASE_URL}db/download?what=knnquery`;
  const moleculeQuery = `${import.meta.env.VITE_BASE_URL}db/download?what=knnquery`;

  const [isNotRightFile, setIsNotRightFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [fileName, setFileName] = useSessionStorage("fileName", "");

  useEffect(() => {
    if (file && fileName === "") {
      setFileName(file.name);
    }
  }, [file, fileName, setFileName]);

  useEffect(() => {
    async function fetchDate() {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch(fileQuery, {
        method: "POST",
        body: formData,
      });
      if (response) setIsLoading(false);

      if (file && !response.ok) {
        setIsNotRightFile(true);
        setImageData(null);
      }

      if (response.ok) {
        setIsNotRightFile(false);
        const img = await response.json();
        setImageData(img);

        // Auto-select similarity based on vector_field
        if (img.vector_field && dataSources?.similarity) {
          const match = dataSources.similarity.find(s => s.vector === img.vector_field);
          if (match) {
            setSimilarity({ name: match.name, vector: match.vector });
          }
        }
      }
    }
    if (file) {
      fetchDate();
    }
  }, [file, fileQuery, isLoading, setFile, setImageData, setType]);

  // Fetch molecule vector when SMILES changes
  useEffect(() => {
    async function fetchMoleculeVector() {
      if (!smiles) return;

      setIsLoading(true);

      try {
        const response = await fetch(moleculeQuery, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ smiles }),
        });

        setIsLoading(false);

        if (!response.ok) {
          setIsNotRightFile(true);
          setImageData(null);
          return;
        }

        setIsNotRightFile(false);
        const data = await response.json();
        setImageData(data);

        // Auto-select similarity based on vector_field
        if (data.vector_field && dataSources?.similarity) {
          const match = dataSources.similarity.find(s => s.vector === data.vector_field);
          if (match) {
            setSimilarity({ name: match.name, vector: match.vector });
          }
        }
      } catch (error) {
        setIsLoading(false);
        setIsNotRightFile(true);
        setImageData(null);
        console.error("Error fetching molecule vector:", error);
      }
    }

    fetchMoleculeVector();
  }, [smiles, moleculeQuery, setImageData]);

  // Similarity options come from the backend config (/db/query/sources).
  const similarityOptions = dataSources?.similarity || [];
  // Molecule UI is only relevant when the config offers a molecule similarity.
  const hasMolecule = similarityOptions.some((s) =>
    /molecul/i.test(s?.name || "")
  );

  // Auto-select the first similarity option from the config when none is chosen.
  useEffect(() => {
    if (similarityOptions.length && !similarity?.name) {
      const first = similarityOptions[0];
      setSimilarity({ name: first.name, vector: first.vector });
    }
  }, [similarityOptions, similarity, setSimilarity]);

  const handleSmilesExport = (exportedSmiles) => {
    setSmiles(exportedSmiles);
    // Clear file when molecule is drawn
    if (file) {
      setFile(null);
      setFileName("");
    }
  };

  const handleClearMolecule = () => {
    setSmiles("");
    sessionStorage.removeItem("SMILES");
    setImageData(null);
  };

  const handleMolExport = (exportedFile) => {
    // Clear any SMILES since we are switching to file mode
    handleClearMolecule();

    setFile(exportedFile);
    setFileName(exportedFile.name);
    // The useEffect listening to 'file' will trigger upload automatically
    setIsLoading(true);
    setIsNotRightFile(false);
    setImageData(null);
  };

  return (
    <div>
      <form>
        <div className="fileNameWrap">
          <div>
            {fileName && (
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
                    <span className="fileNameStr">{fileName}</span>

                    <div
                      className="closeBtn"
                      onClick={() => {
                        setFile(null);
                        setFileName("");
                      }}
                    >
                      <Close />
                    </div>
                  </div>
                </>
              </div>
            )}
            {smiles && !fileName && (
              <div>
                <>
                  <span className="fileName">SMILES</span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span className="fileNameStr" style={{ fontSize: "12px" }}>
                      {smiles.length > 50 ? smiles.substring(0, 50) + "..." : smiles}
                    </span>

                    <div
                      className="closeBtn"
                      onClick={handleClearMolecule}
                    >
                      <Close />
                    </div>
                  </div>
                </>
              </div>
            )}
          </div>
          {!fileName && !smiles && (
            <span className="uploadPlaceholder">
              {hasMolecule ? "No file or molecule selected" : "No file selected"}
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
                if (file) {
                  setFile(null);
                  setFileName("");
                }
                setFile(e.target.files[0]);
                setIsLoading(true);
                setIsNotRightFile(false);
                setImageData(null);
                // Clear molecule when file is uploaded
                if (smiles) {
                  handleClearMolecule();
                }

              }}
            />
          </label>
          {/* Molecule editor only when the backend config offers a molecule similarity. */}
          {hasMolecule && (
            <EditorDialog onSmilesExport={handleSmilesExport} onMolExport={handleMolExport} />
          )}
        </div>
        {
          (file || smiles) && !isNotRightFile && (
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
                Similarity search
              </label>
            </div>
          )
        }
      </form >
      <ModeSelect
        dataSources={dataSources}
        setSimilarity={setSimilarity}
        similarity={similarity}
      />
    </div >
  );
}
