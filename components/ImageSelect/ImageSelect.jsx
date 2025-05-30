/* eslint-disable react/prop-types */
import { Link } from "react-router-dom";
import { useImageStore } from "../../store/store";
import PreviewDialog from "../PreviewDialog/PreviewDialog";

export default function ImageSelect({ data }) {
  const setImageSelectedStore = useImageStore(
    (state) => state.setImageSelected
  );

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
            <PreviewDialog />
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
        renderImageSelect
      ) : (
        <p style={{ color: "darkred" }}>Please log in to see search results</p>
      )}
    </div>
  );
}
