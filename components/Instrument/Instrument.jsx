import useSWR from "swr";
import Select from "../UI/Select";

const fetcher = (url) => fetch(url).then((res) => res.json());

// eslint-disable-next-line react/prop-types
export default function Instrument({ instrument, setInstrument }) {
  const providerURL = `${
    import.meta.env.VITE_BaseURL
  }query/field?name=instrument_s`;

  const { data } = useSWR(providerURL, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return (
    <div>
      <Select items={data} value={instrument} setValue={setInstrument} />
    </div>
  );
}
