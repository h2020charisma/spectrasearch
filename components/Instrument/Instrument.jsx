import useSWR from "swr";
import Select from "../UI/Select";
import SearchSelect from "../UI/SearchSelect";

const fetcher = (url) => fetch(url).then((res) => res.json());

// eslint-disable-next-line react/prop-types
export default function Instrument({
  instrument,
  setInstrument,
  setImageSelected,
}) {
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
      <SearchSelect
        data={data}
        setqQuery={setInstrument}
        qQuery={instrument}
        setImageSelected={setImageSelected}
        label="Instruments"
      />
    </div>
  );
}
