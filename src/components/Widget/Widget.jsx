/* eslint-disable react/prop-types */
import SearchSelect from "../UI/SearchSelect";
import ListPlaceholder from "../UI/ListPlaceholder";

import useFetch from "../../utils/useFetch";

export default function Widget({
  name,
  field,
  queryStringSourcesParams,
  setImageSelected,
  params,
  setParams,
}) {
  const providerURL = `db/query/field?name=${field}${
    queryStringSourcesParams && `&${queryStringSourcesParams}`
  }`;

  const { data } = useFetch(providerURL);
  console.log(params);

  return (
    <div style={{ maxHeight: "250px" }}>
      <SearchSelect
        qQuery={params}
        setqQuery={setParams}
        data={data?.response}
        setImageSelected={setImageSelected}
        label={name}
        field={field}
      />
      {!data && <ListPlaceholder count={4} />}
    </div>
  );
}
