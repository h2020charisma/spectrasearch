import useSWR from "swr";
import Select from "../UI/Select";
import SearchSelect from "../UI/SearchSelect";

const fetcher = (url) => fetch(url).then((res) => res.json());

// eslint-disable-next-line react/prop-types
export default function DataProvider({ provider, setProvider }) {
  const providerURL = `${
    import.meta.env.VITE_BaseURL
  }query/field?name=reference_owner_s`;

  const { data } = useSWR(providerURL, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return (
    <div>
      {/* <Select items={data} value={provider} setValue={setProvider} /> */}
      <SearchSelect
        data={data}
        setqQuery={setProvider}
        qQuery={provider}
        label="Providers"
      />
    </div>
  );
}
