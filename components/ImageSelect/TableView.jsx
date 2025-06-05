/* eslint-disable react/prop-types */
import { useState } from "react";
import PreviewDialog from "../PreviewDialog/PreviewDialog";

export default function TableView({ data }) {
  const renderTable =
    data &&
    data.map((img, i) => (
      <div key={i} className="tableRowWrap">
        <TableRowHover img={img} />
        <PreviewDialog img={img.value} />
      </div>
    ));

  return <div className="tableBody">{renderTable}</div>;
}

const TableRowHover = ({ img }) => {
  const [hoveredRow, setHoveredRow] = useState(false);
  return (
    <div
      className="tableRow"
      onMouseEnter={() => setHoveredRow(true)}
      onMouseLeave={() => setHoveredRow(false)}
    >
      <div style={{ fontSize: "14px", color: "#0b5990" }}>{img.text}</div>
      <div style={{ fontSize: "smaller" }}>{img.value}</div>
      <div className="tableImage">
        {hoveredRow && (
          <img
            className="imgSelected"
            src={img.imageLink}
            width={200}
            height={"auto"}
            alt={img.text}
          />
        )}
      </div>
    </div>
  );
};
