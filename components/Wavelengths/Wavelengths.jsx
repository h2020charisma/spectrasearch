import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function Wavelengths({
  wavelengths,
  setWavelengths,
  setImageSelected,
}) {
  const providerURL = `db/query/field?name=wavelength_s`;

  const { data, loading } = useFetch(providerURL);

  return (
    <div>
      <SearchSelect
        data={data}
        setqQuery={setWavelengths}
        qQuery={wavelengths}
        setImageSelected={setImageSelected}
        label="Wavelengths"
      />
    </div>
  );
}
