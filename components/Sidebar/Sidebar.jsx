/* eslint-disable react/prop-types */
import Expander from "../UI/Expander";
import SelectNumber from "../UI/SelectNumber";

import SearchSelect from "../UI/SearchSelect";
import Select from "../UI/Select";

import { providersList } from "../../data/providers";
import { referenceList } from "../../data/reference";
import UploadFile from "../UploadFile/UploadFile";

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
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: "4rem",
        bottom: "0",
      }}
    >
      <Expander title="Search" status={false}>
        <SearchSelect setqQuery={setqQuery} qQuery={qQuery} />
      </Expander>
      <Expander title="Upload Spectrum File" status={false}>
        <UploadFile />
      </Expander>
      <Expander title="Investigation" status={false}>
        <Select
          items={referenceList}
          value={reference}
          setValue={setReference}
        />
      </Expander>
      <Expander title="Data Provider">
        <Select items={providersList} value={provider} setValue={setProvider} />
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
