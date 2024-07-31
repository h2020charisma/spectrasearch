/* eslint-disable react/prop-types */
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";

export default function Chart({ imageSelected }) {
  const fetcher = (url) => fetch(url).then((res) => res.json());

  const containerRef = useRef();
  const navigate = useNavigate();

  const datasetQuery = `${
    import.meta.env.VITE_BaseURL
  }dataset?domain=${imageSelected}&values=True`;

  const { data } = useSWR(imageSelected && datasetQuery, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const [copied, setCopied] = useState(false);

  setTimeout(() => {
    setCopied(false);
  }, 3000);

  const urlToCopy = import.meta.env.PROD
    ? `${window.location.href}`
    : `http://localhost:5173/search?domain=${imageSelected}`;

  const copyLink = () => {
    imageSelected && navigator.clipboard.writeText(urlToCopy);
  };

  const [dataset, setDataset] = useState(null);
  const [valuesX, setValuesX] = useState([]);
  const [valuesY, setValuesY] = useState([]);

  useEffect(() => {
    data && imageSelected && setDataset(data?.datasets[0].key);
  }, [data, imageSelected]);

  useEffect(() => {
    data &&
      data?.datasets.map((k) => {
        if (dataset === k.key) {
          setValuesX([...k.value[0]]);
          setValuesY([...k.value[1]]);
        }
      });
  }, [data, dataset]);

  useEffect(() => {
    if (data === undefined) return;

    const plot = Plot.plot({
      // caption: dataset,
      grid: true,
      color: { scheme: "burd" },
      marks: [
        Plot.axisY({
          label: "Raw Counts",
          labelAnchor: "center",
          marginLeft: 60,
        }),
        Plot.ruleY([0], { stroke: "gray" }),
        Plot.lineX(valuesX, {
          x: valuesX,
          y: valuesY,
          stroke: "orange",
        }),
      ],
    });

    data && dataset & containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [data, valuesX, valuesY, imageSelected, dataset]);

  return (
    <div className="chartWrap">
      <div className="domainInfo">
        <div>
          <span className="fileName">Domain</span>
          <span className="metadataInfoValue">{data && data.domain}</span>
        </div>
        <div>
          <button
            className="shareBtn"
            onClick={() => {
              copyLink();
              setCopied(true);
            }}
          >
            {copied ? "Copied to clipboard" : "Share a link"}
          </button>
          <button
            className="shareBtn"
            style={{ marginLeft: "16px" }}
            onClick={() => navigate(`?h5web=${imageSelected}`)}
          >
            Explore in h5web
          </button>
        </div>
      </div>
      {data &&
        data.annotation.map((ann, k) => (
          <div key={k} className="metadataSection">
            {/* <h3 className="metadataTitle">Metadata</h3> */}
            <div className="annotationInfo">
              {ann.sample && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Sample</span>
                  <span className="metadataInfoValue"> {ann.sample}</span>
                </div>
              )}
              {ann.instrument && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Instrument</span>
                  <span className="metadataInfoValue"> {ann.instrument}</span>
                </div>
              )}
              {ann.investigation && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Investigation</span>
                  <span className="metadataInfoValue">
                    {" "}
                    {ann.investigation}
                  </span>
                </div>
              )}
              {ann.laser_power && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Laser power</span>
                  <span className="metadataInfoValue"> {ann.laser_power}</span>
                </div>
              )}
              {ann.optical_path && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Optical path</span>
                  <span className="metadataInfoValue"> {ann.optical_path}</span>
                </div>
              )}
              {ann.provider && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Provider</span>
                  <span className="metadataInfoValue"> {ann.provider}</span>
                </div>
              )}
              {ann.wavelength && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Wavelength</span>
                  <span className="metadataInfoValue"> {ann.wavelength}</span>
                </div>
              )}
              {ann.native_filename && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Native filename</span>
                  <span className="metadataInfoValue">
                    {ann.native_filename}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      <div className="datasetsTabs">
        {/* {imageSelected && <span className="fileName">Datasets</span>} */}
        {data &&
          data?.datasets.map((k, i) => (
            <p
              className={`${dataset == k.key ? "datasetActive" : "dataset"}`}
              key={i}
              onClick={() => {
                setDataset(k.key);
              }}
            >
              {k.key.replace(/_/g, " ")}
            </p>
          ))}
      </div>
      <div ref={containerRef} />
      <div className="shiftLabel">
        Raman shift (cm<sup>&ndash;1</sup>)
      </div>
    </div>
  );
}
