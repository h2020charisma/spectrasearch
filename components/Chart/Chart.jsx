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

  // console.log(data.datasets[0].value[0]);
  // console.log(data.datasets[0].value[1]);

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
        Plot.lineX(data && data.datasets[0].value[0], {
          x: data && data.datasets[0].value[0],
          y: data && data.datasets[0].value[1],
          stroke: "orange",
        }),
      ],
    });
    const plot2 = Plot.plot({
      caption: "Raman Shift [1/cm]",
      grid: true,
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
    data && containerRefOne.current.append(plot);
    data && containerRefTwo.current.append(plot2);
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
