/* eslint-disable react/prop-types */
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  getCoreRowModel,
  useReactTable,
  flexRender,
  getFilteredRowModel,
} from "@tanstack/react-table";
import Box from "./Box";
import PreviewDialog from "../PreviewDialog/PreviewDialog";
import ChartIcon from "../Icons/ChartIcon";

const columns = [
  {
    header: "No",
    accessorKey: "",
    cell: (props) => <span>{props.row.index + 1}</span>,
  },
  {
    header: "Text",
    accessorKey: "text",
    cell: (props) => props.getValue().trim(),
    size: 100,
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
        <span>&mdash;</span>
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
    header: "Preview",
    accessorKey: "preview",
    cell: (props) => <PreviewDialog img={props.getValue()} />,
  },
];

export default function DataTable({ data }) {
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange",
    state: {
      columnVisibility,
      globalFilter,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="tableContainer">
      <div className="columnVisibilityCheckboxes">
        {table.getAllLeafColumns().map((column) => {
          if (column.columnDef.header !== "Preview") {
            return (
              <div key={column.id} className="columnVisibilityCheckbox">
                <label
                  className={`${
                    column.getIsVisible() ? "col-visible" : "col-hidden"
                  }`}
                >
                  <input
                    {...{
                      type: "checkbox",
                      checked: column.getIsVisible(),
                      onChange: column.getToggleVisibilityHandler(),
                      disabled: !column.getCanHide(),
                    }}
                  />{" "}
                  {column.columnDef.header}
                </label>
              </div>
            );
          }
        })}
      </div>
      <div className="global-filters">
        <input
          className="global-filter-input"
          value={globalFilter}
          onChange={(e) => table.setGlobalFilter(String(e.target.value))}
          placeholder="Search..."
        />
      </div>
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="tr">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className={`th header-${header.column.columnDef.header}`}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="tr">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="td">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map((header) => (
                <th key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.footer,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
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
