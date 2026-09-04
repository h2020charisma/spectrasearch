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
  // Solr doc shape: { type_s:"substance", s_uuid_hs:"NNRG-...", dbtag_hss:["NNRG"], ... }
  // ramanchada-api surfaces s_uuid_hs as item.uuid (the Solr "id" is NOT the substance UUID).
  // SubstancePage derives apiBase from the UUID prefix via tagdbs.js (no env var needed).
  {
    id: "substance",
    kind: "route",
    label: "Substance studies",
    icon: "fa6/FaFlask",
    types: ["substance"],
    route: "/substance",
    idField: "uuid",         // parse_solr_response surfaces s_uuid_hs as item.uuid
    paramName: "substanceId",
    multi: false,
    priority: 10,
  },
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
    enabled: true, 
    priority: 4,
  },
  {
    // name_s/name_hs (surfaced as item.text) is now the human-readable
    // mineral name, not the RRUFF id -- see pipeline_nexus/tasks/
    // read_rruff.py's _substance (name/publicname swap). The RRUFF id
    // instead lives in the Solr id itself: build_papp sets
    // papp.uuid = "RRUF_{rruf_id}_{pairing_key}", and solr_writer's
    // entry2solr appends "/{effect_index}" (e.g.
    // "RRUF_R250095_Abellaite__R250095-1__.../1", surfaced as item.id).
    // A bare id-shaped scan (first match anywhere in the string) is
    // fragile -- pairing_key repeats the id again later (as "R250095-1")
    // and embeds the mineral name, either of which could shift what
    // "first" means if the format ever changes. Anchor to the literal
    // "RRUF_" prefix instead so only the id segment right after it can
    // match, no matter what follows later in the string. RRUFF ids aren't
    // all "R" + digits -- the real corpus also has D-, X-, and RS-prefixed
    // ids (e.g. rruff.net/D120001, rruff.net/X050089), so match any
    // uppercase-letter prefix, not just "R". Sample page:
    // https://www.rruff.net/R250095.
    id: "rruff",
    kind: "external",
    label: "RRUFF",
    icon: "fa6/FaFlask",
    types: ["study", "substance"],
    url: "https://www.rruff.net",
    link: { _default: "/{rruffId}" },
    transform: { rruffId: { from: "value", extract: "(?<=^/RRUFF/)[A-Z]+\\d+" } },
    requires: { field: "value", match: "^/RRUFF/[A-Z]+\\d+" },
    enabled: true,
    priority: 5,
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
  {
    // Curated per-file NeXus view (materials, investigation prose, default
    // plot per NXentry) -- reads the same HSDS domain as h5web via
    // src/pages/NexusOverviewPage.jsx. Shares h5web's `*` fallback slot as a
    // secondary action: same priority, listed after h5web, so the stable
    // sort in viewersForType keeps h5web primary and this follows it.
    id: "nexus-overview",
    kind: "route",
    label: "NeXus overview",
    icon: "fa6/FaTableList",
    types: ["*"],
    route: "/nexus-overview/{itemId}",
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
  if (viewer.paramName) return viewer.paramName;
  return viewer.mode && viewer.mode[item?.type] === "compound" ? "compound" : "item";
}

// href/route for opening one item in a viewer (kind-aware).
export function viewerHref(viewer, item) {
  if (isExternal(viewer)) return buildExternalHref(viewer, item);
  const idVal = item?.[viewer.idField];
  if (idVal == null || idVal === "") return null;
  if (viewer.route.includes("{itemId}")) {
    return viewer.route.replace(
      "{itemId}",
      String(idVal).replace(/^\/+/, "")
    );
  }
  const qs = new URLSearchParams();
  qs.append(paramFor(viewer, item), idVal);
  return `${viewer.route}?${qs.toString()}`;
}

// Internal route for opening many items together (multi-capable route viewers).
export function viewerMultiHref(viewer, items) {
  const qs = new URLSearchParams();
  for (const it of compatibleItemsForViewer(viewer, items)) {
    qs.append(paramFor(viewer, it), it[viewer.idField]);
  }
  return `${viewer.route}?${qs.toString()}`;
}

function resolveWithViewers(viewers, item) {
  return viewers
    .map((viewer) => ({ viewer, href: viewerHref(viewer, item), external: isExternal(viewer) }))
    .filter((r) => r.href != null);
}

// Resolve the viewers applicable to a specific item, each with its concrete href.
// External viewers whose href is null (requires failed / missing placeholder) are dropped.
// viewersForType only omits the "*" default when some OTHER viewer is directly
// registered for the type -- it can't know per-item whether that direct viewer
// will actually resolve (e.g. rruff's requires rejecting a non-RRUFF-shaped id).
// So when direct-match viewers exist but none of them resolve for this specific
// item, fall back to the "*" viewers (h5web) rather than leaving the item with
// no action at all.
export function resolveViewersForItem(item) {
  const resolved = resolveWithViewers(viewersForType(item?.type), item);
  if (resolved.length) return resolved;
  const fallback = VIEWERS.filter((v) => v.enabled !== false && v.types.includes("*"));
  return resolveWithViewers(fallback, item);
}

export function compatibleItemsForViewer(viewer, items) {
  return items.filter((item) => {
    const supportsType =
      viewer.types.includes(item?.type) || viewer.types.includes("*");
    const idVal = item?.[viewer.idField];
    return supportsType && idVal != null && idVal !== "";
  });
}

// Multi-capable viewers able to open at least one item (internal route only).
export function multiViewersForItems(items) {
  return VIEWERS.filter(
    (viewer) => viewer.multi && compatibleItemsForViewer(viewer, items).length > 0
  );
}
