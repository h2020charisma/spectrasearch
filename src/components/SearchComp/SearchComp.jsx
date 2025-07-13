/* eslint-disable react/prop-types */
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useAuth } from "react-oidc-context";

import { useLocation } from "react-router-dom";
import Chart from "../Chart/Chart";
import SideBarToggle from "../Icons/SideBarToggle";
import ImageSelect from "../ImageSelect/ImageSelect";
import Expander from "../UI/Expander";

import DisplaySearchFilters from "../DisplaySearchFilters/DisplaySearchFilters";

import "../../App.css";

import Sidebar from "../Sidebar/Sidebar";

import useFetch from "../../utils/useFetch";

export default function SearchComp({ setDomain }) {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const domainParams = queryParams.get("domain");
  let [open, setOpen] = useState(true);
  let [imageSelected, setImageSelected] = useState(
    domainParams ? domainParams : ""
  );

  let isNexusFile = false;

  const auth = useAuth();

  let [reference, setReference] = useState("*");
  let [provider, setProvider] = useState("*");
  let [pages, setPages] = useState("0");
  let [pagesize, setPagesize] = useState("30");
  let [qQuery, setqQuery] = useState("*");
  let [instrument, setInstrument] = useState("*");
  let [wavelengths, setWavelengths] = useState("*");

  const dataSourcesJSON = localStorage.getItem("dataSources");

  const [sources, setSources] = useState(JSON.parse(dataSourcesJSON) || []);

  // const querySorcesString = sources
  //   .map((source) => source?.name.toLowerCase())
  //   .join("&data_source=");

  const params = new URLSearchParams();
  params.append("reference", reference);
  params.append("provider", provider);
  params.append("page", pages);
  params.append("pagesize", pagesize);
  params.append("q", qQuery);
  params.append("instrument", instrument);
  params.append("wavelength", wavelengths);

  if (sources.length > 0) {
    sources.forEach((source) => {
      if (source?.name) {
        params.append("data_source", source.name.toLowerCase());
      }
    });
  }

  const queryString = params.toString();

  const url = `db/query?q=${queryString}`;

  let [imageData, setImageData] = useState(null);
  let [type, setType] = useState("knnquery");

  const [file, setFile] = useState(null);

  const fileSearchUrlPath = `${url}&query_type=${type}&ann=${imageData?.cdf}`;

  const urlPath = imageData && file ? fileSearchUrlPath : url;

  const { data, loading, error } = useFetch(urlPath);

  return (
    <div className="main">
      <div>
        <div className="toggleSidebar" onClick={() => setOpen(!open)}>
          <SideBarToggle />
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
      </div>

      <div className="content">
        <DisplaySearchFilters
          qQuery={qQuery}
          setqQuery={setqQuery}
          provider={provider}
          setProvider={setProvider}
          instrument={instrument}
          setInstrument={setInstrument}
          wavelengths={wavelengths}
          setWavelengths={setWavelengths}
          reference={reference}
          setReference={setReference}
          sources={sources}
          setSources={setSources}
        />
        {file && imageData && (
          <div className="imageUploded">
            <img src={imageData && imageData.imageLink} />
          </div>
        )}

        <Expander title="Search Results" status={true} data={data}>
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
              error={error}
              loading={loading}
              imageSelected={imageSelected}
              setImageSelected={setImageSelected}
            />
          </ErrorBoundary>
        </Expander>
        {imageSelected && auth.isAuthenticated ? (
          // <ErrorBoundary
          //   fallback={
          //     <div className="errorMessage">
          //       <p>Sorry, something went wrong</p>
          //       <button onClick={() => setImageSelected(null)}>
          //         Please Try Again
          //       </button>
          //     </div>
          //   }
          // >
          <Chart
            imageSelected={imageSelected}
            setDomain={setDomain}
            isNexusFile={isNexusFile}
          />
        ) : (
          // </ErrorBoundary>
          <div className="errorMessage">
            {/* {auth.isAuthenticated && <p>No image selected</p>} */}
          </div>
        )}
      </div>
    </div>
  );
}
