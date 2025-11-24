/* eslint-disable react/prop-types */
import { Link } from "react-router-dom";
import { useStore } from "../../store/store";
import PreviewDialog from "../PreviewDialog/PreviewDialog";
import { useState } from "react";
// import TableView from "./TableView";
import DataTable from "../DataTable/DataTable";
import ErrorComp from "../UI/ErrorComp";
import ImageItem from "./ImageItem";

export default function ImageSelect({ data, error, loading }) {
  const tableView = useStore((state) => state.tableView);
  const setImageSelectedStore = useStore((state) => state.setImageSelected);

  const renderImageSelect =
    data &&
    data?.response?.map((img, i) => (
      <ImageItem
        key={i}
        img={img}
        i={i}
        setImageSelectedStore={setImageSelectedStore}
      />
    ));
  return (
    <div className="imageSelectWrap">
      {data && Object.prototype.hasOwnProperty.call(data, "error") && (
        <p>Sorry</p>
      )}
      {data && data?.response.length > 0 ? (
        tableView ? (
          <DataTable data={data?.response} />
        ) : (
          renderImageSelect
        )
      ) : (
        <></>
        // <ErrorComp loading={loading} error={error} />
      )}
    </div>
  );
}
