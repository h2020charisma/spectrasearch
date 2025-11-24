/* eslint-disable react/prop-types */
import { useState } from "react";
import { Link } from "react-router-dom";
import PreviewDialog from "../PreviewDialog/PreviewDialog";

// eslint-disable-next-line react/prop-types
export default function ImageItem({ img, i, setImageSelectedStore }) {
  const [show, setShow] = useState(false);
  return (
    <div key={i} style={{ position: "relative", marginBottom: "1rem" }}>
      <div
        onClick={() => {
          setImageSelectedStore(img.value);
        }}
        className={`${
          // imageSelected == img.value ? "imageSelected" : "imageNonSelected"
          "imageNonSelected"
        }`}
      >
        <Link to={`/h5web/${img.value}`}>
          <img
            className="imgSelected"
            src={img.imageLink}
            width={170}
            height={"auto"}
            alt={img.text}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
          />
        </Link>
      </div>
      <p className="imgCaption">
        {img?.score && (
          <span
            style={{
              display: "inline-block",
              color: "#D20003",
              fontSize: "12px",
              paddingBottom: "12px",
            }}
          >
            {parseFloat(img.score).toFixed(3)}&nbsp;&nbsp;
          </span>
        )}
      </p>
      <div className="imgDescription">
        <span>
          {img.text.length > 10 ? img.text.substring(0, 9) + " ..." : img.text}
        </span>
        <div
          onClick={() => {
            setImageSelectedStore(img.value);
          }}
        >
          <PreviewDialog img={img.value} />
        </div>
      </div>
      {show && <div className="descriptionHover">{img.text}</div>}
    </div>
  );
}
