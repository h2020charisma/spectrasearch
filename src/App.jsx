import { useState, useRef } from "react";
import SideBarToggle from "../components/Icons/SideBarToggle";
import ImageSelect from "../components/ImageSelect/ImageSelect";
import Expander from "../components/UI/Expander";
import Chart from "../components/Chart/Chart";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import "./App.css";

import { referenceList } from "../data/reference";

import Sidebar from "../components/Sidebar/Sidebar";
const fetcher = (url) => fetch(url).then((res) => res.json());

function App() {
  // let modalRef = useRef();
  let [open, setOpen] = useState(true);
  let [imageSelected, setImageSelected] = useState("");
  let [reference, setReference] = useState("*");
  let [provider, setProvider] = useState("*");
  let [pages, setPages] = useState("0");
  let [pagesize, setPagesize] = useState("10");
  let [qQuery, setqQuery] = useState("PST");

  console.log(imageSelected);

  const metadataQuery = `${
    import.meta.env.VITE_BaseURL
  }query?q=${qQuery}&img=thumbnail&query_type=text&q_reference=${reference}&q_provider=${provider}&page=${pages}&pagesize=${pagesize}`;

  const picturesQuery =
    "https://api.charisma.ideaconsult.net/download?what=thumbnail&domain=/SANDBOX/CSIC-ICV/BWTEK_iRaman/785/PST02_iRPlus785_Z020_020_1300ms.cha&extra=";

  const { data } = useSWR(metadataQuery, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

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
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="content">
        {/* <Expander title="Select Spectra" status={true}>
          <ImageSelect
            data={data}
            imageSelected={imageSelected}
            setImageSelected={setImageSelected}
          />
        </Expander> */}
        <Chart imageSelected={imageSelected} />
      </div>
    </div>
  );
}

export default App;
