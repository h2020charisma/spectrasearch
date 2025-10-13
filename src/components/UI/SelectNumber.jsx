/* eslint-disable react/prop-types */
export default function SelectNumber({ value, setValue, label }) {
  return (
    <div style={{ displa: "flex", flexDirection: "column" }}>
      <div>
        <p>{label}</p>
        <input
          onChange={(e) => setValue(e.target.value)}
          name={label}
          data-cy={label + "-input"}
          type="number"
          min={0}
          value={value}
          style={{
            width: "80px",
            height: "24px",
            border: "1px solid #ccc",
            paddingLeft: "6px",
          }}
        />
      </div>
    </div>
  );
}
