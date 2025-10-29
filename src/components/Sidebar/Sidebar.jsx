/* eslint-disable react/prop-types */
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import CustomSearch from "../CustomSearch/CustomSearch";
import Expander from "../UI/Expander";
import UploadFile from "../UploadFile/UploadFile";
import Widget from "../Widget/Widget";

const errorMsg = "Sorry, no data available";

export default function Sidebar({
  params,
  setParams,
  reference,
  setReference,
  provider,
  setProvider,
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
        title="Search by Spectrum File"
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
