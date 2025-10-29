/* eslint-disable react/prop-types */
import SearchSelect from "../UI/SearchSelect";
import { useState } from "react";

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
    <div>
      <SearchSelect
        qQuery={params}
        setqQuery={setParams}
        data={data?.response}
        setImageSelected={setImageSelected}
        label={name}
      />
    </div>
  );
}
