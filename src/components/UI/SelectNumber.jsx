/* eslint-disable react/prop-types */
import { useMemorizedValue } from "../../utils/useMemorizedValue";

export default function SelectNumber({
  value,
  setValue,
  label,
  founds,
  setPages,
}) {
  const memorizedFounds = useMemorizedValue(founds);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <p>Shown</p>
      <input
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
            setValue(parsed);
            setPages(0);
          }
        }}
        name={label}
        data-cy={label + "-input"}
        type="number"
        max={100}
        min={1}
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
        of <span style={{ fontWeight: "600" }}>{memorizedFounds} </span>
        hits
      </p>
    </div>
  );
}
