import { useState } from "react";

export default function useDynamicLink({ params, path }) {
  const [link, setLink] = useState("");

  if (params) {
    setLink(`https://enanomapper.adma.ai/templates/`);
  } else {
    setLink(`h5web?${path}`);
  }

  return { link };
}
