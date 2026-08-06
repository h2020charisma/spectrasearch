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

Current route viewers:

| Viewer | Package | Route | Page |
|---|---|---|---|
| h5web default | `@h5web/app` | `/h5web/:domain/*` | `src/pages/H5webPage.jsx` |
| predictions | `@ideaconsult/qubounds-viewer` | `/predictions`, `/predictions/:id/*` | `src/pages/PredictionsPage.jsx` |
| substance/study | `@ideaconsult/jtoxkit-react` | `/substance` | `src/pages/SubstancePage.jsx` |

When a viewer package version or embedding props change, update `package.json`, imports, `vite.config.js` dependency optimization, packaged runtime configs, and this document together.

## Qu-bounds Embedding

`PredictionsPage` embeds the viewer as a React component and passes the existing OIDC access token as a prop. Do not put tokens in prediction viewer URLs.

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
  apiBase={apiBase}
  convertBase={convertBase}
  token={token}
  showHeader={false}
/>
```

`SubstancePage` accepts query parameters built from search result fields:

- `/substance?substanceId=...` opens the substance UUID surfaced from `s_uuid_hs` as `item.uuid`.
- `/substance?substanceId=...&dbtag=...` accepts an explicitly supplied database tag, but registry-generated result links currently contain only `substanceId`.

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
];
```

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
- `mode`: maps a result type to `compound`; all other values use `item`.
- `multi`: enables collection-level links that open many stored results in one viewer.

External fields:

- `url`: external site base.
- `link`: result-type or `_default` path/query templates.
- `requires`: one field and regular-expression applicability check.
- `transform`: derives a placeholder from another field with optional regular-expression extraction.

Dispatch helpers:

- `viewersForType(type)` returns enabled viewers for a result type, sorted by priority.
- `viewerHref(viewer, item)` builds one concrete route or external URL for a result. Route viewers are omitted when their `idField` is missing. H5Web route values are normalized to one separator while preserving internal slashes and the `#` initial-path fragment.
- `viewerMultiHref(viewer, items)` builds a multi-item route for collection links.
- `resolveViewersForItem(item)` returns applicable viewer actions and drops external links that cannot be built.
- `multiViewersForItems(items)` returns route viewers that can open at least one item type in a collection.

Rendering entrypoints:

- `src/components/ResultActions/ResultActions.jsx` renders the primary action, overflow viewer actions, and collection toggle.
- `src/components/ViewerLink/ViewerLink.jsx` renders a simpler primary viewer link for secondary link locations.
- `src/pages/CollectionPage.jsx` renders multi-item viewer actions from stored collection items.

### Current Dispatch Limits

- A direct type registration suppresses the `"*"` fallback even when every
  direct viewer later lacks a required field and resolves to no action.
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
