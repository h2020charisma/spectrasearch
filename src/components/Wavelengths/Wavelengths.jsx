/* eslint-disable react/prop-types */
import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function Wavelengths({
  methods,
  setMethods,
  setImageSelected,
  queryStringSourcesParams,
}) {
  const providerURL = `db/query/field?name=E.method_s${
    queryStringSourcesParams && `&${queryStringSourcesParams}`
  }`;

  const { data, loading } = useFetch(providerURL);

  return (
    <div>
      <SearchSelect
        data={data?.response}
        setqQuery={setMethods}
        qQuery={methods}
        setImageSelected={setImageSelected}
        label="Methods"
      />
    </div>
  );
}
