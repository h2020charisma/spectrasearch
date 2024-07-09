/* eslint-disable react/prop-types */
import * as Plot from "@observablehq/plot";
// import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

export default function Chart({ imageSelected }) {
  const fetcher = (url) => fetch(url).then((res) => res.json());

  const containerRefOne = useRef();
  const containerRefTwo = useRef();

  const datasetQuery = `${
    import.meta.env.VITE_BaseURL
  }dataset?domain=${imageSelected}&values=True`;

  const { data, error } = useSWR(imageSelected && datasetQuery, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const [dataset, setDataset] = useState(null);
  const [valuesX, setValuesX] = useState([]);
  const [valuesY, setValuesY] = useState([]);

  useEffect(() => {
    data && imageSelected && setDataset(data.datasets[0].key);
  }, [data, imageSelected]);

  useEffect(() => {
    data &&
      data?.datasets.map((k, i) => {
        if (dataset == k.key) {
          setValuesX([...k.value[0]]);
          setValuesY([...k.value[1]]);
        }
      });
  }, [data, dataset]);

  useEffect(() => {
    if (data === undefined) return;

    const plot = Plot.plot({
      caption: "PST",
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

    const plot2 = Plot.plot({
      caption: "Raman Shift [1/cm]",
      grid: true,
      marginLeft: 60,
      color: { scheme: "burd" },
      marks: [
        Plot.axisY({ label: "Normalized", labelAnchor: "center" }),
        Plot.ruleY([0], { stroke: "gray" }),
        Plot.lineX(data && data.datasets[1].value[0], {
          x: data && data.datasets[1].value[0],
          y: data && data.datasets[1].value[1],
          stroke: "blue",
        }),
      ],
    });
    !error && data && dataset & containerRefOne.current.append(plot);
    !error && data && dataset & containerRefTwo.current.append(plot2);
    return () => {
      plot.remove();
      plot2.remove();
    };
  }, [data, valuesX, valuesY, imageSelected, dataset]);

  return (
    <div>
      <div className="datasetsTabs">
        {imageSelected && <span className="fileName">Datasets</span>}
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
      <div ref={containerRefOne} />
      <div ref={containerRefTwo} />
    </div>
  );
}
