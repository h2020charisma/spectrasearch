export function latexToUnicode(str) {
  if (!str) return "";

  // Strip $ symbols
  str = str.replace(/\$/g, "");

  // Convert \mathrm{...} → plain text
  str = str.replace(/\\mathrm\{([^}]+)\}/g, (_, text) => text);

  // Superscripts: ^{-1}, ^{2}, etc.
  const superscriptMap = {
    0: "⁰",
    1: "¹",
    2: "²",
    3: "³",
    4: "⁴",
    5: "⁵",
    6: "⁶",
    7: "⁷",
    8: "⁸",
    9: "⁹",
    "-": "⁻",
    "+": "⁺",
  };
  str = str.replace(/\^\{(-?\d+)\}/g, (_, num) =>
    [...num].map((c) => superscriptMap[c] || c).join("")
  );

  // Subscripts: _{2}, _{10}, etc.
  const subscriptMap = {
    0: "₀",
    1: "₁",
    2: "₂",
    3: "₃",
    4: "₄",
    5: "₅",
    6: "₆",
    7: "₇",
    8: "₈",
    9: "₉",
    "-": "₋",
    "+": "₊",
  };
  str = str.replace(/_\{(\d+)\}/g, (_, num) =>
    [...num].map((c) => subscriptMap[c] || c).join("")
  );

  return str;
}
