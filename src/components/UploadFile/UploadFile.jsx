/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import Close from "../Icons/Close";
import Spinner from "../Icons/Spinner";
import { useSessionStorage } from "../../utils/useSessionStorage";
import { ModeSelect } from "../UI/Select";
import EditorDialog from "../EditorDialog/EditorDialog";
import { apiUrl } from "../../config";

const invalidInputMessage = "Invalid data submitted. Please check your inputs.";
const uploadFailureMessage =
  "Something went wrong on our end. Please try again later.";
const fileProcessingMessage =
  "The file couldn't be processed. Its format may not be supported, or its contents may be invalid or damaged. Check the file and try again.";
const fileUploadFailureMessage =
  "The file couldn't be uploaded. Please try again later.";

function responseErrorMessage(
  response,
  invalidMessage = invalidInputMessage,
  failureMessage = uploadFailureMessage,
) {
  return response.status === 400 ? invalidMessage : failureMessage;
}

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
  setPages,
  resetPage,
}) {
  const fileQuery = apiUrl("db/download?what=knnquery");
  const moleculeQuery = apiUrl("db/download?what=knnquery");

  const [isNotRightFile, setIsNotRightFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useSessionStorage("fileName", "");
  const similarityOptions = dataSources?.similarity;
  const hasMolecule =
    similarityOptions?.some((option) => /molecul/i.test(option?.name || "")) ||
    false;

  useEffect(() => {
    if (file && fileName === "") {
      setFileName(file.name);
    }
  }, [file, fileName, setFileName]);

  useEffect(() => {
    if (!file) return;

    const controller = new AbortController();

    async function fetchDate() {
      let errorMessage = fileUploadFailureMessage;

      setIsLoading(true);
      setIsNotRightFile(false);
      setUploadError("");

      const formData = new FormData();
      formData.append("files", file);

      try {
        const response = await fetch(fileQuery, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          errorMessage = responseErrorMessage(
            response,
            fileProcessingMessage,
            fileUploadFailureMessage,
          );
          throw new Error(`Upload failed with status ${response.status}`);
        }

        const img = await response.json();
        setImageData(img);

        // Auto-select similarity based on vector_field
        if (img.vector_field && similarityOptions) {
          const match = similarityOptions.find(
            (s) => s.vector === img.vector_field,
          );
          if (match) {
            setSimilarity({ name: match.name, vector: match.vector });
          }
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        setIsNotRightFile(true);
        setUploadError(errorMessage);
        setFile(null);
        setFileName("");
        setImageData(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        console.error("Error uploading file:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    fetchDate();
    return () => controller.abort();
  }, [
    file,
    fileQuery,
    similarityOptions,
    setFile,
    setFileName,
    setImageData,
    setSimilarity,
  ]);

  // Fetch molecule vector when SMILES changes
  useEffect(() => {
    if (!smiles) return;

    const controller = new AbortController();

    async function fetchMoleculeVector() {
      let errorMessage = uploadFailureMessage;

      setIsLoading(true);
      setIsNotRightFile(false);
      setUploadError("");

      try {
        const response = await fetch(moleculeQuery, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ smiles }),
          signal: controller.signal,
        });

        if (!response.ok) {
          errorMessage = responseErrorMessage(response);
          throw new Error(
            `Molecule request failed with status ${response.status}`,
          );
        }

        const data = await response.json();
        setImageData(data);

        // Auto-select similarity based on vector_field
        if (data.vector_field && similarityOptions) {
          const match = similarityOptions.find(
            (s) => s.vector === data.vector_field,
          );
          if (match) {
            setSimilarity({ name: match.name, vector: match.vector });
          }
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        setIsNotRightFile(true);
        setUploadError(errorMessage);
        setImageData(null);
        console.error("Error fetching molecule vector:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    fetchMoleculeVector();
    return () => controller.abort();
  }, [smiles, moleculeQuery, similarityOptions, setImageData, setSimilarity]);

  // Auto-select the first similarity option from the config when none is chosen.
  useEffect(() => {
    if (similarityOptions?.length && !similarity?.name) {
      const first = similarityOptions[0];
      setSimilarity({ name: first.name, vector: first.vector });
    }
  }, [similarityOptions, similarity, setSimilarity]);

  const handleSmilesExport = (exportedSmiles) => {
    setUploadError("");
    setIsNotRightFile(false);
    setSmiles(exportedSmiles);
    // Clear file when molecule is drawn
    if (file) {
      setFile(null);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    resetPage?.();
  };

  const handleClearMolecule = () => {
    setUploadError("");
    setIsNotRightFile(false);
    setSmiles("");
    sessionStorage.removeItem("SMILES");
    setImageData(null);
    resetPage?.();
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
    resetPage?.();
  };

  return (
    <div>
      <form>
        <div className="fileNameWrap">
          <div>
            {isNotRightFile && (
              <div className="notRightFile" role="alert">
                {uploadError || uploadFailureMessage}
              </div>
            )}
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
                    <span className="fileNameStr" title={fileName}>
                      {fileName.length > 40
                        ? fileName.substring(0, 40) + "..."
                        : fileName}
                    </span>

                    <div
                      className="closeBtn"
                      onClick={() => {
                        setFile(null);
                        setFileName("");
                        setUploadError("");
                        setIsNotRightFile(false);
                        setPages(0);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
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
                      {smiles.length > 50
                        ? smiles.substring(0, 50) + "..."
                        : smiles}
                    </span>

                    <div className="closeBtn" onClick={handleClearMolecule}>
                      <Close />
                    </div>
                  </div>
                </>
              </div>
            )}
          </div>
          {!fileName && !smiles && !isNotRightFile && (
            <span className="uploadPlaceholder">
              {hasMolecule
                ? "No file or molecule selected"
                : "No file selected"}
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
              ref={fileInputRef}
              onChange={(e) => {
                if (file) {
                  setFile(null);
                  setFileName("");
                }
                setPages(0);
                setFile(e.target.files[0]);
                setIsLoading(true);
                setIsNotRightFile(false);
                setUploadError("");
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
            <EditorDialog
              onSmilesExport={handleSmilesExport}
              onMolExport={handleMolExport}
            />
          )}
        </div>
        {(file || smiles) && !isNotRightFile && (
          <div className="searchOptions">
            <label
              onClick={() => {
                setType("text");
                resetPage?.();
              }}
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
              onClick={() => {
                setType("knnquery");
                resetPage?.();
              }}
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
        )}
      </form>
      <ModeSelect
        dataSources={dataSources}
        setSimilarity={setSimilarity}
        similarity={similarity}
        resetPage={resetPage}
      />
    </div>
  );
}
