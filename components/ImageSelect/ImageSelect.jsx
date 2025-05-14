/* eslint-disable react/prop-types */
import { Navigate } from "react-router-dom";
import { useImageStore } from "../../store/store";

export default function ImageSelect({ data, imageSelected, setImageSelected }) {
  const imgSelected = useImageStore((state) => state.imageSelected);

  const setImageSelectedStore = useImageStore(
    (state) => state.setImageSelected
  );

  const renderImageSelect =
    data &&
    data.map((img, i) => (
      <div
        key={i}
        onClick={() => {
          setImageSelected(img.value);
          setImageSelectedStore(img.value);
        }}
        className={`${
          imageSelected == img.value ? "imageSelected" : "imageNonSelected"
        }`}
      >
        {imageSelected && <Navigate to={`/${imageSelected}`} replace={true} />}

        <img src={img.imageLink} width={200} height={"auto"} />
        <p className="imgCaption">
          {img.score && (
            <span style={{ color: "#D20003", fontSize: "12px" }}>
              {parseFloat(img.score).toFixed(3)}&nbsp;&nbsp;
              <span style={{ color: "#000" }}>|</span>&nbsp;&nbsp;
            </span>
          )}
          <span>{img.text}</span>
        </p>
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
        <p style={{ color: "darkred" }}>Sorry, no data avaible</p>
      )}
    </div>
  );
}
