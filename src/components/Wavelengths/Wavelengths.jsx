/* eslint-disable react/prop-types */
import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function Wavelengths({
  wavelengths,
  setWavelengths,
  setImageSelected,
  queryStringSourcesParams,
}) {
  const providerURL = `db/query/field?name=wavelength_s${
    queryStringSourcesParams && `&${queryStringSourcesParams}`
  }`;

  const { data, loading } = useFetch(providerURL);

  return (
    <div>
      <SearchSelect
        data={data?.response}
        setqQuery={setWavelengths}
        qQuery={wavelengths}
        setImageSelected={setImageSelected}
        label="Wavelengths"
      />
    </div>
  );
}
