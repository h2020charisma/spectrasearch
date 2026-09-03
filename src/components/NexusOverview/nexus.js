// A JavaScript port of the *reading* half of pyambit.nexus_plot, driven by an
// @h5web/app `DataProviderApi` (`api.getEntity`, `api.getValue`,
// `api.getAttrValues`). It produces, per open NeXus file, the same facts the
// import_pipeline `corpus_overview` task renders in Python:
//
//   * `substanceNames`  -- every material the file carries (test items and the
//     controls / vehicles / blanks alongside them; the file does not mark
//     which is which).
//   * `entryMetadata`   -- per NXentry: material, method, and the shared
//     investigation label (title + free-text description), read as a field or
//     an attribute, and resolved by `collection_identifier` when the entry
//     carries no `investigation` link.
//   * `defaultNxData` / `resolvePlot` -- follow the NeXus `@default` chain to
//     the group a viewer would plot, and reduce its signal to a 1-D series
//     (optionally replicate-aware). Anything higher-dimensional is left to
//     h5web rather than half-drawn here.
//
// Everything is framework-free and async so it can be unit-tested against a
// mock api and run in one pass rather than through per-node React suspense.

const REPLICATE_AXES = new Set(["replicate", "experiment", "run", "repeat"]);
const MAX_DEFAULT_DEPTH = 12;

/** A NeXus/HDF5 attribute value as a trimmed string, or "" when absent. */
export function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (ArrayBuffer.isView(value) || Array.isArray(value)) {
    const flat = flatten(value);
    return flat.length === 1 ? asText(flat[0]) : flat.map(asText).join(", ");
  }
  return String(value);
}

/** `attrs.NX_class`, normalised (h5web hands some providers a byte array). */
function nxClass(attrValues) {
  return asText(attrValues?.NX_class);
}

/** Flatten a typed array or arbitrarily nested array into a plain JS array. */
export function flatten(value) {
  if (value == null) return [];
  if (typeof value === "string") return [value];
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (!Array.isArray(value)) return [value];
  const out = [];
  for (const item of value) {
    if (Array.isArray(item) || ArrayBuffer.isView(item)) out.push(...flatten(item));
    else out.push(item);
  }
  return out;
}

/** Flattened numbers, with anything non-finite coerced to NaN. */
export function toNumbers(value) {
  return flatten(value).map((v) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : NaN;
  });
}

function isGroup(entity) {
  return entity?.kind === "group";
}

function isDataset(entity) {
  return entity?.kind === "dataset";
}

function childNamed(group, name) {
  return group?.children?.find((c) => c.name === name);
}

async function safeEntity(api, path) {
  try {
    return await api.getEntity(path);
  } catch {
    return null;
  }
}

async function safeAttrs(api, entity) {
  if (!entity) return {};
  try {
    return (await api.getAttrValues(entity)) || {};
  } catch {
    return {};
  }
}

async function datasetValue(api, dataset) {
  if (!isDataset(dataset)) return undefined;
  try {
    return await api.getValue({ dataset });
  } catch {
    return undefined;
  }
}

/**
 * A child from `childNamed` is a stub: it carries `kind` / `path` / an id,
 * but a group has no `children` and a dataset has no `shape` until fetched.
 * Re-read it whenever those are about to be used.
 */
async function realized(api, stub) {
  if (!stub) return null;
  if (stub.kind === "group" && stub.children) return stub;
  if (stub.kind === "dataset" && stub.shape !== undefined) return stub;
  return (await safeEntity(api, stub.path)) || stub;
}

/**
 * The value of a name that NeXus writers store either as a child field or as a
 * same-named attribute (title / description on the investigation NXcite group,
 * substance publicname, ...). Field first, then attribute -- matching
 * pyambit.nexus_parser.investigation_from_nexus.
 */
async function fieldOrAttr(api, group, groupAttrs, name) {
  const child = childNamed(group, name);
  if (isDataset(child)) {
    const text = asText(await datasetValue(api, child));
    if (text) return text;
  }
  return asText(groupAttrs?.[name]);
}

/** The `units` attribute of an axis/signal dataset, appended once. */
function labelWithUnit(name, unit) {
  const base = asText(name) || "value";
  const u = asText(unit);
  if (!u || base.toLowerCase().includes(u.toLowerCase())) return base;
  return `${base} (${u})`;
}

// --------------------------------------------------------------------------
// materials
// --------------------------------------------------------------------------

/**
 * Every material in the file, by name: the `publicname` (else the `name`
 * field, else the group name) of each entry in the shared `substance` group,
 * in file order.
 */
export async function substanceNames(api, root) {
  const stub = childNamed(root, "substance");
  if (!stub) return [];
  const group = isGroup(stub) && stub.children ? stub : await safeEntity(api, stub.path);
  if (!isGroup(group)) return [];

  const groups = (group.children ?? []).filter(isGroup);
  return Promise.all(
    groups.map(async (stub) => {
      const node = await realized(api, stub);
      const a = await safeAttrs(api, node);
      return (
        (await fieldOrAttr(api, node, a, "publicname")) ||
        (await fieldOrAttr(api, node, a, "name")) ||
        node.name
      );
    }),
  );
}

// --------------------------------------------------------------------------
// entries and their metadata
// --------------------------------------------------------------------------

/**
 * Every NXentry group in an open file. The shared `substance` and
 * `investigation` groups are not NXentry, so they are skipped.
 */
export async function listEntries(api, root) {
  const entries = [];
  for (const child of root.children ?? []) {
    if (!isGroup(child)) continue;
    const a = await safeAttrs(api, child);
    if (nxClass(a) === "NXentry") {
      entries.push(child.children ? child : await safeEntity(api, child.path));
    }
  }
  return entries.filter(Boolean);
}

/** material / method / investigation label for one NXentry. */
export async function entryMetadata(api, root, entry) {
  const meta = { name: entry.name };

  const sample = await realized(api, childNamed(entry, "sample"));
  if (sample) {
    const sa = await safeAttrs(api, sample);
    const sUuid = asText(sa.uuid);
    if (sUuid) {
      meta.substanceUuid = sUuid;
      const ref = await safeEntity(api, `/substance/${sUuid}`);
      if (ref) {
        const ra = await safeAttrs(api, ref);
        meta.material =
          (await fieldOrAttr(api, ref, ra, "publicname")) ||
          (await fieldOrAttr(api, ref, ra, "name")) ||
          sUuid;
      }
    }
    const providerField = childNamed(sample, "provider");
    if (isDataset(providerField)) {
      meta.provider = asText(await datasetValue(api, providerField));
    }
  }

  const doc = childNamed(entry, "experiment_documentation");
  if (doc) {
    const da = await safeAttrs(api, doc);
    meta.method = asText(da.method);
  }

  const cid = childNamed(entry, "collection_identifier");
  if (isDataset(cid)) meta.investigationUuid = asText(await datasetValue(api, cid));

  let inv = null;
  const invLink = childNamed(entry, "investigation");
  if (invLink) inv = await safeEntity(api, invLink.path);
  if (!isGroup(inv) && meta.investigationUuid) {
    inv = await safeEntity(api, `/investigation/${meta.investigationUuid}`);
  }
  if (isGroup(inv)) {
    const ia = await safeAttrs(api, inv);
    meta.investigation = await fieldOrAttr(api, inv, ia, "title");
    meta.investigationDescription = await fieldOrAttr(api, inv, ia, "description");
  }

  return meta;
}

// --------------------------------------------------------------------------
// the default plot
// --------------------------------------------------------------------------

async function isNxData(api, node) {
  return isGroup(node) && nxClass(await safeAttrs(api, node)) === "NXdata";
}

/** First descendant NXdata group with a named `signal`, breadth-first. The
 *  NeXus "find plottable data" fallback for a file that carries no `@default`
 *  chain -- the CHARISMA / ramanchada writers often don't. */
async function firstNxData(api, group, depth = 0) {
  if (depth > 6 || !isGroup(group)) return null;
  const groups = await Promise.all(
    (group.children ?? []).filter(isGroup).map((s) => realized(api, s)),
  );
  for (const node of groups) {
    const a = await safeAttrs(api, node);
    if (nxClass(a) === "NXdata" && asText(a.signal)) return node;
  }
  for (const node of groups) {
    const found = await firstNxData(api, node, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * The NXdata group to plot for one NXentry.
 *
 *   1. `hint` -- the path segments after the entry name in a result link's
 *      `#/<entry>/<path>` fragment. If they land on an NXdata (or a dataset
 *      inside one), plot exactly what the link points at.
 *   2. otherwise follow the NeXus `@default` chain, as pyambit writes it.
 *   3. otherwise the first NXdata descendant with a `signal` (h5web-style
 *      leniency for files with no `@default`).
 */
export async function defaultNxData(api, entry, hint) {
  if (hint && hint.length) {
    let node = entry;
    for (const seg of hint) {
      node = await realized(api, childNamed(node, seg));
      if (!node) break;
    }
    if (await isNxData(api, node)) return node;
    // walked onto a dataset or a wrapper group -> nearest NXdata ancestor
    for (let k = hint.length - 1; k >= 1; k -= 1) {
      const anc = await safeEntity(api, `${entry.path}/${hint.slice(0, k).join("/")}`);
      if (await isNxData(api, anc)) return anc;
    }
  }

  let node = entry;
  const seen = new Set();
  for (let i = 0; i < MAX_DEFAULT_DEPTH; i += 1) {
    const a = await safeAttrs(api, node);
    if (nxClass(a) === "NXdata") return node;
    const next = asText(a.default);
    if (!next) break;
    const child = childNamed(node, next);
    if (!child || seen.has(child.path)) break;
    seen.add(child.path);
    node = await realized(api, child);
    if (!isGroup(node)) break;
  }

  return firstNxData(api, entry);
}

function reshape(flat, shape) {
  if (!shape || shape.length <= 1) return flat;
  const build = (dims, offsetRef) => {
    if (dims.length === 1) {
      const row = flat.slice(offsetRef.o, offsetRef.o + dims[0]);
      offsetRef.o += dims[0];
      return row;
    }
    const out = [];
    for (let i = 0; i < dims[0]; i += 1) out.push(build(dims.slice(1), offsetRef));
    return out;
  };
  return build(shape, { o: 0 });
}

const isReplicate = (name) => REPLICATE_AXES.has(asText(name).toLowerCase());
const anyFinite = (arr) => arr.some((v) => Number.isFinite(v));
const mean = (arr) => {
  const f = arr.filter(Number.isFinite);
  return f.length ? f.reduce((s, v) => s + v, 0) / f.length : NaN;
};
const std = (arr) => {
  const f = arr.filter(Number.isFinite);
  if (f.length < 2) return 0;
  const m = mean(f);
  return Math.sqrt(f.reduce((s, v) => s + (v - m) ** 2, 0) / f.length);
};

/**
 * `{ kind, points, xLabel, yLabel, log }` for one NXdata group, or
 * `{ kind: "unsupported", reason }` when the signal is something this port
 * deliberately leaves to h5web (>2-D, a genuine 2-D grid, no numeric signal).
 *
 *   kind "series"     -- points: [{ x, y, sd? }], a response against one axis.
 *   kind "replicates" -- points: [{ x, y }] per run, plus `meanY` / `sdY`;
 *                        run number carries no magnitude, so draw dots + a
 *                        mean line, never a trend.
 *   kind "heatmap"    -- cells: [{ x, y, v }], two crossed conditions.
 */
export async function resolvePlot(api, nxdata) {
  const a = await safeAttrs(api, nxdata);
  const sigName = asText(a.signal);
  const sig = await realized(api, childNamed(nxdata, sigName));
  if (!isDataset(sig)) return { kind: "unsupported", reason: "no signal dataset" };

  const shape = sig.shape ?? [];
  const values = toNumbers(await datasetValue(api, sig));
  if (!anyFinite(values)) return { kind: "unsupported", reason: "no non-NaN values" };

  const axisNames = flatten(a.axes).map(asText);
  const kept = shape
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n !== 1)
    .map(({ i }) => i);

  const sigUnit = (await safeAttrs(api, sig)).units;
  const yLabel = labelWithUnit(sigName, sigUnit);

  const axisData = async (dim) => {
    const name = axisNames[dim];
    const ds = name ? childNamed(nxdata, name) : undefined;
    if (!isDataset(ds)) return { name, label: name || `axis ${dim}`, values: null };
    const au = (await safeAttrs(api, ds)).units;
    return {
      name,
      label: labelWithUnit(name, au),
      values: toNumbers(await datasetValue(api, ds)),
    };
  };

  // 1-D after squeezing every non-varying condition
  if (kept.length === 1) {
    const grid = reshape(values, shape);
    const y1d = flatten(grid);
    const axis = await axisData(kept[0]);

    if (axis.name && isReplicate(axis.name)) {
      const points = y1d.map((y, i) => ({
        x: axis.values?.[i] ?? i + 1,
        y,
      }));
      return {
        kind: "replicates",
        points,
        meanY: mean(y1d),
        sdY: std(y1d),
        xLabel: axis.label,
        yLabel,
      };
    }

    const x = axis.values && axis.values.length === y1d.length
      ? axis.values
      : y1d.map((_, i) => i);
    const points = y1d.map((y, i) => ({ x: x[i], y }));
    const positive = x.every((v) => v > 0);
    const span = positive ? Math.max(...x) / Math.min(...x) : 0;
    return {
      kind: "series",
      points,
      xLabel: axis.name ? axis.label : "index",
      yLabel,
      log: span >= 100,
    };
  }

  if (kept.length === 2) {
    const grid = reshape(values, [shape[kept[0]], shape[kept[1]]]);
    const repIdx = kept.findIndex((d) => isReplicate(axisNames[d]));

    // one axis is replicate/experiment -> mean +- SD vs the other
    if (repIdx !== -1) {
      const xDim = kept[1 - repIdx];
      const rows = kept.indexOf(xDim) === 0 ? grid : transpose(grid);
      const axis = await axisData(xDim);
      const points = rows.map((run, i) => ({
        x: axis.values?.[i] ?? i,
        y: mean(run),
        sd: std(run),
      }));
      return {
        kind: "series",
        points,
        xLabel: axis.name ? axis.label : "index",
        yLabel,
        log: false,
      };
    }

    // two genuinely different conditions -> heatmap (matches the Python
    // resolve_plot, which draws an imshow here)
    const [xAxis, yAxisInfo] = await Promise.all([
      axisData(kept[0]),
      axisData(kept[1]),
    ]);
    const cells = [];
    for (let r = 0; r < grid.length; r += 1) {
      for (let c = 0; c < grid[r].length; c += 1) {
        cells.push({
          x: xAxis.values?.[r] ?? r,
          y: yAxisInfo.values?.[c] ?? c,
          v: grid[r][c],
        });
      }
    }
    return {
      kind: "heatmap",
      cells,
      xLabel: xAxis.label,
      yLabel: yAxisInfo.label,
      valueLabel: yLabel,
    };
  }

  return { kind: "unsupported", reason: `${kept.length}-D signal — open in h5web` };
}

function transpose(grid) {
  return grid[0].map((_, c) => grid.map((row) => row[c]));
}

// --------------------------------------------------------------------------
// one call: the whole per-file model
// --------------------------------------------------------------------------

/**
 * Read an open NeXus file into the model the viewer renders:
 * `{ materials: string[], entries: [{ ...entryMetadata, plot }] }`.
 * Never throws for per-entry problems -- a bad entry becomes `plot: null`
 * with the metadata that could be read.
 *
 * `focus` -- `{ name, path }` from a result link's `#/<entry>/<path>`
 * fragment. `path` (segments below the entry) is passed to `defaultNxData`
 * as a hint so the plot is exactly what the link points at.
 */
export async function readOverview(api, focus = null) {
  const root = await api.getEntity("/");
  const [materials, entryGroups] = await Promise.all([
    substanceNames(api, root),
    listEntries(api, root),
  ]);

  const entries = await Promise.all(
    entryGroups.map(async (entry) => {
      let meta = { name: entry.name };
      let plot = null;
      try {
        meta = await entryMetadata(api, root, entry);
        const hint = focus?.name === entry.name ? focus.path : undefined;
        const nxdata = await defaultNxData(api, entry, hint);
        if (nxdata) plot = await resolvePlot(api, nxdata);
      } catch (err) {
        meta.error = String(err?.message || err);
      }
      return { ...meta, plot };
    }),
  );
  return { materials, entries };
}
