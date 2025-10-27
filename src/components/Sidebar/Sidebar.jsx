/* eslint-disable react/prop-types */
import Expander from "../UI/Expander";
import SelectNumber from "../UI/SelectNumber";
import { ErrorBoundary } from "react-error-boundary";

import DataProvider from "../DataProvider/DataProvider";
import Instrument from "../Instrument/Instrument";
import Investigations from "../Investigations/Investigations";
import Sample from "../Sample/Sample";
import UploadFile from "../UploadFile/UploadFile";
import Wavelengths from "../Wavelengths/Wavelengths";
import CustomSearch from "../CustomSearch/CustomSearch";
import Widget from "../Widget/Widget";

const errorMsg = "Sorry, no data available";

export default function Sidebar({
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
          />
        </Expander>
      ))}

      {/* <Expander title="Pages">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <SelectNumber value={pages} setValue={setPages} label="Pages" />
          <SelectNumber
            value={pagesize}
            setValue={setPagesize}
            label="Numbers of Hits"
          />
        </div>
      </Expander> */}
    </div>
  );
}
