/* eslint-disable react/prop-types */
import { useState } from "react";
import { Link } from "react-router-dom";
import PreviewDialog from "../PreviewDialog/PreviewDialog";

// eslint-disable-next-line react/prop-types
export default function ImageItem({ img, i, setImageSelectedStore }) {
  const [show, setShow] = useState(false);

  function breakLine(str) {
    return str.length > 40
      ? str.slice(0, 20) + "<br>" + str.slice(0, 20) + "<br>" + str.slice(40)
      : str;
  }

  return (
    <div
      key={i}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div style={{ position: "relative" }}>
        <div
          onClick={() => {
            setImageSelectedStore(img.value);
          }}
          className={`${show ? "imageNonSelectedHover" : "imageNonSelected"}`}
        >
          <Link to={`h5web${img.value}`}>
            <img
              className="imgSelected"
              src={img.imageLink}
              width={170}
              height={"auto"}
              alt={img.text}
            />
          </Link>
        </div>

        <div className="imgDescription">
          <span>
            {/* {img.text.length > 22 ? img.text.slice(0, 21) + " ..." : img.text} */}
            {img.text}
          </span>
          <div
            onClick={() => {
              setImageSelectedStore(img.value);
            }}
          >
            {show && (
              <div className="previewBtnIcon">
                <PreviewDialog img={img.value} />
              </div>
            )}
          </div>
        </div>
        {show && (
          <Link to={`h5web${img.value}`}>
            <div
              className="descriptionHover"
              dangerouslySetInnerHTML={{ __html: img.text }}
              style={
                img.text.length > 27
                  ? { textAlign: "left" }
                  : { textAlign: "center" }
              }
            />
          </Link>
        )}
      </div>
      <p className="imgCaption">
        {img?.score && (
          <span
            style={{
              display: "inline-block",

              fontSize: "12px",
              paddingBottom: "12px",
            }}
          >
            {parseFloat(img.score).toFixed(3)}&nbsp;&nbsp;
          </span>
        )}
      </p>
    </div>
  );
}
