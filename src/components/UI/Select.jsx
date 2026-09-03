/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import Select, { components } from "react-select";
import Close from "../Icons/Close";

export const ModeSelect = ({
  dataSources,
  similarity,
  setSimilarity,
  resetPage,
}) => {
  const [selectedOption, setSelectedOption] = useState([]);

  useEffect(() => {
    if (dataSources?.similarity) {
      setSelectedOption(() =>
        dataSources?.similarity.map((item) => ({
          label: item?.name,
          value: item?.vector,
        })),
      );
    }
  }, [dataSources, similarity]);

  // Custom clear indicator component
  const CustomClearIndicator = (props) => (
    <components.ClearIndicator {...props}>
      <Close />
    </components.ClearIndicator>
  );

  const customStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? "#00ace1" : "#ced4da",
      boxShadow: state.isFocused ? "0 0 0 1px #00ace1" : "none",
      backgroundColor: state.isSelected
        ? "#ced4da"
        : "light-dark(white, #3d3d3d)", // default background
      fontSize: "0.9rem",
      fontWeight: "500",
      "&:active": {
        borderColor: "#00ace1",
        border: "1px solid #00ace1",
      },
      "&:hover": {
        backgroundColor: "light-dark(white, #3d3d3d)",
        borderColor: state.isFocused ? "#00ace1" : "#ced4da",
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#00ace1" // selected option color
        : state.isFocused
          ? "light-dark(white, #ccc)" // hover/focused color
          : "light-dark(white, #2d2d2d)", // default background
      color: state.isSelected
        ? "light-dark(white, #3d3d3d)"
        : "light-dark(white, #a1a1a1)", // text color
      fontSize: "1rem",
      fontWeight: "500",
      padding: "10px 15px",
      cursor: "pointer",
      maxHeight: "250px",
    }),
  };

  return (
    <Select
      options={selectedOption}
      value={
        similarity?.name
          ? { label: similarity?.name, value: similarity?.vector }
          : null
      }
      onChange={(option) => {
        const similarityState = option
          ? { name: option.label, vector: option.value }
          : { name: "", vector: "" };

        setSimilarity(similarityState);
        resetPage?.();
      }}
      components={{ ClearIndicator: CustomClearIndicator }}
      isClearable
      isSearchable
      styles={customStyles}
      placeholder="Select similarity..."
    />
  );
};
