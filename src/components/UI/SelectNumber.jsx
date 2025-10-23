/* eslint-disable react/prop-types */
export default function SelectNumber({
  value,
  setValue,
  label,
  founds,
  setPages,
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <p>Shown</p>
      <input
        onChange={(e) => {
          setValue(e.target.value);
          setPages(0);
        }}
        name={label}
        data-cy={label + "-input"}
        type="number"
        min={0}
        value={value}
        style={{
          width: "60px",
          height: "20px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          paddingLeft: "6px",
        }}
      />
      <p>
        of <span style={{ fontWeight: "600" }}>{founds} </span>hits
      </p>
    </div>
  );
}
