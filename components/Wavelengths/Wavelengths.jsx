import useSWR from "swr";
import Select from "../UI/Select";
import SearchSelect from "../UI/SearchSelect";

const fetcher = (url) => fetch(url).then((res) => res.json());

// eslint-disable-next-line react/prop-types
export default function Wavelengths({ wavelengths, setWavelengths }) {
  const providerURL = `${
    import.meta.env.VITE_BaseURL
  }query/field?name=wavelength_s`;

  const { data } = useSWR(providerURL, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return (
    <div>
      <SearchSelect
        data={data}
        setqQuery={setWavelengths}
        qQuery={wavelengths}
        label="Wavelengths"
      />
    </div>
  );
}
