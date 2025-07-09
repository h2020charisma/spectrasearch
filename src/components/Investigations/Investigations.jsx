import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function Investigations({
  reference,
  setReference,
  setImageSelected,
}) {
  const providerURL = `db/query/field?name=reference_s`;

  const { data, loading } = useFetch(providerURL);

  return (
    <div>
      <SearchSelect
        data={data}
        setqQuery={setReference}
        qQuery={reference}
        setImageSelected={setImageSelected}
        label="Dataset"
      />
    </div>
  );
}
