/* eslint-disable react/prop-types */
import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function Instrument({
  instrument,
  setInstrument,
  setImageSelected,
  queryStringSourcesParams,
}) {
  const providerURL = `db/query/field?name=instrument_s${
    queryStringSourcesParams && `&${queryStringSourcesParams}`
  }`;

  const { data, loading } = useFetch(providerURL);

  return (
    <div>
      <SearchSelect
        data={data?.response}
        setqQuery={setInstrument}
        qQuery={instrument}
        setImageSelected={setImageSelected}
        label="Instruments"
      />
    </div>
  );
}
