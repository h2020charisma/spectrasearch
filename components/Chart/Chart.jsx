/* eslint-disable react/prop-types */
import * as Plot from "@observablehq/plot";
// import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { aapl } from "../../data/placeholder";

import dataset from "../../data/sample.json";
// https://api-dev.charisma.ideaconsult.net/dataset?domain=/SANDBOX/CSIC-ICV/BWTEK_iRaman/785/PST02_iRPlus785_Z020_010_1300ms.cha&values=True

export default function Chart({ imageSelected }) {
  const fetcher = (url) => fetch(url).then((res) => res.json());

  const containerRefOne = useRef();
  const containerRefTwo = useRef();
  // const [data, setData] = useState(aapl);

  const datasetQuery = `${
    import.meta.env.VITE_BaseURL
  }dataset?domain=${imageSelected}&values=True`;

  const { data } = useSWR(imageSelected && datasetQuery, fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  console.log(imageSelected);

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
          // marginLeft: "240px",
        }),
        Plot.ruleY([0], { stroke: "gray" }),
        Plot.lineX(dataset.datasets[0].value[1], {
          x: dataset.datasets[0].value[0],
          y: dataset.datasets[0].value[1],
          stroke: "orange",
        }),
        // Plot.dot(data, { x: "Date", y: "Close", stroke: "Close" }),
      ],
    });
    const plot2 = Plot.plot({
      caption: "Raman Shift [1/cm]",

      color: { scheme: "burd" },
      marks: [
        Plot.frame({ fill: "#eaeaea" }),
        Plot.axisY({ label: "Normalized", labelAnchor: "center" }),
        Plot.gridX({ stroke: "white", strokeOpacity: 1 }),
        Plot.gridY({ stroke: "white", strokeOpacity: 1 }),
        Plot.ruleY([0], { stroke: "gray" }),
        Plot.lineX(dataset.datasets[0].value[1], {
          x: dataset.datasets[1].value[0],
          y: dataset.datasets[1].value[1],
          stroke: "blue",
        }),
        // Plot.dot(data, { x: "Date", y: "Close", stroke: "Close" }),
      ],
    });
    containerRefOne.current.append(plot);
    containerRefTwo.current.append(plot2);
    return () => {
      plot.remove();
      plot2.remove();
    };
  }, [data]);
  return (
    <>
      <div ref={containerRefOne} />
      <div ref={containerRefTwo} />
    </>
  );
}
