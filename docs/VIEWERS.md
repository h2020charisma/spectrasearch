# Viewer dispatch — embedding React viewers per result type

## Why

Search results (`/db/query`) each carry a `type` (`type_s`: `study`, `substance`, `prediction`, …).
Historically **every** result linked to the embedded **h5web** viewer, hardcoded in four places. Now each
result type opens **its assigned viewer**, embedded **as a React component on an internal route** — the
same way h5web (`@h5web/app`) is mounted at `/h5web/:domain`. h5web stays the **default**; `prediction` →
the qu-bounds viewer; new types are additive.

## How a viewer is integrated (like h5web)

A viewer = **a React component + an internal route**:

| Viewer | Package | Route | Page |
|---|---|---|---|
| h5web (default) | `@h5web/app` | `/h5web/:domain` | `pages/H5webPage.jsx` |
| predictions | `@adma/qubounds-viewer` | `/predictions/:id` | `pages/PredictionsPage.jsx` |

The viewer package exports a props-driven component; the page reads the route param + the Keycloak token
and renders it. Auth is **native**: same `/search/` origin and service-worker scope, so the token (passed
as a prop) and the SW image-auth cover the embedded viewer — no `?token=` in URLs.

```jsx
// pages/PredictionsPage.jsx (abridged)
import PredictionViewer from "@adma/qubounds-viewer";
import "@adma/qubounds-viewer/style.css";

const token = useAuth().user?.access_token;          // native auth
<PredictionViewer items={[id]} type="prediction"
  dataSource={dataSource} token={token}
  apiBase={import.meta.env.VITE_BaseURL} />
```

The viewer package scopes all its CSS under `.qubounds-root`, so importing `style.css` never leaks
globals into the search app.

## The registry and dispatch

`src/viewers.js` maps `type` → `{ route, idField, icon, label }`:

```js
const VIEWERS = {
  prediction: { route: "/predictions/{itemId}", idField: "id",    icon: "fa6/FaChartLine",  label: "Predictions" },
  _default:   { route: "/h5web/{itemId}",       idField: "value", icon: "fa6/FaWaveSquare", label: "h5web" },
};
```

- **`idField`** — which result field identifies the item for that viewer: h5web links on `value` (the HSDS
  domain), qu-bounds on `id` (the prediction primary id). Predictions have a null `value` but a real `id`.
- `resolveViewer(type)` returns the entry (or `_default`); `buildRoute(item, { source })` fills `{itemId}`
  and appends `?data_source=` for predictions.

`src/components/ViewerLink/ViewerLink.jsx` is the **single dispatch point**: it renders a react-router
`<Link to={buildRoute(item)}>` (new tab, mirroring the old h5web link) with an optional per-type icon
(`DynamicIcon`). It replaced the four hardcoded `/h5web/{value}` links in `DataTable.jsx` and
`ImageItem.jsx`.

## Adding a viewer

1. Publish/build the viewer as a component package exporting a props-driven component (CSS scoped under a
   root class), like `@adma/qubounds-viewer`.
2. Add it as a dependency; create a `pages/<X>Page.jsx` that renders it with the route param + token; add
   the route in `main.jsx`.
3. Add one entry to `VIEWERS` in `src/viewers.js`.

No changes to `DataTable`, `ImageItem`, or any result component. Removing the specific entries makes the
app behave exactly as before (everything → h5web).

## The qu-bounds viewer package (`@adma/qubounds-viewer`)

Lives in the qu-bounds repo (`qubounds_clean/ui`), published/built as a library
(`npm run build:lib` → `dist/qubounds-viewer.js` + `dist/style.css`). The same `<PredictionViewer>`
component powers both the standalone `/qubounds/` app (`src/App.jsx` reads URL params → renders it) and
this embedding, so there is one source of truth.

Props: `items` / `subjects` (+ `ssbd`/`endpoint`/`model` filters), `type`, `dataSource`, `token`,
`apiBase`, `chemicalsCore`, `predictionsCore`, `subjectField`, `hsds`, `showHeader`.
