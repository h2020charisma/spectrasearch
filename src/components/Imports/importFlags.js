// Quality checks over the rows /db/query/summary returns for one data source.
//
// All of them are generic: nothing here knows about a particular project, and a
// check that cannot apply to a collection (no path-like keys, a metric the
// collection does not record) simply does not fire rather than reporting a false
// defect. Everything is computed from the rows already fetched -- no extra request
// per row, which is what makes the report usable on a collection with hundreds of
// imports.

// Requested from the backend for every source. Which of them become columns is
// decided per section from the answers (reportedMetrics), so a collection is never
// shown a column of zeroes for something it does not record.
export const METRICS = [
  "studies",
  "materials",
  // requested for the "+N more" tail on the method list, not as a column
  "methods",
  "endpoints",
  "effects",
];

// A title this long is prose, not a name. Investigation titles in real corpora have
// been found holding an entire methods paragraph, which means the field is being
// filled from the wrong column of the source template.
const DESCRIPTION_LENGTH = 120;

// Values that made it into an index while still meaning "not filled in yet".
const PLACEHOLDER = /^(tbd|to be decided|n\/?a|unknown|none|null|-+|\?+)$/i;

export const FLAGS = {
  "no-provenance": {
    severity: "critical",
    label: "No provenance recorded",
    hint: "These documents carry no value for the field this collection is grouped by, so there is no way to tell which import produced them.",
  },
  "multi-investigation": {
    severity: "warn",
    label: "Several investigations",
    hint: "One import maps to more than one investigation title -- either the import crossed investigations, or the titles were assigned from the wrong row.",
  },
  "title-reused": {
    severity: "warn",
    label: "Title reused",
    hint: "The same investigation title is used by imports sitting in unrelated folders, which usually means it was copied rather than authored.",
  },
  "title-is-description": {
    severity: "warn",
    label: "Title is a description",
    hint: `The investigation title is longer than ${DESCRIPTION_LENGTH} characters -- a method description has been put in the title field.`,
  },
  placeholder: {
    severity: "warn",
    label: "Placeholder title",
    hint: "The investigation title is still a placeholder such as TBD.",
  },
  "empty-yield": {
    severity: "warn",
    label: "Empty yield",
    hint: "The import produced documents but no materials or no endpoints -- something was dropped in conversion.",
  },
  "also-imported": {
    severity: "info",
    label: "Also in another source",
    hint: "The same key appears in another selected data source, so the two can be compared.",
  },
};

/** The value a row is grouped by (the first group field), or null for the
 *  "no value recorded" bucket. */
export function rowKey(row, groupBy) {
  return row?.[groupBy?.[0]] ?? null;
}

/** The parent of a path-like key, used to tell "unrelated" imports apart.
 *  Returns null when the key is not a path, so checks that depend on it are
 *  skipped rather than guessing. */
export function keyParent(key) {
  if (typeof key !== "string") return null;
  const cut = key.lastIndexOf("/");
  return cut > 0 ? key.slice(0, cut) : null;
}

/** Metric columns worth showing for these rows.
 *
 *  A collection that never records a measure would otherwise get a column of
 *  zeroes, which reads as "this import produced nothing" rather than "this is not
 *  recorded here". Only a measure some row actually reports is shown. */
export function reportedMetrics(rows, candidates) {
  return candidates.filter((name) =>
    rows.some((row) => typeof row[name] === "number" && row[name] > 0),
  );
}

/** Investigation titles used by imports under more than one parent. */
function reusedTitles(rows, groupBy) {
  const parents = new Map();
  for (const row of rows) {
    const parent = keyParent(rowKey(row, groupBy));
    if (parent === null) continue;
    for (const title of row.investigation || []) {
      if (!parents.has(title)) parents.set(title, new Set());
      parents.get(title).add(parent);
    }
  }
  const reused = new Set();
  for (const [title, seen] of parents) if (seen.size > 1) reused.add(title);
  return reused;
}

/**
 * Flags for every row of one section.
 *
 * `sharedKeys` is the set of group values that also appear in another selected
 * source; pass an empty set when only one source is selected, so the
 * cross-source claim is only made when there is genuinely something to compare.
 */
export function flagRows(rows, groupBy, metrics, sharedKeys = new Set()) {
  const reused = reusedTitles(rows, groupBy);
  const tracksMaterials = metrics.includes("materials");
  const tracksEndpoints = metrics.includes("endpoints");

  return rows.map((row) => {
    const key = rowKey(row, groupBy);
    const titles = row.investigation || [];
    const flags = [];

    if (key === null) {
      flags.push("no-provenance");
    }
    if (titles.length > 1) flags.push("multi-investigation");
    if (titles.some((t) => reused.has(t))) flags.push("title-reused");
    if (titles.some((t) => typeof t === "string" && t.length > DESCRIPTION_LENGTH)) {
      flags.push("title-is-description");
    }
    if (titles.some((t) => typeof t === "string" && PLACEHOLDER.test(t.trim()))) {
      flags.push("placeholder");
    }
    // Only claim an empty yield for a measure this collection actually reports,
    // otherwise every row of a collection that does not record materials would be
    // flagged for not recording them.
    if (row.count > 0 && key !== null) {
      const noMaterials = tracksMaterials && !row.materials;
      const noEndpoints = tracksEndpoints && !row.endpoints;
      if (noMaterials || noEndpoints) flags.push("empty-yield");
    }
    if (key !== null && sharedKeys.has(key)) flags.push("also-imported");

    return { ...row, key, flags };
  });
}

/** Group values that occur in more than one section, so a row can point at its
 *  counterpart. Only meaningful when the sections agree on a grouping field --
 *  two collections grouped by different fields are not comparable, and saying so
 *  is better than implying a match. */
export function sharedKeysAcross(sections) {
  const comparable = sections.filter((s) => !s.error && s.rows?.length);
  const byField = new Map();
  for (const section of comparable) {
    const field = section.group_by?.[0];
    if (!field) continue;
    if (!byField.has(field)) byField.set(field, []);
    byField.get(field).push(section);
  }

  const shared = new Map();
  for (const [, group] of byField) {
    if (group.length < 2) continue;
    const seen = new Map();
    for (const section of group) {
      for (const row of section.rows) {
        const key = rowKey(row, section.group_by);
        if (key === null) continue;
        if (!seen.has(key)) seen.set(key, new Set());
        seen.get(key).add(section.data_source);
      }
    }
    for (const [key, sources] of seen) {
      if (sources.size > 1) shared.set(key, sources);
    }
  }
  return shared;
}

/** Counts per flag, for the section summary. */
export function countFlags(flaggedRows) {
  const counts = {};
  for (const row of flaggedRows) {
    for (const flag of row.flags) counts[flag] = (counts[flag] || 0) + 1;
  }
  return counts;
}
