import useSWR from "swr";
import SearchSelect from "../UI/SearchSelect";

const fetcher = (url) => fetch(url).then((res) => res.json());

// eslint-disable-next-line react/prop-types
export default function Sample({ qQuery, setqQuery }) {
  const providerURL = `${
    import.meta.env.VITE_BaseURL
  }query/field?name=publicname_s`;

  const { data } = useSWR(providerURL, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return (
    <div>
      <SearchSelect setqQuery={setqQuery} qQuery={qQuery} />
    </div>
  );
}
