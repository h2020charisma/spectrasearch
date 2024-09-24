/* eslint-disable react/prop-types */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useLocation } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import useSWR from "swr";
import Chart from "../Chart/Chart";
import SideBarToggle from "../Icons/SideBarToggle";
import ImageSelect from "../ImageSelect/ImageSelect";
import Expander from "../UI/Expander";
import SelectNumber from "../UI/SelectNumber";

import "../../src/App.css";

import fetcher from "../../utils/fetcher";
import Sidebar from "../Sidebar/Sidebar";

import axios from 'axios';

export default function SearchComp({ setDomain }) {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const domainParams = queryParams.get("domain");
  let [open, setOpen] = useState(true);
  let [imageSelected, setImageSelected] = useState(
    domainParams ? domainParams : ""
  );
  
  let isNexusFile = false;

  // const [data, setData] = useState(null);

  const axiosInstance = axios.create({
    baseURL: `${import.meta.env.VITE_BaseURL}`,
    timeout: 1000,
    headers: { 'Content-Type': 'application/json' }
  });

  // Add a request interceptor
axiosInstance.interceptors.request.use(
  function (config) {
    const token = keycloak.token;
    const storedToken = localStorage.getItem('authToken'); // taking auth token from local Storage
     if (token) {
      config.headers.Authorization = `Bearer ${token || storedToken}`;
    }
    return config;
  },
  function (error) {
    // Handle the error
    return Promise.reject(error);
  }
);


  
  let [reference, setReference] = useState("*");
  let [provider, setProvider] = useState("*");
  let [pages, setPages] = useState("0");
  let [pagesize, setPagesize] = useState("10");
  let [qQuery, setqQuery] = useState("*");
  let [instrument, setInstrument] = useState("*");
  let [wavelengths, setWavelengths] = useState("*");

  let [imageData, setImageData] = useState(null);
  let [type, setType] = useState("knnquery");

  const [file, setFile] = useState(null);

  const searchQuery = `${import.meta.env.VITE_BaseURL
    }db/query?q=${qQuery}&img=thumbnail&query_type=text&q_reference=${reference}&q_provider=${provider}&q_instrument=${instrument}&q_wavelength=${wavelengths}&page=${pages}&pagesize=${pagesize}`;

  const fileSearchQuery = `${import.meta.env.VITE_BaseURL
    }db/query?q=${qQuery}&img=thumbnail&query_type=${type}&q_reference=${reference}&q_provider=${provider}&q_instrument=${instrument}&q_wavelength=${wavelengths}&page=${pages}&pagesize=${pagesize}&ann=${imageData?.cdf
    }`;

    // useEffect(() => {
    //   axiosInstance.get(`db/query?q=${qQuery}&img=thumbnail&query_type=text&q_reference=${reference}&q_provider=${provider}&q_instrument=${instrument}&q_wavelength=${wavelengths}&page=${pages}&pagesize=${pagesize}`) // Replace with your API endpoint
    //     .then(response => {
    //       setData(response.data);
    //     })
    //     .catch(error => {
    //       console.error('Error fetching data:', error);
    //     });
    // }, []);

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
      <div>
        <div className="toggleSidebar" onClick={() => setOpen(!open)}>
          <SideBarToggle />
          {/* <h1>Raman Spectra Search</h1> */}
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
        {file && imageData && (
          <div className="imageUploded">
            <img src={imageData && imageData.imageLink} />
          </div>
        )}
        <Expander title="Pages">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <SelectNumber value={pages} setValue={setPages} label="Pages" />
            <SelectNumber
              value={pagesize}
              setValue={setPagesize}
              label="Numbers of Hits"
            />
          </div>
        </Expander>
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
          <Chart imageSelected={imageSelected} setDomain={setDomain}
            isNexusFile={isNexusFile} />
          // </ErrorBoundary>
        ) : (
          <div className="errorMessage">
            <p>No image selected</p>
          </div>
        )}
      </div>
    </div>
  );
}
