/* eslint-disable react/prop-types */
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import Box from "./Box";
import PreviewDialog from "../PreviewDialog/PreviewDialog";
import ChartIcon from "../Icons/ChartIcon";

const columns = [
  {
    header: "Text",
    accessorKey: "text",
    cell: (props) => props.getValue().trim(),
  },
  {
    header: "Score",
    accessorKey: "score",
    cell: (props) =>
      props.getValue() ? (
        <span style={{ color: "#D20003", fontSize: "12px" }}>
          {props.getValue().toFixed(3).trim()}
        </span>
      ) : (
        "no score"
      ),
  },
  {
    header: "Value",
    accessorKey: "value",
    cell: (props) => (
      <Link
        to={`/h5web/${props.getValue()}`}
        target="_blank"
        style={{ color: "#5b5b5b" }}
      >
        {props.getValue()}
      </Link>
    ),
  },
  {
    accessorKey: "value",
    cell: (props) => <PreviewDialog img={props.getValue()} />,
  },
];

export default function DataTable({ data }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });
  //   console.log(table.getRowModel().rows[0].original.value);

  return (
    <Box className="table" w={table.getTotalSize()}>
      {table.getHeaderGroups().map((headerGroup) => (
        <Box key={headerGroup.id} className="tr">
          {headerGroup.headers.map((header) => (
            <Box
              key={header.id}
              className="th"
              w={header.getSize()}
              //   style={{ width: `${header.getSize()}px` }}
            >
              {header.isPlaceholder ? null : (
                <Box>
                  {header.column.columnDef.header}
                  <Box
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={`resizer ${
                      header.column.getIsResizing() ? "isResizing" : ""
                    }`}
                  ></Box>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      ))}
      {table.getRowModel().rows.map((row, idx) => {
        return (
          <Box className="tr" key={row.id}>
            {idx + 1}

            <TableRowHover img={row.original} />
            {row.getVisibleCells().map((cell) => {
              return (
                <Box className="td" w={cell.column.getSize()} key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}

const TableRowHover = ({ img }) => {
  const [hoveredRow, setHoveredRow] = useState(false);
  return (
    <div
      className="tableRow"
      onMouseEnter={() => setHoveredRow(true)}
      onMouseLeave={() => setHoveredRow(false)}
    >
      <ChartIcon />
      <div className="tableImage">
        {hoveredRow && (
          <Link to={`/h5web/${img.value}`} target="_blank">
            <img
              className="imgSelected"
              src={img.imageLink}
              width={200}
              height={"auto"}
              alt={img.text}
            />
          </Link>
        )}
      </div>
    </div>
  );
};
