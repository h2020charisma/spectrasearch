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
  pages,
  setPages,
}) {
  const providerURL = `db/query/field?name=${field}${
    queryStringSourcesParams && `&${queryStringSourcesParams}`
  }`;

  const { data } = useFetch(providerURL);

  return (
    <div style={{ maxHeight: "250px" }}>
      <SearchSelect
        qQuery={params}
        setqQuery={setParams}
        data={data?.response}
        setImageSelected={setImageSelected}
        label={name}
        field={field}
        pages={pages}
        setPages={setPages}
      />
      {!data && <ListPlaceholder count={4} />}
    </div>
  );
}
