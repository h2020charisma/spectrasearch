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

const errorMsg = "Sorry, no data avaible";

export default function Sidebar({
  reference,
  setReference,
  provider,
  setProvider,
  pages,
  setPages,
  pagesize,
  setPagesize,
  setqQuery,
  qQuery,
  instrument,
  setInstrument,
  setImageSelected,
  setImageData,
  imageData,
  wavelengths,
  setWavelengths,
  type,
  setType,
  file,
  setFile,
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
      <Expander title="Search by Spectrum File" status={false}>
        <UploadFile
          setImageData={setImageData}
          imageData={imageData}
          type={type}
          setType={setType}
          file={file}
          setFile={setFile}
        />
      </Expander>
      <Expander title="Search by Sample" status={false}>
        <ErrorBoundary
          fallback={<div className="errorMessage">{errorMsg}</div>}
        >
          <Sample
            setqQuery={setqQuery}
            qQuery={qQuery}
            setImageSelected={setImageSelected}
          />
        </ErrorBoundary>
      </Expander>
      <Expander title="Search by Data provider">
        <ErrorBoundary
          fallback={<div className="errorMessage">{errorMsg}</div>}
        >
          <DataProvider
            provider={provider}
            setProvider={setProvider}
            setImageSelected={setImageSelected}
          />
        </ErrorBoundary>
      </Expander>
      <Expander title="Search by Dataset" status={false}>
        <ErrorBoundary
          fallback={<div className="errorMessage">{errorMsg}</div>}
        >
          <Investigations
            reference={reference}
            setReference={setReference}
            setImageSelected={setImageSelected}
          />
        </ErrorBoundary>
      </Expander>
      <Expander title="Search by Instrument" status={false}>
        <ErrorBoundary
          fallback={<div className="errorMessage">{errorMsg}</div>}
        >
          <Instrument
            instrument={instrument}
            setInstrument={setInstrument}
            setImageSelected={setImageSelected}
          />
        </ErrorBoundary>
      </Expander>
      <Expander title="Search by Wavelenth" status={false}>
        <ErrorBoundary
          fallback={<div className="errorMessage">{errorMsg}</div>}
        >
          <Wavelengths
            wavelengths={wavelengths}
            setWavelengths={setWavelengths}
            setImageSelected={setImageSelected}
          />
        </ErrorBoundary>
      </Expander>
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
