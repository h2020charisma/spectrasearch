import useSWR from "swr";
import Select from "../UI/Select";

const fetcher = (url) => fetch(url).then((res) => res.json());

// eslint-disable-next-line react/prop-types
export default function Investigations({ reference, setReference }) {
  const providerURL = `${
    import.meta.env.VITE_BaseURL
  }query/field?name=reference_s`;

  const { data } = useSWR(providerURL, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return (
    <div>
      <Select items={data} value={reference} setValue={setReference} />
    </div>
  );
}
