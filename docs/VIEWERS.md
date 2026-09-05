# Viewer dispatch: embedding React viewers per result type

> [!NOTE]
> This reference describes SpectraSearch
> [PR #104](https://github.com/h2020charisma/spectrasearch/pull/104) and the
> companion ramanchada-api
> [PR #134](https://github.com/h2020charisma/ramanchada-api/pull/134) as if they
> were merged. Until then, their `viewers` and `viewers_support` branches are the
> corresponding sources of truth.

## Why

Search results (`/db/query`) each carry a result type (`type`). Viewer dispatch maps each result to one or more actions without hard-coding viewer links in result components.

The default route viewer is h5web. Prediction and chemical results can also open the qu-bounds prediction viewer, and substance results can open the jtoxkit substance/study viewer. External website actions, such as AOP mapper or AOP-Wiki, use the same registry but render as normal external links.

For the package-development contract and an end-to-end integration checklist,
see [Adding and Developing Viewers](ADDING_VIEWERS.md).

## Viewer Kinds

A viewer entry in `src/viewers.js` is one of two kinds:

- `kind: "route"`: an embedded React component mounted on an internal React Router route.
- `kind: "external"`: a declarative external link built from result fields.

Internal route viewers open in the current tab by default so they retain the active SpectraSearch OIDC context. External viewers open in a new tab with `rel="noreferrer"` and do not receive the SpectraSearch access token.

RRUFF is one such external viewer: `study`/`substance` results whose `id` looks like an RRUFF sample id (e.g. `R250095`, from Solr `id`— see `pipeline_nexus/tasks/read_rruff.py`) link to `https://www.rruff.net/{name}`. The mineral's human-readable name lives in `name_s`.

Current route viewers:

| Viewer | Package | Route | Page |
|---|---|---|---|
| NeXus overview | host-only (HSDS REST + `@observablehq/plot`) | `/nexus-overview/:domain/*` | `src/pages/NexusOverviewPage.jsx` |
| h5web default | `@h5web/app` | `/h5web/:domain/*` | `src/pages/H5webPage.jsx` |
| predictions | `@ideaconsult/qubounds-viewer` | `/predictions`, `/predictions/:id/*` | `src/pages/PredictionsPage.jsx` |
| substance/study | `@ideaconsult/jtoxkit-react` | `/substance` | `src/pages/SubstancePage.jsx` |

`/substance` serves two result types: a `substance` result opens the substance
with all its studies; a `study` result opens the same page narrowed to that one
study (see [Substance/Study Embedding](#substancestudy-embedding)).

When a viewer package version or embedding props change, update `package.json`, imports, `vite.config.js` dependency optimization, packaged runtime configs, and this document together.

## Qu-bounds Embedding

`PredictionsPage` embeds the viewer as a React component and passes the existing OIDC access token for fetch-based query and JSON data requests. The viewer keeps synthesized thumbnail URLs independent of authentication state; do not put tokens in prediction viewer URLs.

```jsx
import PredictionViewer from "@ideaconsult/qubounds-viewer";
import "@ideaconsult/qubounds-viewer/style.css";

<PredictionViewer
  items={[id]}
  type="prediction"
  dataSource={dataSource}
  token={token}
  apiBase={apiBase}
  chemicalsCore={chemicalsCore}
  subjectField={subjectField}
  hsds={hsds}
  showHeader={false}
/>
```

The viewer package uses `.qubounds-root` for package-level styles and CSS
Modules for component-local selectors. Its stylesheet currently imports Google
Fonts, so deployments with strict CSP or offline requirements must account for
`fonts.googleapis.com` and `fonts.gstatic.com` or replace that dependency.

`PredictionsPage` accepts either a path id or repeatable query parameters:

- `/predictions/:id/*` opens the path id as an item by default, or as a compound when `?mode=compound` is present.
- `/predictions?item=...&item=...` opens one or more prediction item ids.
- `/predictions?compound=...&compound=...` opens one or more subject compound ids.

If `data_source` is not present in the URL, `PredictionsPage` uses runtime config `predictionsCore` and then falls back to `vega`. It also passes `chemicalsCore`, `subjectField`, `hsdsUrl`, and `hsdsDomain` to the viewer so the host owns backend and HSDS integration config.

## Substance/Study Embedding

`SubstancePage` embeds the jtoxkit substance/study viewer and passes the existing OIDC access token as a prop. Do not put tokens in substance viewer URLs.

```jsx
import SubstanceStudyViewer from "@ideaconsult/jtoxkit-react";
import "@ideaconsult/jtoxkit-react/style.css";

<SubstanceStudyViewer
  substanceId={substanceId}
  documentUuid={studyId}
  apiBase={apiBase}
  convertBase={convertBase}
  token={token}
  showHeader={false}
/>
```

`SubstancePage` accepts query parameters built from search result fields:

- `/substance?substanceId=...` opens the substance UUID surfaced from `s_uuid_hs` as `item.uuid`.
- `/substance?substanceId=...&dbtag=...` accepts an explicitly supplied database tag, but registry-generated result links currently contain only `substanceId`.
- `/substance?substanceId=...&studyId=...` opens one study inside its substance.
  `studyId` is passed as the viewer's `documentUuid` prop (jtoxkit-react >= the
  version that added it; older versions ignore the prop and show the whole
  study list).

### Opening one study

A `study` result is one protocol application, identified by AMBIT's
`document_uuid`. The viewer loads a *substance* and then focuses a study within
it, so a study result needs both ids, and ramanchada-api surfaces both:

| Result field | Solr field | Meaning |
|---|---|---|
| `item.uuid` | `document_uuid_s` | the study itself — becomes `studyId` |
| `item.substance_uuid` | `s_uuid_s` | its parent substance — becomes `substanceId` |

Do not reconstruct the parent by splitting the Solr `id`: its shape differs per
collection (`{s_uuid}/{n}` in plastic, `{s_uuid}/a/{assay_uuid}` in momentum).

Given `documentUuid`, the viewer resolves which topcategory tab holds that study
on its own (`studysummary` only counts studies per topcategory, so the tab is
not known until its studies are fetched), then narrows to that study's category
group and row, offering "Show all" back to the whole tab.

**NeXus-backed studies are excluded from this viewer.** They carry a
`document_uuid_s` too, but it is not an AMBIT record and the link would lead
nowhere. They are recognised by the `.nxs#` in `value` (the Solr `textValue_s`
is an HSDS `"<file>.nxs#<path>"` domain rather than a plain value) and keep
h5web / NeXus overview as their viewers instead.

ramanchada-api PR #134 normalizes `s_uuid_hs` to the optional result field
`uuid`; it does not return `dbtag_hss`. `apiBase` is derived from an explicit
`dbtag` or the substance UUID prefix through `src/utils/tagdbs.js`. If the tag
is not mapped, `SubstancePage` falls back to runtime config `ambitUrl`, which
defaults to `https://apps.ideaconsult.net/nanoreg1/`. `convertBase` is derived
from runtime config `apiBaseUrl` and is used only for the ramanchada-api
dose-response conversion endpoint.

The viewer package scopes its selectors beneath `.jtoxkit-root`. Its stylesheet
currently imports Google Fonts, so deployments with strict CSP or offline
requirements must account for `fonts.googleapis.com` and `fonts.gstatic.com` or
replace that dependency.

The current package also statically imports `@observablehq/plot` while declaring
it as an optional peer. SpectraSearch installs Plot directly in `package.json`;
other hosts must currently do the same if they consume the main entrypoint.

## NeXus Overview Embedding

`NexusOverviewPage` embeds `src/components/NexusOverview/NexusOverview.jsx`, a
curated per-file view of a written NeXus (`.nxs`) file: the materials the file
carries (test items and the controls / vehicles / blanks alongside them), the
shared investigation's title and free-text description, and the default plot
per NXentry. It renders the same facts the `nanodata` import_pipeline
`corpus_overview` task produces in Python, read here straight from HSDS.

```jsx
import NexusOverview from "../components/NexusOverview/NexusOverview";

<NexusOverview
  domain={domain}          // HSDS filepath of the .nxs
  hsdsUrl="https://hsds-kc.ideaconsult.net"
  authHeader={authHeader}  // "Bearer <token>" or "Basic <base64>"
  focusEntry={focusEntry}  // NXentry name from the link's #-fragment, or null
  focusPath={focusPath}    // fragment path below the entry, used as a plot hint
  onClearFocus={fn}        // host navigation back to the whole-file view
/>
```

The reusable component is props-driven and never reads a token, env var, or
storage: `NexusOverviewPage` owns route parsing, the OIDC token, the anonymous
`system-public-user` Basic identity, the HSDS URL, the `#/<entry>/<path>`
fragment, and the route-level error boundary.

Data access is a small **direct HSDS REST client**
(`src/components/NexusOverview/hsdsClient.js`), shaped as the
`{ getEntity, getValue, getAttrValues }` object the reader expects.
`@h5web/app`'s data layer is reachable only through React-suspense hooks
(`useEntity`, `useDatasetValue`), which cannot drive a recursive tree walk, so
it is not used here. `src/components/NexusOverview/nexus.js` is a
framework-free port of the reading half of `pyambit.nexus_plot` over that
client: it walks NXentry groups, lists the `substance` group, resolves the
investigation label by field-or-attribute and by `collection_identifier`,
follows the NeXus `@default` chain (with a first-NXdata fallback for files
that omit it), and reduces the signal to a series, a replicate-aware
mean ± SD series, or a heatmap. Scalar and >=3-D signals are left to the
h5web viewer, as in the Python.

Styles are scoped under `.nexus-overview-root`. Plots use `@observablehq/plot`,
already a direct SpectraSearch dependency (also used by `src/components/Chart`).

This is currently a **host-only** viewer (see
[Before Starting A New Viewer Project](ADDING_VIEWERS.md#before-starting-a-new-viewer-project)):
it is coupled to SpectraSearch's HSDS deployment and result contract and has no
separate public component API. If a second host needs it, extract it to an
independent props-driven package following that guide, as h5web and
jtoxkit-react were.

## Local Viewer Development

For local debugging of
[`@ideaconsult/qubounds-viewer`](https://github.com/ideaconsult/qubounds-viewer)
or
[`@ideaconsult/jtoxkit-react`](https://github.com/ideaconsult/jtoxkit-react),
use a watched library build plus `pnpm link` for the daily development loop.
Use a packed tarball in a disposable checkout to test the actual npm consumer
artifact. Keep committed dependencies on npm semver versions.

The complete workflow, including Vite cache behavior, cleanup, React peer
handling, Windows paths, and tarball verification, is in
[Develop A Viewer And Host Together](ADDING_VIEWERS.md#develop-a-viewer-and-host-together).

## Registry And Dispatch

`src/viewers.js` defines an ordered array of viewer definitions and exports the
dispatch helpers that consume it. Higher `priority` entries are shown first.

```js
const VIEWERS = [
  {
    id: "substance",
    kind: "route",
    label: "Substance studies",
    icon: "fa6/FaFlask",
    types: ["substance"],
    route: "/substance",
    idField: "uuid",
    paramName: "substanceId",
    multi: false,
    priority: 10,
  },
  {
    id: "ambit-study",
    kind: "route",
    label: "Study data",
    icon: "fa6/FaFlask",
    types: ["study"],
    route: "/substance",
    idField: "uuid",                            // document_uuid_s
    paramName: "studyId",
    params: { substanceId: "substance_uuid" },  // s_uuid_s
    excludes: { field: "value", match: "\\.nxs#" },
    multi: false,
    priority: 9,
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
    id: "h5web",
    kind: "route",
    label: "h5web",
    icon: "fa6/FaWaveSquare",
    types: ["*"],
    route: "/h5web/{itemId}",
    idField: "value",
    multi: false,
    priority: 0,
  },
  {
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
```

`h5web` and `nexus-overview` share the `"*"` fallback slot. Both apply only
when no viewer is directly registered for the result type; they have equal
priority and `h5web` is listed first, so the stable sort in `viewersForType`
keeps `h5web` the primary action and `nexus-overview` follows it as a
secondary action.

Common fields:

- `id`: stable registry identifier.
- `kind`: `"route"` or `"external"`.
- `label`: user-facing action label.
- `types`: exact, case-sensitive result types served by the viewer; `"*"` is the default only when no direct viewer matches.
- `priority`: controls primary action ordering when several viewers apply.
- `enabled: false`: hides a configured viewer from normal per-item dispatch.
- `icon`: reserved icon metadata; the current result action components do not render it.

Route fields:

- `route`: internal route; `{itemId}` is the only supported path placeholder.
- `idField`: normalized result field used to build the route or query parameter.
- `paramName`: explicit query parameter for a single item.
- `params`: extra query parameters as `{queryParam: resultField}`, for viewers that
  need more than one id (a study is opened inside its substance). A result missing
  any of these fields resolves to no href, so the viewer is not offered for it.
- `mode`: maps a result type to `compound`; all other values use `item`.
- `multi`: enables collection-level links that open many stored results in one viewer.

Applicability fields (both kinds):

- `requires`: one field and regular-expression check; the viewer applies only on a match.
- `excludes`: the inverse — the viewer does not apply when the field matches. Used to
  keep the AMBIT study viewer off NeXus-backed studies, whose `document_uuid` is not an
  AMBIT record.

Both are evaluated by `viewerApplies(viewer, item)` for route and external viewers alike.

External fields:

- `url`: external site base.
- `link`: result-type or `_default` path/query templates.
- `transform`: derives a placeholder from another field with optional regular-expression extraction.

Dispatch helpers:

- `viewersForType(type)` returns enabled viewers for a result type, sorted by priority.
- `viewerApplies(viewer, item)` evaluates `requires`/`excludes` for either kind.
- `viewerHref(viewer, item)` builds one concrete route or external URL for a result. Route viewers are omitted when `viewerApplies` fails, when their `idField` is missing, or when any field named in `params` is missing. H5Web route values are normalized to one separator while preserving internal slashes and the `#` initial-path fragment.
- `viewerMultiHref(viewer, items)` builds a multi-item route using only items whose type and identifier are supported by the viewer.
- `resolveViewersForItem(item)` returns applicable viewer actions and drops external links that cannot be built.
- `compatibleItemsForViewer(viewer, items)` returns the collection items a viewer can open.
- `multiViewersForItems(items)` returns route viewers that can open at least one identified item in a collection.

Rendering entrypoints:

- `src/components/ResultActions/ResultActions.jsx` renders the primary action, overflow viewer actions, and collection toggle.
- `src/components/ViewerLink/ViewerLink.jsx` renders a simpler primary viewer link for secondary link locations.
- `src/pages/CollectionPage.jsx` renders multi-item viewer actions from stored collection items.

### Current Dispatch Limits

- `viewersForType` alone suppresses the `"*"` fallback as soon as any viewer is
  directly registered for the type. `resolveViewersForItem` compensates: when no
  direct viewer resolves for a specific item, it falls back to the `"*"` viewers.
  Two registrations now depend on that — RRUFF (`requires` rejects a non-RRUFF id)
  and `ambit-study` (`excludes` rejects a NeXus-backed study), both of which must
  still leave h5web / NeXus overview available. Code paths that call
  `viewersForType` directly do not get this fallback.
- Collection persistence keeps only `id`, `type`, `text`, `value`, and
  `imageLink`. A multi-viewer that needs another field requires a coordinated
  change in `src/store/collection.js`.
- `viewerMultiHref` currently serializes every supplied collection item rather
  than filtering to the viewer's types. Verify mixed collections before adding
  another multi-viewer.
- `multiViewersForItems` currently reads the registry directly and does not
  apply the normal `enabled: false` filtering.

## External-link Viewers

External viewers use `url` plus `link` templates. Placeholders in `{braces}` are
read from result fields and `encodeURIComponent`-escaped. Placeholder names may
contain only letters, digits, and underscores.

```js
{
  id: "aopmapper",
  kind: "external",
  label: "AOP mapper",
  icon: "fa6/FaProjectDiagram",
  types: ["aop", "key_event", "assay", "stressor", "biological_object", "biological_action"],
  url: "https://aop.adma.ai",
  link: {
    _default: "/?fieldId={id}&graph=AOP",
  },
}
```

Optional external fields:

- `requires`: hides the action unless a field matches a regex.
- `transform`: derives a placeholder value from another field, for example extracting digits from an id.
- `enabled: false`: keeps a configured viewer hidden without deleting it.

Adding an external viewer usually requires only one registry entry in
`src/viewers.js` when all placeholders already exist in the normalized result.
No route or package is needed; add backend normalization when the required
semantic value is not already returned.

## Adding A Route Viewer

Follow [Adding and Developing Viewers](ADDING_VIEWERS.md) before creating the
package, then use its
[embedded route viewer checklist](ADDING_VIEWERS.md#embedded-route-viewer) for
the SpectraSearch integration. Route viewers must be props-driven, receive host
auth and runtime configuration explicitly, and keep CSS scoped under a
package-specific root class.
