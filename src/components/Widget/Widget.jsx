/* eslint-disable react/prop-types */
import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function Widget({
  name,
  field,
  queryStringSourcesParams,
  setImageSelected,
}) {
  const providerURL = `db/query/field?name=${field}${
    queryStringSourcesParams && `&${queryStringSourcesParams}`
  }`;

  const { data } = useFetch(providerURL);
  console.log(data);

  return (
    <div>
      <SearchSelect
        qQuery={""}
        setqQuery={""}
        data={data?.response}
        setImageSelected={setImageSelected}
        label={name}
      />
    </div>
  );
}
