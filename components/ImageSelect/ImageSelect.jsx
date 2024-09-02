/* eslint-disable react/prop-types */
import { Navigate } from "react-router-dom";
export default function ImageSelect({ data, imageSelected, setImageSelected }) {

 
  
  const renderImageSelect =
    data &&
    data.map((img, i) => (
      <div
        key={i}
        onClick={() => {
          setImageSelected(img.value);
        }}
        className={`${
          imageSelected == img.value ? "imageSelected" : "imageNonSelected"
        }`}
      >
        {imageSelected && (
          <Navigate to={`?domain=${imageSelected}`} replace={true} />
        )}

        <img src={img.imageLink} width={200} height={"auto"} />
        <p className="imgCaption">{img.text}</p>
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
