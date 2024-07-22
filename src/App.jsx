import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ErrorBoundary } from "react-error-boundary";
import Chart from "../components/Chart/Chart";
import SideBarToggle from "../components/Icons/SideBarToggle";
import ImageSelect from "../components/ImageSelect/ImageSelect";
import Expander from "../components/UI/Expander";
import UnderDevelopent from "../components/UnderDevelopent/UnderDevelopent";
import "./App.css";

import Sidebar from "../components/Sidebar/Sidebar";
const fetcher = (url) => fetch(url).then((res) => res.json());

function App() {
  let [open, setOpen] = useState(true);
  let [imageSelected, setImageSelected] = useState("");
  let [reference, setReference] = useState("*");
  let [provider, setProvider] = useState("*");
  let [pages, setPages] = useState("0");
  let [pagesize, setPagesize] = useState("10");
  let [qQuery, setqQuery] = useState("*");
  let [instrument, setInstrument] = useState("*");
  let [wavelengths, setWavelengths] = useState("*");

  let [imageData, setImageData] = useState(null);
  let [type, setType] = useState("spectrum");

  const [file, setFile] = useState(null);

  let query_type = file && type === "spectrum" ? "knnquery" : "text";

  const searchQuery = `${
    import.meta.env.VITE_BaseURL
  }query?q=${qQuery}&img=thumbnail&query_type=text&q_reference=${reference}&q_provider=${provider}&q_instrument=${instrument}&q_wavelength=${wavelengths}&page=${pages}&pagesize=${pagesize}`;

  const fileSearchQuery = `${
    import.meta.env.VITE_BaseURL
  }query?q=${qQuery}&img=thumbnail&query_type=${query_type}&q_reference=${reference}&q_provider=${provider}&q_instrument=${instrument}&q_wavelength=${wavelengths}&page=${pages}&pagesize=${pagesize}&ann=${
    imageData?.cdf
  }`;

  const { data } = useSWR(
    (imageData && fileSearchQuery) || (!imageData && searchQuery),
    fetcher,
    {
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return (
    <div className="main">
      <div className="toggleSidebar" onClick={() => setOpen(!open)}>
        <SideBarToggle /> <h1>Raman Spectra Search</h1>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: "-100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "-100%" }}
            transition={{ type: "tween", stiffness: 100 }}
            className="sidebar"
          >
            <Sidebar
              data={data}
              imageSelected={imageSelected}
              setImageSelected={setImageSelected}
              reference={reference}
              setReference={setReference}
              provider={provider}
              setProvider={setProvider}
              pages={pages}
              setPages={setPages}
              pagesize={pagesize}
              setPagesize={setPagesize}
              setqQuery={setqQuery}
              qQuery={qQuery}
              setImageData={setImageData}
              imageData={imageData}
              instrument={instrument}
              setInstrument={setInstrument}
              wavelengths={wavelengths}
              setWavelengths={setWavelengths}
              type={type}
              setType={setType}
              file={file}
              setFile={setFile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="content">
        <UnderDevelopent />
        {file && imageData && (
          <div className="imageUploded">
            <img src={imageData && imageData.imageLink} />
          </div>
        )}
        <Expander title="Select Spectrum" status={true}>
          <ErrorBoundary
            fallback={
              <div className="errorMessage">
                <p>Sorry, something went wrong</p>
                <button onClick={() => setImageData(null)}>
                  Please Try Again
                </button>
              </div>
            }
          >
            <ImageSelect
              data={data}
              imageSelected={imageSelected}
              setImageSelected={setImageSelected}
            />
          </ErrorBoundary>
        </Expander>
        {imageSelected ? (
          <ErrorBoundary
            fallback={
              <div className="errorMessage">
                <p>Sorry, something went wrong</p>
                <button onClick={() => setImageSelected(null)}>
                  Please Try Again
                </button>
              </div>
            }
          >
            <Chart imageSelected={imageSelected} />
          </ErrorBoundary>
        ) : (
          <div className="errorMessage">
            <p>No image selected</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
