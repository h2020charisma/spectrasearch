/* eslint-disable react/prop-types */
import * as Plot from "@observablehq/plot";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryStringSourcesParams } from "../../utils/useQueryStringSourcesParams";
import useFetch from "../../utils/useFetch";
import { apiUrl } from "../../config";

import { latexToUnicode } from "../../utils/latexToUnicode";
import "katex/dist/katex.min.css";

// import ErrorComp from "../UI/ErrorComp";

// Mirrors SPARSE_NONZERO_MAX in the backend's convertor_service.py, which
// applies the same line-vs-points rule when rendering thumbnails.
const SPARSE_NONZERO_MAX = 50;

export default function Chart({ imageSelected, isNexusFile }) {
  const containerRef = useRef();

  const { querySourcesString } = useQueryStringSourcesParams();

  const datasetQuery = !isNexusFile
    ? apiUrl(
        `db/dataset?domain=${encodeURIComponent(
          imageSelected,
        )}&values=True&${querySourcesString}`,
      )
    : "";

  const { data, loading, error } = useFetch(imageSelected && datasetQuery);

  const [dataset, setDataset] = useState(null);
  const [valuesX, setValuesX] = useState([]);
  const [valuesY, setValuesY] = useState([]);

  // The backend appends a null entry for a study doc with no plottable vector
  // (read_solr_study4dataset sets dataset = None but still appends it), and
  // returns datasets: [] for a domain it can't resolve -- so every access here
  // has to tolerate both.
  const datasets = useMemo(
    () => (data?.datasets ?? []).filter(Boolean),
    [data],
  );

  useEffect(() => {
    if (isNexusFile) return;

    data && imageSelected && setDataset(datasets[0]?.key ?? null);
  }, [data, datasets, imageSelected, isNexusFile]);

  useEffect(() => {
    if (isNexusFile) return;

    const active = datasets.find((k) => k.key === dataset);
    // A dataset entry carries `value` only when the request asked for values
    // and the doc had them; without it there is nothing to plot.
    if (!active?.value?.[0] || !active?.value?.[1]) {
      setValuesX([]);
      setValuesY([]);
      return;
    }
    setValuesX([...active.value[0]]);
    setValuesY([...active.value[1]]);
  }, [data, datasets, dataset, isNexusFile]);

  // Why there is no chart, when there isn't one. The preview plots the vectors
  // Solr indexes for search; the measurement itself lives in the file and stays
  // reachable through the result's viewers (the ResultActions ⋮ menu). So a
  // missing preview chart says nothing about whether there is data -- send the
  // user to the viewers rather than leaving an empty panel that reads as a
  // broken preview.
  const noChartReason = useMemo(() => {
    if (isNexusFile || !data || loading) return null;
    if (error) return null; // the error itself is already reported below
    if (datasets.length === 0) {
      // read_solr_study4dataset found no study doc for this domain, or the one
      // it found carried no vector to plot (it appends a null entry for that).
      return data.annotation?.length
        ? "No preview chart for this study. To see the measured data, use the ⋮ menu on the result and open it in a viewer."
        : "No indexed data was found for this domain. To see the measured data, use the ⋮ menu on the result and open it in a viewer.";
    }
    const active = datasets.find((k) => k.key === dataset);
    if (!active) return null;
    if (!active.value?.[0] || !active.value?.[1]) {
      return "This dataset has no values to preview. To see the measured data, use the ⋮ menu on the result and open it in a viewer.";
    }
    return null;
  }, [data, datasets, dataset, isNexusFile, loading, error]);

  useEffect(() => {
    if (!data) return;
    if (isNexusFile) return;

    const active = datasets.find((k) => k.key === dataset);
    if (!active || valuesX.length === 0 || valuesY.length === 0) return;
    if (noChartReason) return; // the container isn't rendered in that case

    // Pair the x/y columns into rows. Passing the raw arrays as both data and
    // channel values makes Plot fall back on index order, which draws a line
    // that has nothing to do with the values.
    const points = valuesX
      .map((x, i) => ({ x, y: valuesY[i] }))
      .filter((p) => p.y !== undefined);

    // Same rule the thumbnails apply in the backend's doc2spectrum: the dense
    // vectors hold either a resampled spectrum (hundreds of nonzero samples)
    // or a sparse dose-response curve padded into the fixed-length field. Only
    // the former has meaningful continuity between neighbouring samples, so a
    // sparse curve is drawn as points -- a connecting line would invent a
    // trajectory through padding that isn't part of the measurement.
    const nonzero = points.reduce((n, p) => (p.y !== 0 ? n + 1 : n), 0);
    const sparse = nonzero <= SPARSE_NONZERO_MAX;
    const series = sparse ? points.filter((p) => p.y !== 0) : points;

    const plot = Plot.plot({
      // caption: dataset,
      grid: true,
      color: "#454545",
      stroke: "#454545",
      marks: [
        Plot.axisY({
          label: `${latexToUnicode(active?.ytitle)}`,
          labelAnchor: "center",
          marginLeft: 60,
        }),
        Plot.axisX({
          label: `${latexToUnicode(active?.xtitle)}`,
          labelAnchor: "center",
          marginTop: 60,
        }),
        Plot.ruleY([0], { stroke: "gray" }),
        sparse
          ? Plot.dot(series, {
              x: "x",
              y: "y",
              fill: "steelblue",
              r: Math.max(2, Math.min(4, 4 - nonzero / 40)),
            })
          : Plot.line(series, { x: "x", y: "y", stroke: "steelblue" }),
      ],
    });

    // containerRef is null whenever the chart div isn't rendered (isNexusFile),
    // and on the first pass before the ref attaches.
    containerRef.current?.append(plot);

    return () => {
      plot.remove();
    };
  }, [
    data,
    datasets,
    valuesX,
    valuesY,
    imageSelected,
    dataset,
    isNexusFile,
    noChartReason,
  ]);

  return (
    <div className="chartWrap">
      <div className="domainInfo">
        {/* <div className="domainInfoTitle">
          {!isNexusFile && <div className="fileName">Domain</div>}
          <div className="metadataInfoValuePreview">{data && data.domain}</div>
        </div> */}
        {/* <div>
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
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: "16px" }}
            onClick={() => {
              navigate(`/h5web/${imageSelected}`);
              // window.open(`?h5web=${imageSelected}`, "_blank");
              if (!isNexusFile) {
                setDomain(data.domain);
              }
            }}
          >
            Explore in h5web
          </button>
        </div> */}
      </div>
      {/* this section not displayed */}
      {data &&
        !isNexusFile &&
        (data.annotation ?? []).filter(Boolean).map((ann, k) => (
          <div key={k} className="metadataSection">
            {/* <h3 className="metadataTitle">Metadata</h3> */}
            <div className="annotationInfo">
              {ann.sample && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Sample</span>
                  <span className="metadataInfoValuePreview">
                    {" "}
                    {ann.sample}
                  </span>
                </div>
              )}
              {ann.instrument && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Instrument</span>
                  <span className="metadataInfoValuePreview">
                    {" "}
                    {ann.instrument}
                  </span>
                </div>
              )}
              {ann.investigation && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Investigation</span>
                  <span className="metadataInfoValuePreview">
                    {" "}
                    {ann.investigation}
                  </span>
                </div>
              )}
              {ann.laser_power && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Laser power</span>
                  <span className="metadataInfoValuePreview">
                    {" "}
                    {ann.laser_power}
                  </span>
                </div>
              )}
              {ann.optical_path && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Optical path</span>
                  <span className="metadataInfoValuePreview">
                    {" "}
                    {ann.optical_path}
                  </span>
                </div>
              )}
              {ann.provider && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Provider</span>
                  <span className="metadataInfoValuePreview">
                    {" "}
                    {ann.provider}
                  </span>
                </div>
              )}
              {ann.wavelength && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Wavelength</span>
                  <span className="metadataInfoValuePreview">
                    {" "}
                    {ann.wavelength}
                  </span>
                </div>
              )}
              {ann.native_filename && (
                <div className="metadataInfo">
                  <span className="metadataLabel">Native filename</span>
                  <span className="metadataInfoValuePreview">
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
          !isNexusFile &&
          datasets.map((k, i) => (
            <div
              className={`${dataset == k.key ? "datasetActive" : "dataset"}`}
              key={i}
              onClick={() => {
                setDataset(k.key);
              }}
            >
              {(k.key ?? "").replace(/_/g, " ")}
            </div>
          ))}
      </div>
      {!isNexusFile && (
        <>
          {noChartReason ? (
            <div className="chartUnavailable">{noChartReason}</div>
          ) : (
            <div className="chart" ref={containerRef} />
          )}
          {/* <div className="shiftLabel">
            Raman shift (cm<sup>&ndash;1</sup>)
          </div> */}
        </>
      )}
      {/* <ErrorComp loading={loading} error={error} /> */}
    </div>
  );
}
