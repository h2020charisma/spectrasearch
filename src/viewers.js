// Viewer registry (1:n) — a result `type` can be served by several viewers.
// Two kinds:
//   - kind:"route"    → an embedded React component on an internal route (h5web, qu-bounds)
//   - kind:"external" → a configurable link to a website with a query (aopmapper, AOP-Wiki, CompTox)
// h5web (`types:["*"]`) is the default for any type with no registered viewer. See docs/VIEWERS.md.
//
// `mode` (route viewers) maps a result type to how the qu-bounds viewer is addressed:
//   item / compound — prediction id vs chemical (subject) id.
// `multi:true` (route viewers) means the viewer can open several items at once (list route).
//
// External viewers are declarative: `url` (the site) + `link` (path/query per result type, with
// {placeholders} from the result item) + optional `requires`/`transform`. Edit URLs here.

const VIEWERS = [
  {
    id: "predictions",
    kind: "route",
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
    id: "aopmapper",
    kind: "external",
    label: "AOP mapper",
    icon: "fa6/FaProjectDiagram",
    types: [
      "aop", "key_event", "assay", "stressor",
      "biological_object", "biological_action", "chemical",
    ],
    url: "https://aop.adma.ai",
    link: {
      chemical: "/?q={text}",
      _default: "/?fieldId={id}&graph=AOP",
    },
    priority: 8,
  },
  {
    id: "aopwiki",
    kind: "external",
    label: "AOP-Wiki",
    icon: "fa6/FaBookOpen",
    types: ["aop", "key_event"], // assays/stressors are not in AOP-Wiki, only in aopmapper
    url: "https://aopwiki.org",
    link: {
      aop: "/aops/{idnum}",
      key_event: "/events/{idnum}",
    },
    transform: { idnum: { from: "id", extract: "\\d+" } },
    priority: 4,
  },
  {
    id: "comptox",
    kind: "external",
    label: "CompTox",
    icon: "fa6/FaFlask",
    types: ["chemical"],
    url: "https://comptox.epa.gov/dashboard",
    link: { _default: "/chemical/details/{id}" },
    requires: { field: "id", match: "^DTXSID" }, // only when the id is a DTXSID
    enabled: false, // EPA CompTox currently down — flip to true to re-enable
    priority: 4,
  },
  {
    id: "h5web",
    kind: "route",
    label: "h5web",
    icon: "fa6/FaWaveSquare",
    types: ["*"], // default for every type with no registered viewer
    route: "/h5web/{itemId}",
    idField: "value",
    multi: false,
    priority: 0,
  },
];

export function isExternal(viewer) {
  return viewer?.kind === "external";
}

// Viewers that serve a type, highest priority first. The "*" default (h5web)
// applies ONLY when no viewer is explicitly registered for the type.
export function viewersForType(type) {
  const enabled = VIEWERS.filter((v) => v.enabled !== false);
  const direct = enabled.filter((v) => v.types.includes(type));
  const list = direct.length ? direct : enabled.filter((v) => v.types.includes("*"));
  return [...list].sort((a, b) => b.priority - a.priority);
}

export function primaryViewer(type) {
  return viewersForType(type)[0];
}

// ---- external link building ------------------------------------------------

function resolvePlaceholderValue(name, item, transform) {
  const t = transform?.[name];
  if (t) {
    let v = item?.[t.from];
    if (v == null) return undefined;
    v = String(v);
    if (t.extract) {
      const m = v.match(new RegExp(t.extract));
      v = m ? m[0] : undefined;
    }
    return v;
  }
  return item?.[name] != null ? String(item[name]) : undefined;
}

// Build the external URL for an item, or null if it doesn't apply (requires
// failed, or a needed placeholder is missing) — null hides the action.
export function buildExternalHref(viewer, item) {
  if (viewer.requires) {
    const val = item?.[viewer.requires.field];
    if (!val || !new RegExp(viewer.requires.match).test(String(val))) return null;
  }
  const tmpl = viewer.link?.[item?.type] || viewer.link?._default;
  if (!tmpl) return null;

  let missing = false;
  const path = tmpl.replace(/\{(\w+)\}/g, (_, name) => {
    const v = resolvePlaceholderValue(name, item, viewer.transform);
    if (v == null) {
      missing = true;
      return "";
    }
    return encodeURIComponent(v);
  });
  if (missing) return null;
  return `${viewer.url}${path}`;
}

// ---- route link building (internal viewers) --------------------------------

function paramFor(viewer, item) {
  return viewer.mode && viewer.mode[item?.type] === "compound" ? "compound" : "item";
}

// href/route for opening one item in a viewer (kind-aware).
export function viewerHref(viewer, item) {
  if (isExternal(viewer)) return buildExternalHref(viewer, item);
  const idVal = item?.[viewer.idField] ?? "";
  if (viewer.route.includes("{itemId}")) {
    return viewer.route.replace("{itemId}", idVal);
  }
  const qs = new URLSearchParams();
  qs.append(paramFor(viewer, item), idVal);
  return `${viewer.route}?${qs.toString()}`;
}

// Internal route for opening many items together (multi-capable route viewers).
export function viewerMultiHref(viewer, items) {
  const qs = new URLSearchParams();
  for (const it of items) qs.append(paramFor(viewer, it), it?.[viewer.idField] ?? "");
  return `${viewer.route}?${qs.toString()}`;
}

// Resolve the viewers applicable to a specific item, each with its concrete href.
// External viewers whose href is null (requires failed / missing placeholder) are dropped.
export function resolveViewersForItem(item) {
  return viewersForType(item?.type)
    .map((viewer) => ({ viewer, href: viewerHref(viewer, item), external: isExternal(viewer) }))
    .filter((r) => r.href != null);
}

// Multi-capable viewers able to open a mixed set of items (internal route only).
export function multiViewersForItems(items) {
  const types = new Set(items.map((i) => i.type));
  return VIEWERS.filter(
    (v) => v.multi && [...types].some((t) => v.types.includes(t) || v.types.includes("*"))
  );
}
