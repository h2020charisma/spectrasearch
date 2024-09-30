import SearchSelect from "../UI/SearchSelect";

import useFetch from "../../utils/useFetch";

export default function Sample({ qQuery, setqQuery, setImageSelected }) {
  const providerURL = `db/query/field?name=publicname_s`;

  const { data, loading } = useFetch(providerURL);

  return (
    <div>
      <SearchSelect
        data={data}
        setqQuery={setqQuery}
        qQuery={qQuery}
        setImageSelected={setImageSelected}
        label="Samples"
      />
    </div>
  );
}
