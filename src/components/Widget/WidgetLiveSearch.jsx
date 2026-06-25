/* eslint-disable react/prop-types */
import SearchLiveSelect from "../UI/SearchLiveSelect";

export default function WidgetLiveSearch({
  name,
  field,
  setImageSelected,
  params,
  queryStringSourcesParams,
  setParams,
}) {
  return (
    <div>
      <SearchLiveSelect
        qQuery={params}
        setqQuery={setParams}
        setImageSelected={setImageSelected}
        queryStringSourcesParams={queryStringSourcesParams}
        label={name}
        field={field}
      />
    </div>
  );
}
