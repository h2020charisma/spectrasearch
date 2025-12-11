/* eslint-disable react/prop-types */
import { ErrorBoundary } from "react-error-boundary";
import CustomSearch from "../CustomSearch/CustomSearch";
import Expander from "../UI/Expander";
import UploadFile from "../UploadFile/UploadFile";
import Widget from "../Widget/Widget";
import WidgetLiveSearch from "../Widget/WidgetLiveSearch";

const errorMsg = "Sorry, no data available";

export default function Sidebar({
  params,
  setParams,
  setSimilarity,
  similarity,
  dataSources,
  setqQuery,
  qQuery,
  instrument,
  setInstrument,
  setImageSelected,
  setImageData,
  imageData,
  methods,
  setMethods,
  type,
  setType,
  file,
  setFile,
  queryStringSourcesParams,

  setFreeSearch,
  freeSearch,
  fileName,
  setFileName,
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: "4rem",
        bottom: "0",
        height: "100vh",
        marginTop: "0.6rem",
      }}
    >
      <Expander title="Free text search" status={false}>
        <ErrorBoundary
          fallback={<div className="errorMessage">{errorMsg}</div>}
        ></ErrorBoundary>
        <CustomSearch
          setFreeSearch={setFreeSearch}
          freeSearch={freeSearch}
          label="everything"
        />
      </Expander>
      <Expander
        title="Search by Similarity"
        status={fileName === "" ? false : true}
      >
        <UploadFile
          setImageData={setImageData}
          imageData={imageData}
          type={type}
          setType={setType}
          file={file}
          setFile={setFile}
          queryStringSourcesParams={queryStringSourcesParams}
          fileName={fileName}
          setFileName={setFileName}
          dataSources={dataSources}
          setSimilarity={setSimilarity}
          similarity={similarity}
        />
      </Expander>
      <Expander title="Debouncing search" status={false}>
        <WidgetLiveSearch
          name="Debouncing search"
          field="qdynamic.name_s"
          queryStringSourcesParams={queryStringSourcesParams}
          setImageSelected={setImageSelected}
          params={params}
          setParams={setParams}
        />
      </Expander>
      {dataSources?.fields.map((item) => (
        <Expander title={item.name} status={false} key={item.name}>
          <Widget
            key={item.name}
            name={item.name}
            field={item.field}
            queryStringSourcesParams={queryStringSourcesParams}
            setImageSelected={setImageSelected}
            params={params}
            setParams={setParams}
          />
        </Expander>
      ))}
    </div>
  );
}
