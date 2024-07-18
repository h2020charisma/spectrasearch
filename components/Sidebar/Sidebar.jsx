/* eslint-disable react/prop-types */
import Expander from "../UI/Expander";
import SelectNumber from "../UI/SelectNumber";

import DataProvider from "../DataProvider/DataProvider";
import Instrument from "../Instrument/Instrument";
import Investigations from "../Investigations/Investigations";
import Sample from "../Sample/Sample";
import UploadFile from "../UploadFile/UploadFile";
import Wavelengths from "../Wavelengths/Wavelengths";

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
        marginTop: "3.6rem",
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
        <Sample setqQuery={setqQuery} qQuery={qQuery} />
      </Expander>
      <Expander title="Search by Data provider">
        <DataProvider provider={provider} setProvider={setProvider} />
      </Expander>
      <Expander title="Search by Investigation" status={false}>
        <Investigations reference={reference} setReference={setReference} />
      </Expander>
      <Expander title="Search by Instrument" status={false}>
        <Instrument instrument={instrument} setInstrument={setInstrument} />
      </Expander>
      <Expander title="Search by Wavelenth" status={false}>
        <Wavelengths
          wavelengths={wavelengths}
          setWavelengths={setWavelengths}
        />
      </Expander>
      <Expander title="Pages">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <SelectNumber value={pages} setValue={setPages} label="Pages" />
          <SelectNumber
            value={pagesize}
            setValue={setPagesize}
            label="Numbers of Hits"
          />
        </div>
      </Expander>
    </div>
  );
}
