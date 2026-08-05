import { useRef } from "react";

export function useMemorizedValue(value) {
  const memorizedValue = useRef(value);

  if (value != null) {
    memorizedValue.current = value;
  }

  return memorizedValue.current;
}
