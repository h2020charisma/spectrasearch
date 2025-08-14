/* eslint-disable react/prop-types */
import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function Sample({
  qQuery,
  setqQuery,
  setImageSelected,
  queryStringSourcesParams,
}) {
  const providerURL = `db/query/field?name=publicname_s${
    queryStringSourcesParams && `&${queryStringSourcesParams}`
  }`;

  const { data, loading } = useFetch(providerURL);

  return (
    <div>
      <SearchSelect
        qQuery={qQuery}
        setqQuery={setqQuery}
        data={data?.response}
        setImageSelected={setImageSelected}
        label="Samples"
      />
    </div>
  );
}
