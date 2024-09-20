import useSWR from "swr";
import SearchSelect from "../UI/SearchSelect";

import fetcher from "../../utils/fetcher";

// eslint-disable-next-line react/prop-types
export default function Sample({ qQuery, setqQuery, setImageSelected }) {
  const providerURL = `${
    import.meta.env.VITE_BaseURL
  }db/query/field?name=publicname_s`;

  const { data } = useSWR(providerURL, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

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
