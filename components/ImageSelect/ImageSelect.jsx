/* eslint-disable react/prop-types */
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useImageStore } from "../../store/store";
import OpenNew from "../Icons/OpenNew";

export default function ImageSelect({ data, imageSelected, setImageSelected }) {
  const imgSelected = useImageStore((state) => state.imageSelected);
  const navigate = useNavigate();

  const setImageSelectedStore = useImageStore(
    (state) => state.setImageSelected
  );

  const renderImageSelect =
    data &&
    data.map((img, i) => (
      <div key={i}>
        {/* {imageSelected && (
          // <Navigate to={`/hits/${imageSelected}`} replace={true} />
          // <Navigate to={`/h5web/${img.value}`} replace={true} />
        )} */}
        <div
          onClick={() => {
            setImageSelected(img.value);
            setImageSelectedStore(img.value);
            if (imageSelected) navigate(`/h5web/${img.value}`);
          }}
          className={`${
            // imageSelected == img.value ? "imageSelected" : "imageNonSelected"
            "imageNonSelected"
          }`}
        >
          <img
            className="imgSelected"
            src={img.imageLink}
            width={200}
            height={"auto"}
          />
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
          <button
            className="exploreH5web"
            onClick={() => {
              // setImageSelected(img.value);
              // setImageSelectedStore(img.value);
              navigate(`/hits/${img.value}`);
            }}
          >
            <span>Preview</span>
            {/* <OpenNew /> */}
          </button>
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
