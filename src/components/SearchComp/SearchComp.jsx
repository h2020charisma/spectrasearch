/* eslint-disable react/prop-types */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useAuth } from "react-oidc-context";
import { useLocation } from "react-router-dom";
import useFetch from "../../utils/useFetch";
import { useSessionStorage } from "../../utils/useSessionStorage";

import { ErrorBoundary } from "react-error-boundary";

import Chart from "../Chart/Chart";
import DisplaySearchFilters from "../DisplaySearchFilters/DisplaySearchFilters";
import SideBarToggle from "../Icons/SideBarToggle";
import ImageSelect from "../ImageSelect/ImageSelect";
import Sidebar from "../Sidebar/Sidebar";
import Expander from "../UI/Expander";
import ToastDemo from "../UI/Toast/Toast";

import "../../App.css";

export default function SearchComp({ setDomain }) {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const domainParams = queryParams.get("domain");
  let [open, setOpen] = useState(true);
  let [imageSelected, setImageSelected] = useState(
    domainParams ? domainParams : ""
  );

  let isNexusFile = false;

  let [q_reference, setQReference] = useSessionStorage("reference", "*");
  let [provider, setProvider] = useSessionStorage("provider", "*");
  let [pages, setPages] = useSessionStorage("pages", "0");
  let [pagesize, setPagesize] = useSessionStorage("pagesize", "30");
  let [q, setQ] = useSessionStorage("q", "*");
  let [instrument, setInstrument] = useSessionStorage("instrument", "*");
  let [wavelengths, setWavelengths] = useSessionStorage("wavelengths", "*");
  let [freeSearch, setFreeSearch] = useSessionStorage("freeSearch", "");

  const auth = useAuth();

  const dataSourcesJSON = localStorage.getItem(
    `${auth.isAuthenticated ? "protectedDataSources" : "dataSources"}`
  );
  const dataSources = JSON.parse(dataSourcesJSON);
  const [sources, setSources] = useState(dataSources || []);

  const [imageData, setImageData] = useSessionStorage("imgData", null);

  const [file, setFile] = useSessionStorage("file", "");
  const [type, setType] = useState("knnquery");

  const sorcesUrl = `${import.meta.env.VITE_BaseURL}db/query/sources`;
  const { data: defaultSources } = useFetch(sorcesUrl);

  // const defaultSource = localStorage.getItem("defaultSource") || "";

  useEffect(() => {
    if (auth.isAuthenticated) {
      setSources(
        JSON.parse(localStorage.getItem("protectedDataSources")) || []
      );
    } else {
      setSources(JSON.parse(localStorage.getItem("dataSources")) || []);
    }

    localStorage.setItem("defaultSource", defaultSources?.default || "");
    localStorage.setItem(
      "numberOfDefaultSources",
      defaultSources?.data_sources?.length || 0
    );
  }, [
    auth.isAuthenticated,
    defaultSources?.data_sources,
    defaultSources?.data_sources?.length,
    defaultSources,
  ]);

  const params = new URLSearchParams();
  if (freeSearch !== "") {
    params.append("q", freeSearch);
  }
  if (q !== "*" && q !== "") {
    params.append("q", q);
  }
  if (q_reference !== "*" && q_reference !== "") {
    params.append("q_reference", q_reference);
  }
  if (provider !== "*" && provider !== "") {
    params.append("q_provider", provider);
  }
  if (instrument !== "*" && instrument !== "") {
    params.append("instrument_s", instrument);
  }
  if (wavelengths !== "*" && wavelengths !== "") {
    params.append("wavelength_s", wavelengths);
  }
  if (imageData && file && type === "text") {
    params.append("query_type", type);
  }
  if (imageData && file && type !== "text") {
    params.append("query_type", type);
    params.append("ann", imageData.cdf);
  }
  params.append("page", pages);
  params.append("pagesize", pagesize);

  const sourcesParams = new URLSearchParams();

  if (sources.length > 0) {
    sources.forEach((source) => {
      if (source?.name) {
        params.append("data_source", source.name.toLowerCase());
        sourcesParams.append("data_source", source.name.toLowerCase());
      }
    });
  }
  const queryStringSourcesParams = sourcesParams
    .toString()
    .replace(/\+/g, "%20");

  const queryString = params.toString().replace(/\+/g, "%20");

  const url = `db/query?${queryString}`;

  const { data, loading, error } = useFetch(url);

  return (
    <div className="main">
      <ToastDemo error={error} />
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
                reference={q_reference}
                setReference={setQReference}
                provider={provider}
                setProvider={setProvider}
                pages={pages}
                setPages={setPages}
                pagesize={pagesize}
                setPagesize={setPagesize}
                setqQuery={setQ}
                qQuery={q}
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
                queryStringSourcesParams={queryStringSourcesParams}
                freeSearch={freeSearch}
                setFreeSearch={setFreeSearch}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="content">
        <DisplaySearchFilters
          qQuery={q}
          setqQuery={setQ}
          provider={provider}
          setProvider={setProvider}
          instrument={instrument}
          setInstrument={setInstrument}
          wavelengths={wavelengths}
          setWavelengths={setWavelengths}
          reference={q_reference}
          setReference={setQReference}
          sources={sources}
          setSources={setSources}
          freeSearch={freeSearch}
          setFreeSearch={setFreeSearch}
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
