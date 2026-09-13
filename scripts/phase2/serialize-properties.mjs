function serializeValue(value) {
  const expressionSafe = value.includes("${")
    ? value.replaceAll("\\", "\\\\").replaceAll("${", "\\${")
    : value;
  let serialized = "";
  let leadingWhitespace = true;
  for (const character of expressionSafe) {
    if (character === " " && leadingWhitespace) {
      serialized += "\\ ";
      continue;
    }
    leadingWhitespace = false;
    switch (character) {
      case "\\": serialized += "\\\\"; break;
      case "\t": serialized += "\\t"; break;
      case "\n": serialized += "\\n"; break;
      case "\r": serialized += "\\r"; break;
      case "\f": serialized += "\\f"; break;
      case "=":
      case ":":
      case "#":
      case "!": serialized += `\\${character}`; break;
      default: serialized += character;
    }
  }
  return serialized;
}

export function serializeProperties(properties) {
  return `${Object.entries(properties)
    .map(([name, value]) => `${name}=${serializeValue(String(value))}`)
    .join("\n")}\n`;
}
