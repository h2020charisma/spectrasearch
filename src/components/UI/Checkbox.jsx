import { useState } from "react";

const inputStyles = {
  width: "18px",
  height: "18px",
  border: "1px solid blue",
  cursor: "pointer",
};
const labelStyles = { display: "flex", alignItems: "center", gap: "8px" };

export default function Checkbox() {
  const [checked, setCheched] = useState(false);
  return (
    <label style={labelStyles} onClick={() => setCheched(!checked)}>
      <input type="checkbox" checked={checked} style={inputStyles} />
      Label Default
    </label>
  );
}
