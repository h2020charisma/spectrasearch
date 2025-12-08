/* eslint-disable react/prop-types */
import { useStore } from "../../store/store";
import DataTable from "../DataTable/DataTable";
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
