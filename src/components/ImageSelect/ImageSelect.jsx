/* eslint-disable react/prop-types */
import { Link } from "react-router-dom";
import { useStore } from "../../store/store";
import PreviewDialog from "../PreviewDialog/PreviewDialog";
// import TableView from "./TableView";
import DataTable from "../DataTable/DataTable";
import ErrorComp from "../UI/ErrorComp";

export default function ImageSelect({ data, error, loading }) {
  const tableView = useStore((state) => state.tableView);
  const setImageSelectedStore = useStore((state) => state.setImageSelected);

  const renderImageSelect =
    data &&
    data.map((img, i) => (
      <div key={i}>
        <div
          onClick={() => {
            setImageSelectedStore(img.value);
          }}
          className={`${
            // imageSelected == img.value ? "imageSelected" : "imageNonSelected"
            "imageNonSelected"
          }`}
        >
          <Link to={`/h5web/${img.value}`} target="_blank">
            <img
              className="imgSelected"
              src={img.imageLink}
              width={200}
              height={"auto"}
            />
          </Link>
        </div>
        <p className="imgCaption">
          {img.score && (
            <span style={{ color: "#D20003", fontSize: "12px" }}>
              {parseFloat(img.score).toFixed(3)}&nbsp;&nbsp;
              <span style={{ color: "#000" }}>|</span>&nbsp;&nbsp;
            </span>
          )}
        </p>
        <div className="imgDiscription">
          <span>{img.text}</span>
          <div
            onClick={() => {
              setImageSelectedStore(img.value);
            }}
          >
            <PreviewDialog img={img.value} />
          </div>
        </div>
      </div>
    ));
  return (
    <div className="imageSelectWrap">
      {data && Object.prototype.hasOwnProperty.call(data, "error") && (
        <p>Sorry</p>
      )}
      {data && data.length > 0 ? (
        tableView ? (
          <DataTable data={data} />
        ) : (
          renderImageSelect
        )
      ) : (
        <ErrorComp loading={loading} error={error} />
      )}
    </div>
  );
}
