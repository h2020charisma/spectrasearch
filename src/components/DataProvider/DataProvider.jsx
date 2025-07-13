/* eslint-disable react/prop-types */
import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function DataProvider({
  provider,
  setProvider,
  setImageSelected,
  queryStringSourcesParams,
}) {
  const providerURL = `db/query/field?name=reference_owner_s${
    queryStringSourcesParams && `&${queryStringSourcesParams}`
  }`;

  const { data, loading } = useFetch(providerURL);

  return (
    <div>
      {/* <Select items={data} value={provider} setValue={setProvider} /> */}
      <SearchSelect
        data={data}
        setqQuery={setProvider}
        qQuery={provider}
        setImageSelected={setImageSelected}
        label="Providers"
      />
    </div>
  );
}
