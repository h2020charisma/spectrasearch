// Viewer registry (1:n) — a result `type` can be served by several viewers.
// Each viewer is a React component mounted on an internal route (like h5web).
// h5web (`types: ["*"]`) is the default for any type. See docs/VIEWERS.md.
//
// `mode` maps a result type to how the qu-bounds viewer is addressed:
//   item     – the id is a prediction primary id → show that prediction
//   compound – the id is a chemical (subject) id → resolve & show its predictions
// `multi: true` means the viewer can open several items at once (list route).
const VIEWERS = [
  {
    id: "predictions",
    label: "Predictions",
    icon: "fa6/FaChartLine",
    types: ["prediction", "chemical"],
    route: "/predictions",
    idField: "id",
    mode: { prediction: "item", chemical: "compound" },
    multi: true,
    priority: 10,
  },
  {
    id: "h5web",
    label: "h5web",
    icon: "fa6/FaWaveSquare",
    types: ["*"], // default for every type
    route: "/h5web/{itemId}",
    idField: "value",
    multi: false,
    priority: 0,
  },
];

// Viewers that serve a type, highest priority first. The "*" default (h5web)
// applies ONLY when no viewer is explicitly registered for the type — to offer
// h5web for e.g. chemicals, add "chemical" to its `types` explicitly.
export function viewersForType(type) {
  const direct = VIEWERS.filter((v) => v.types.includes(type));
  const list = direct.length
    ? direct
    : VIEWERS.filter((v) => v.types.includes("*"));
  return [...list].sort((a, b) => b.priority - a.priority);
}

export function primaryViewer(type) {
  return viewersForType(type)[0];
}

function paramFor(viewer, item) {
  return viewer.mode && viewer.mode[item?.type] === "compound" ? "compound" : "item";
}

// Internal route for opening one item in a viewer.
export function viewerHref(viewer, item) {
  const idVal = item?.[viewer.idField] ?? "";
  if (viewer.route.includes("{itemId}")) {
    return viewer.route.replace("{itemId}", idVal);
  }
  const qs = new URLSearchParams();
  qs.append(paramFor(viewer, item), idVal);
  return `${viewer.route}?${qs.toString()}`;
}

// Internal route for opening many items together (multi-capable viewers).
export function viewerMultiHref(viewer, items) {
  const qs = new URLSearchParams();
  for (const it of items) qs.append(paramFor(viewer, it), it?.[viewer.idField] ?? "");
  return `${viewer.route}?${qs.toString()}`;
}

// Multi-capable viewers able to open a mixed set of items.
export function multiViewersForItems(items) {
  const types = new Set(items.map((i) => i.type));
  return VIEWERS.filter(
    (v) => v.multi && [...types].some((t) => v.types.includes(t) || v.types.includes("*"))
  );
}
