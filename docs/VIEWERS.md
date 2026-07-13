# Viewer dispatch: embedding React viewers per result type

## Why

Search results (`/db/query`) each carry a result type (`type`). Viewer dispatch maps each result to one or more actions without hard-coding viewer links in result components.

The default route viewer is h5web. Prediction and chemical results can also open the qu-bounds prediction viewer, and substance results can open the jtoxkit substance/study viewer. External website actions, such as AOP mapper or AOP-Wiki, use the same registry but render as normal external links.

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

The viewer package scopes its CSS under `.qubounds-root`, so importing its CSS should not leak globals into the search app.

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
- `/substance?substanceId=...&dbtag=...` can use `dbtag_hss[0]` when available.

`apiBase` is derived from `dbtag` or the substance UUID prefix through `src/utils/tagdbs.js`. If the tag is not mapped, `SubstancePage` falls back to runtime config `ambitUrl`, which defaults to `https://apps.ideaconsult.net/nanoreg1/`. `convertBase` is derived from runtime config `apiBaseUrl` and is used only for the ramanchada-api dose-response conversion endpoint.

The viewer package scopes its CSS under `.jtoxkit-root`, so importing its CSS should not leak globals into the search app.

## Local Viewer Development

For local debugging of [`@ideaconsult/qubounds-viewer`](https://github.com/ideaconsult/qubounds-viewer) or [`@ideaconsult/jtoxkit-react`](https://github.com/ideaconsult/jtoxkit-react), prefer `pnpm link` over committed `file:` dependencies.

The viewer packages expose built `dist/` files, so run the library build in watch mode:

```sh
# in ../qubounds-viewer or ../jtoxkit-react
pnpm build:lib -- --watch
```

Then link the package in this repo and force Vite dependency optimization:

```sh
pnpm link ../qubounds-viewer
# or:
pnpm link ../jtoxkit-react
pnpm dev -- --force
```

If updates are not picked up after a viewer rebuild, restart `pnpm dev -- --force`. Return to registry packages with `pnpm unlink <package>`, then `pnpm install --frozen-lockfile`.

Use `pnpm pack` tarballs only for package-consumer smoke tests. Tarball installs modify `package.json` and `pnpm-lock.yaml`, so do them on a throwaway branch or restore the normal semver dependencies before committing.

## Registry And Dispatch

`src/viewers.js` exports an ordered array of viewer definitions. Higher `priority` entries are shown first.

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

Important fields:

- `types`: result types served by the viewer; `"*"` is the default only when no direct viewer matches.
- `idField`: result field used to build the route or query parameter.
- `mode`: for route viewers, maps result type to `item` or `compound` query parameter names.
- `multi`: enables collection-level links that open many stored results in one viewer.
- `priority`: controls primary action ordering when several viewers apply.

Dispatch helpers:

- `viewersForType(type)` returns enabled viewers for a result type, sorted by priority.
- `viewerHref(viewer, item)` builds one concrete route or external URL for a result.
- `viewerMultiHref(viewer, items)` builds a multi-item route for collection links.
- `resolveViewersForItem(item)` returns applicable viewer actions and drops external links that cannot be built.
- `multiViewersForItems(items)` returns route viewers that can open at least one item type in a collection.

Rendering entrypoints:

- `src/components/ResultActions/ResultActions.jsx` renders the primary action, overflow viewer actions, and collection toggle.
- `src/components/ViewerLink/ViewerLink.jsx` renders a simpler primary viewer link for secondary link locations.
- `src/pages/CollectionPage.jsx` renders multi-item viewer actions from stored collection items.

## External-link Viewers

External viewers use `url` plus `link` templates. Placeholders in `{braces}` are read from result fields and `encodeURIComponent`-escaped.

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

Adding an external viewer usually requires only one registry entry in `src/viewers.js`; no route, component, package, or backend change is needed.

## Adding A Route Viewer

1. Add the viewer package or component.
2. Create a page under `src/pages/` that passes route/query params, auth token, and backend config to the viewer.
3. Register the route in `src/main.jsx`.
4. Add a `kind: "route"` entry in `src/viewers.js`.
5. Update this document and the relevant agent/contributor instructions.

Route viewers should be props-driven and keep their CSS scoped under a package-specific root class.
