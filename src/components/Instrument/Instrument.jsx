import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function Instrument({
  instrument,
  setInstrument,
  setImageSelected,
}) {
  const providerURL = `db/query/field?name=instrument_s`;

  const { data, loading } = useFetch(providerURL);

  return (
    <div>
      <SearchSelect
        data={data}
        setqQuery={setInstrument}
        qQuery={instrument}
        setImageSelected={setImageSelected}
        label="Instruments"
      />
    </div>
  );
}
