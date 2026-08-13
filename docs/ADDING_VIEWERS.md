# Adding and Developing Viewers

> [!NOTE]
> This guide describes functionality in SpectraSearch
> [PR #104](https://github.com/h2020charisma/spectrasearch/pull/104) and the
> companion ramanchada-api
> [PR #134](https://github.com/h2020charisma/ramanchada-api/pull/134) as if it
> were already merged. Until those pull requests merge, use the `viewers` and
> `viewers_support` branches as the corresponding sources of truth. Remove this
> note and other temporary branch references after both pull requests merge.

This document is the development contract for creating a reusable viewer and
integrating it into SpectraSearch or another host application. It is intended
for human developers and coding agents. `docs/VIEWERS.md` separately documents
the viewers and dispatch behavior currently implemented in SpectraSearch.

## Before Starting A New Viewer Project

Decide first whether the proposed viewer needs a package:

- An **external viewer** is an existing website that can be opened with a URL
  built from search-result fields. It normally needs only a declarative entry
  in `src/viewers.js`; do not create an npm package for it.
- An **embedded viewer** is React UI rendered inside a host-owned route. If it
  is useful outside one application, develop it as an independent, props-driven
  npm package.
- A **host-only viewer** is tightly coupled to one application and has no useful
  public component API. Keep it in that application rather than publishing an
  artificial package.

Do not begin with a standalone application and postpone package design until
publication. Define the reusable component boundary, public props, package
entrypoint, peer dependencies, and built-artifact tests at the start.

### Using An AI Coding Agent

Give the agent this guide before it scaffolds the repository, chooses
dependencies, or designs the public component API. Treat the guide as
acceptance criteria, not as packaging advice to apply after the viewer works
locally.

The following prompt can bootstrap a new viewer project:

```text
Before scaffolding or changing this viewer package, fetch and read the current
SpectraSearch viewer-development contract:

https://raw.githubusercontent.com/h2020charisma/spectrasearch/viewers/docs/ADDING_VIEWERS.md

Treat its library/host boundaries, public API, dependency, CSS, artifact-testing,
runtime, and publishing requirements as acceptance criteria. Inspect the target
host and backend contracts before writing code. If you cannot access the
document, stop and ask me to provide it; do not continue from memory,
assumptions, or a stale local checkout.
```

After SpectraSearch PR #104 merges, replace `viewers` with `main` in that prompt.
Add an `AGENTS.md` to the new viewer repository as part of its initial setup. It
should link back to this guide and record the package's own public API, commands,
data contracts, testing requirements, and release process.

## Responsibility Boundaries

A low-friction integration depends on keeping responsibilities in the correct
repository.

| Concern | Viewer package | Host application | Backend |
|---|---|---|---|
| Render domain-specific data | Yes | No | No |
| Expose a stable component API | Yes | Consume it | No |
| Parse the host's routes and search-result links | No | Yes | No |
| Acquire and refresh OIDC credentials | No | Yes | Validate them |
| Receive an access token for API requests | As a prop | Pass it | Authorize it |
| Choose deployment URLs, cores, and domains | Accept props | Load runtime config | Expose APIs |
| Map search-result types to viewer actions | No | Yes | Return normalized fields |
| Translate raw storage fields into result fields | No | No | Yes |
| Provide an optional standalone demo | Optional shell | No | No |
| Handle route-level layout and error isolation | No | Yes | No |

The reusable viewer component must not depend on:

- `import.meta.env`, `VITE_*`, or another build tool's environment API;
- SpectraSearch modules, routes, storage keys, or runtime-config singleton;
- the host's OIDC library or login flow;
- a particular deployment base path;
- URL parameters or browser navigation state required only by a standalone app;
- unpublished source files or deep imports from another package.

An optional standalone app may read its URL and build-time environment and may
acquire credentials for standalone use. Its job is to translate those values
into the same props that an embedding host uses. Keep the standalone entrypoint
out of the library entrypoint's import graph.

## Design The Public Component First

Create one deliberate package entrypoint, normally `src/index.js`, and export
only supported public symbols from it. Do not instruct consumers to import from
`src/`, internal contexts, or implementation paths.

At minimum, document every public prop with:

- its type and whether it is required;
- its default value;
- the meaning of `undefined`, `null`, and an empty value;
- valid combinations with other props;
- whether the host or package owns the value;
- security implications for URLs, tokens, or HTML;
- whether changing it after mount is supported.

Prefer a small component API built around domain inputs, backend configuration,
authentication, and presentation options. Expose callbacks for behavior the
host genuinely needs to observe, such as navigation or unrecoverable errors.
Do not export internal hooks and configuration objects merely because they are
easy to export.

Add JSDoc or generated TypeScript declarations even when the implementation is
plain JavaScript. The package README and declarations should agree with the
actual entrypoint exports.

### Configuration

The host owns deployment configuration. Pass API bases, collection names,
field names, proxy settings, and service domains through ordinary props. The
package may provide portable defaults, but defaults must not silently select a
private or deployment-specific backend.

Only a standalone shell may translate variables such as `VITE_API_URL` into
component props:

```jsx
// Standalone application entrypoint, not part of the library entry graph.
const env = import.meta.env;

<ExampleViewer
  apiBase={env.VITE_API_URL}
  dataSource={env.VITE_DATA_SOURCE}
/>;
```

The reusable component receives `apiBase` and `dataSource`; it does not know
that Vite exists.

### Authentication

The embedding host owns login, logout, token refresh, and redirect handling.
Pass an access token as a prop and send it in an `Authorization: Bearer` header.
Never put tokens in viewer URLs.

Define anonymous behavior explicitly. New viewer packages must use a controlled
contract:

- `token={string}` means authenticated, host-controlled operation;
- `token={null}` means explicitly anonymous, host-controlled operation;
- an omitted token has documented validation or default behavior, but must not
  silently activate URL, storage, or message-based credential discovery.

If a standalone viewer accepts credentials through storage, URL migration, or
`postMessage`, implement that in the standalone shell and pass the resolved
string or `null` to the component. Validate message origins. If compatibility
requires passive behavior inside the package, require an explicit mode prop and
test it separately from embedded mode.

The initial qubounds-viewer and jtoxkit-react releases predate this stricter
contract: when their token is nullish they can fall back to standalone URL,
storage, and message handling. Do not copy that behavior into a new viewer. A
future package update should make standalone authentication explicit before
SpectraSearch relies on controlled anonymous mode for those viewers.

## Backend And Result Contracts

The viewer registry can use only fields returned in normalized `/db/query`
results. It cannot refer directly to arbitrary Solr fields.

The companion `ramanchada-api` viewer-support contract normalizes results to:

| Field | Meaning |
|---|---|
| `type` | Result type used for viewer dispatch. |
| `id` | General result identifier. |
| `value` | Domain or primary data location, used by h5web when present. |
| `text` | Display label. |
| `imageLink` | Preview URL. |
| `uuid` | Optional type-specific UUID, including substance UUIDs. |
| `score` | Optional similarity score. |

When a new viewer requires another field:

1. Confirm that no existing normalized field has the required semantics.
2. Add a backend alias and normalized response property in ramanchada-api.
3. Keep raw Solr field names inside the backend.
4. Add backend response tests and representative frontend fixtures.
5. Document whether the value is raw, normalized, nullable, or encoded.
6. Deploy the backend support before enabling the frontend action.

The substance viewer uses `item.uuid`, supplied from `s_uuid_hs` by
ramanchada-api PR #134. `dbtag` can be accepted by `SubstancePage`, but it is not
currently part of the `/db/query` result contract or generated viewer links;
the page normally derives the AMBIT deployment from the UUID prefix.

### Encoding Ownership

Values should ideally cross API boundaries as raw semantic values, with the
component that builds a URL encoding each value exactly once. `uuid`, `value`,
and `text` follow that model in the viewer-support backend.

The current backend URL-quotes `id` for compatibility, while frontend URL
builders also use `URLSearchParams` or `encodeURIComponent`. Identifiers with
reserved characters can therefore be double-encoded. Test such identifiers
explicitly and do not decode opportunistically in an individual viewer. Any
change to encoding ownership must be coordinated with ramanchada-api and all
existing consumers.

## Build A Publishable npm Package

Develop against the package that consumers will install, not against an
unpublished source-tree convention.

### Package Manifest

A minimal ESM-only React viewer manifest resembles:

```json
{
  "name": "@ideaconsult/example-viewer",
  "version": "0.1.0",
  "description": "Embeddable React viewer for example data.",
  "license": "Apache-2.0",
  "type": "module",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ideaconsult/example-viewer.git"
  },
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "dist"
  ],
  "main": "./dist/example-viewer.js",
  "module": "./dist/example-viewer.js",
  "exports": {
    ".": {
      "import": "./dist/example-viewer.js"
    },
    "./style.css": "./dist/style.css"
  },
  "sideEffects": [
    "**/*.css"
  ],
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

Also provide `README.md`, `LICENSE`, bugs/homepage metadata, keywords, and the
repository's pinned `packageManager`. Remove `private: true`. Use `files` as an
allowlist rather than relying on a growing `.npmignore` denylist.

The `exports` map is the public module boundary. Add named subpath exports only
when consumers need a stable API there. If the package supports CommonJS or
publishes type declarations, add and test the corresponding `require` or
`types` conditions rather than assuming `main` is sufficient.

### Classify Dependencies Deliberately

| Dependency role | Manifest/build treatment |
|---|---|
| Host singleton such as React | Peer dependency, development dependency, and build external. |
| Required external plugin | Peer dependency and build external. |
| Optional plugin | No unconditional static import from the main entrypoint. |
| Bundled implementation detail | Development dependency used by the build. |
| Runtime package left external | Runtime dependency and build external. |

An optional peer declaration suppresses installation warnings; it does not make
a static ESM import optional. Bundle the feature, make the peer required, inject
the implementation, load it behind a tested dynamic boundary, or expose it from
a separate subpath.

React, ReactDOM, and React runtime subpaths must remain external so the host
provides one React instance. Test all supported React major versions. A host may
also use Vite `resolve.dedupe`, especially for linked development, but that is a
defense rather than permission to bundle React.

### CSS And Assets Are Public API

- Emit and export a stable CSS entry such as `./style.css`.
- Mark CSS as side-effectful so consumer tree shaking keeps it.
- Scope package styles beneath a unique root class.
- Keep standalone global styles out of the library entry graph.
- Avoid resetting host elements, variables, typography, or layout globally.
- Document required host sizing, particularly when the viewer uses
  `height: 100%`.
- Package fonts and images deliberately, or document external requests and CSP
  requirements.
- Preserve meaningful asset filenames if the package grows beyond one CSS file.

Test the stylesheet in a representative host page. Source-level CSS isolation
is not enough; inspect the emitted stylesheet for leaked selectors and imports.

### Library Build

Use a dedicated library entrypoint and build configuration. The following
example targets Vite 6 or newer, as used by the current viewer repositories:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const isReact = (id) =>
  id === "react" ||
  id.startsWith("react/") ||
  id === "react-dom" ||
  id.startsWith("react-dom/");

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: fileURLToPath(new URL("src/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "example-viewer.js",
      cssFileName: "style",
    },
    rollupOptions: {
      external: isReact,
    },
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
  },
});
```

Use separate output directories for a standalone app and its npm package, or
make the required build order explicit. Both current viewers use `dist` for
both modes, so the library build must run last because it empties that
directory. A future viewer should avoid depending on that ordering.

If a fixed CSS filename is required, configure the bundler's CSS-specific
filename option or use an asset callback that preserves names for fonts, images,
and other assets. Do not map every emitted asset to `style.css`. Older Vite
versions need a compatible CSS-only output rule; always verify the emitted name
against the package's `exports` map.

Critical initialization must have an observable dependency edge. Prefer a
called exported initializer over a bare side-effect import, and test behavior
from the built artifact. If a side-effect module is unavoidable, identify it in
`sideEffects` as well.

## Test The Artifact, Not Only The Source

Source tests and a successful library build do not prove that npm consumers can
load the package. CI in the viewer repository should:

1. Install with the frozen lockfile.
2. Check peer dependencies.
3. Run unit and component tests.
4. Build the standalone app, if one exists.
5. Build the library package.
6. Reject `import.meta.env`, `VITE_`, secrets, and deployment-specific values in
   reusable JavaScript output.
7. Inspect `pnpm pack --dry-run` output.
8. Install the tarball in a clean minimal host.
9. Import every public JavaScript and CSS export.
10. Render the component with supported peer versions.

Add an entrypoint contract test that checks the exact exported names. Include
tests for missing optional integrations, CSS loading, required side effects,
anonymous and authenticated modes, prop updates, and production builds.

`prepublishOnly` runs for publication but not for `pnpm pack`. Build and test
explicitly before packing, or use a carefully designed `prepack`/validation
script that makes both paths produce the same artifact.

## Publish Safely

Prefer an automated release workflow using npm trusted publishing instead of a
long-lived npm token. The current first-party viewers are configured to publish
from GitHub Releases through workflows that:

- check out the immutable release tag;
- verify that `vX.Y.Z` matches `package.json`;
- verify that the tagged commit is reachable from `main`;
- install from the frozen lockfile and repeat CI checks;
- inspect package contents;
- publish through npm OIDC with `id-token: write`.

After publication, verify the registry version, files, exports, integrity,
provenance, and installability in a clean project. A package appearing on
npmjs.com does not by itself prove that the intended files or entrypoints were
published.

## Integrate A Viewer Into SpectraSearch

Read `docs/VIEWERS.md` and `src/viewers.js` before changing dispatch. Keep the
host adapter small: it should translate a search result and host state into the
package's public props.

### External-Link Viewer

If all required values are already present in normalized result items, add a
`kind: "external"` entry:

```js
{
  id: "example",
  kind: "external",
  label: "Example viewer",
  types: ["chemical"],
  url: "https://example.test",
  link: {
    _default: "/substances/{id}",
  },
  requires: { field: "id", match: "^EXAMPLE" },
  priority: 4,
}
```

Placeholders are read from the normalized result item and URL-encoded. Current
placeholder names may contain only letters, digits, and underscores. Missing
placeholders or failed `requires` checks hide the action. Add backend work only
when the normalized response does not contain the required semantic value.

Test applicable and inapplicable items, missing fields, reserved characters,
type-specific templates, transforms, and action ordering. External URLs in the
registry are source-time configuration and require rebuilding SpectraSearch.

### Embedded Route Viewer

1. Publish or select a semver package version. Do not commit a local `file:`,
   `link:`, or tarball dependency.
2. Add the package with pnpm and review `package.json` and `pnpm-lock.yaml`.
3. Import the public component and its documented stylesheet from a page under
   `src/pages/`.
4. Read route/query values, OIDC state, and `getRuntimeConfig()` in that page.
5. Pass ordinary props to the package and wrap it in a route-level error
   boundary.
6. Give the viewer a correctly sized host container.
7. Register the route in `src/main.jsx` under the existing `/search/` basename.
8. Add a `kind: "route"` definition in `src/viewers.js`.
9. Add runtime-config defaults, validation, every packaged profile, and Cypress
   interception values if the viewer introduces configuration.
10. Update Vite dependency optimization and React deduplication deliberately.
11. Add the package to pnpm's release-age exclusion only for a reviewed
   first-party package that is expected to integrate immediately after release.
12. Add dispatch, route, prop, auth, config, and failure tests.

A typical host page owns the adaptation:

```jsx
import { useAuth } from "react-oidc-context";
import { useSearchParams } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import ExampleViewer from "@ideaconsult/example-viewer";
import "@ideaconsult/example-viewer/style.css";

import { getRuntimeConfig } from "../config";

export default function ExamplePage() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const config = getRuntimeConfig();

  return (
    <ErrorBoundary fallback={<div>Failed to load the example viewer.</div>}>
      <ExampleViewer
        itemId={params.get("item") || undefined}
        apiBase={config.apiBaseUrl}
        token={auth.user?.access_token ?? null}
        showHeader={false}
      />
    </ErrorBoundary>
  );
}
```

Do not copy this example blindly. Match the selected package's documented prop
semantics, especially controlled anonymous authentication.

### Registry Contract And Current Limits

Common viewer fields are:

| Field | Purpose |
|---|---|
| `id` | Stable registry identifier. |
| `kind` | `route` or `external`. |
| `label` | User-facing action label. |
| `types` | Exact result types served by the viewer. |
| `priority` | Higher entries become primary actions first. |
| `enabled` | `false` hides a viewer from normal per-item dispatch. |
| `icon` | Reserved icon metadata; current action components do not render it. |

Route viewer fields are:

| Field | Purpose |
|---|---|
| `route` | Internal route; `{itemId}` is the only path placeholder supported. |
| `idField` | Result field used as the viewer identifier. |
| `paramName` | Explicit single-item query parameter name. |
| `mode` | Maps a type to `compound`; other values use `item`. |
| `multi` | Enables collection-level repeated query parameters. |

External viewer fields are:

| Field | Purpose |
|---|---|
| `url` | External site base concatenated with the selected link template. |
| `link` | Type-specific or `_default` path/query templates. |
| `requires` | One field/regular-expression applicability check. |
| `transform` | Derives a placeholder from another field with optional extraction. |

Important dispatch behavior:

- `types` matching is exact and case-sensitive.
- A direct type registration suppresses the `types: ["*"]` fallback even when
  the direct viewer later lacks its `idField` or another required value.
- Route path templating supports only `{itemId}`. More complex routes require
  extending and testing the generic builder, not ad hoc string building in a
  result component.
- `multi: true` is appropriate only when the package accepts repeated inputs.
- Collection persistence currently retains only `id`, `type`, `text`, `value`,
  and `imageLink`. Extend it when a multi-viewer needs another normalized field.
- The current multi-item builder serializes the collection; verify mixed-type
  behavior before enabling a viewer for heterogeneous collections.
- The current multi-viewer helper reads the registry directly and does not
  apply normal `enabled: false` filtering.

## Develop A Viewer And Host Together

Keep committed host dependencies on npm semver versions. Use a local link for
the daily edit/build/integrate loop and a packed tarball for the consumer test.

[pnpm generally recommends `file:` dependencies](https://pnpm.io/cli/link#whats-the-difference-between-pnpm-link-and-using-the-file-protocol)
when peer resolution is the primary concern. SpectraSearch deliberately uses
`pnpm link` for this workflow because the viewer build replaces files under
`dist/`, a directory symlink sees those replacements immediately, and the link
need not become a committed dependency. This is safe only with the viewer's
React peers externalized and SpectraSearch's
`resolve.dedupe: ["react", "react-dom"]` retained.

### Prepare The Viewer Checkout

Run this once in each viewer repository:

```sh
pnpm install --frozen-lockfile
```

Keep the library artifact rebuilding:

```sh
pnpm build:lib -- --watch
```

`pnpm link` does not install the linked package's dependencies. The published
entrypoint also exposes built `dist/` files rather than `src/`, so source edits
do not reach SpectraSearch until the library watcher rebuilds them.

### Link From SpectraSearch

In the SpectraSearch checkout:

```sh
pnpm link ../example-viewer
pnpm dev -- --force
```

For both current viewers:

```sh
pnpm link ../jtoxkit-react
pnpm link ../qubounds-viewer
pnpm dev -- --force
```

This normally needs one terminal per viewer watcher plus one for SpectraSearch.
Inspect `git diff -- package.json pnpm-lock.yaml pnpm-workspace.yaml` after
linking. With the repository-pinned pnpm version the link is intended to remain
local, but this check also protects against changed behavior in future pnpm
versions.

SpectraSearch explicitly prebundles the current viewer packages. Starting Vite
once with `--force` does not make all later viewer rebuilds invalidate that
cache. After rebuilding a linked viewer, stop and restart the host with:

```sh
pnpm dev -- --force
```

If stale output remains, reload with browser caching disabled. Do not enable
Vite `resolve.preserveSymlinks` as a generic fix; changing module identity can
reintroduce duplicate React instances.

### Windows

Use the pnpm-managed Node.js version documented in `CONTRIBUTING.md`. Install
and build both SpectraSearch and the viewer using native Windows tools and
paths. This does not mean using the same terminal window or identical pnpm
settings; it means that both checkouts are installed, built, linked, and run on
the same side of the Windows/WSL boundary with a compatible active Node version.

Quote paths containing spaces and, for the least surprising Vite file-watching
behavior, preferably keep both checkouts on the same local drive:

```powershell
pnpm link "..\example-viewer"
```

pnpm normally falls back to Windows directory junctions, so Developer Mode or
an elevated terminal should not usually be required. If WSL is used, treat it
as a separate Linux development environment: install, build, link, and run both
repositories inside WSL, and do not share `node_modules` between Windows and
WSL. Vite polling is a last resort for a demonstrated filesystem watcher issue,
not part of the normal setup.

### Return To Registry Packages

Unlink by package name and restore the manifest's registry dependency:

```sh
pnpm unlink @ideaconsult/jtoxkit-react
pnpm unlink @ideaconsult/qubounds-viewer
pnpm install --frozen-lockfile
pnpm dev -- --force
```

For another package, use its actual `package.json` name. Inspect
`package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` afterward and ensure
no `link:`, `file:`, tarball path, temporary override, or local release-age
exception remains.

## Run A Packed Consumer Test

A link proves the integration loop, not the published artifact. Before release,
run the viewer's complete checks and create a tarball:

```sh
pnpm install --frozen-lockfile
pnpm peers check
pnpm test
pnpm build
pnpm build:lib
pnpm pack --dry-run
pnpm pack --out "../%s-%v.tgz"
```

Use the filename printed by `pnpm pack`; do not hard-code the package version in
documentation or automation.

In a disposable SpectraSearch worktree or clone, install the generated tarball:

```sh
pnpm add "<path-printed-by-pnpm-pack>"
pnpm why react
```

Then run the production-like server in one terminal:

```sh
pnpm build-serve
```

Run Cypress in another terminal:

```sh
pnpm exec cypress run
```

Replace the placeholder with the actual generated path. Confirm that the
production build resolves JavaScript and CSS exports, there is one effective
React version, viewer routes load directly, and no invalid-hook warning appears.
Run the relevant manual integration flow with `pnpm dev -- --force` as well.

Tarball installation intentionally changes `package.json` and
`pnpm-lock.yaml`, which is why a disposable checkout is preferred. Never commit
a tarball, `file:`, or linked dependency as the production integration.

## Current Viewer Case Studies

The two current packages demonstrate different domains but converged on the
same package boundary:

- [`@ideaconsult/qubounds-viewer`](https://github.com/ideaconsult/qubounds-viewer)
  renders prediction intervals from ramanchada-api and HSDS inputs.
- [`@ideaconsult/jtoxkit-react`](https://github.com/ideaconsult/jtoxkit-react)
  renders AMBIT substances and studies and can use ramanchada-api conversion.

The current jtoxkit-react bundle statically imports `@observablehq/plot` even
though its manifest marks that peer optional. SpectraSearch installs Plot
directly, so its integration works, but other consumers must currently install
Plot as well. Future releases should make the peer required, bundle it, or move
the chart behind a genuinely optional boundary.

Their publication work is useful history:

| Concern | qubounds-viewer | jtoxkit-react |
|---|---|---|
| Package metadata and npm contents | [PR #5](https://github.com/ideaconsult/qubounds-viewer/pull/5) | [PR #4](https://github.com/ideaconsult/jtoxkit-react/pull/4) |
| Standalone/library environment boundary | [PR #6](https://github.com/ideaconsult/qubounds-viewer/pull/6) | [PR #5](https://github.com/ideaconsult/jtoxkit-react/pull/5) |
| pnpm migration | [PR #7](https://github.com/ideaconsult/qubounds-viewer/pull/7) | [PR #6](https://github.com/ideaconsult/jtoxkit-react/pull/6) |
| CI and trusted publishing | [PR #8](https://github.com/ideaconsult/qubounds-viewer/pull/8) | [PR #7](https://github.com/ideaconsult/jtoxkit-react/pull/7) |

The central lesson is that a standalone application may know its environment,
URL, and deployment, while a published component library must not. Designing
that boundary after implementation caused avoidable plumbing in both projects.

## Definition Of Done

A new embedded viewer is ready only when all applicable statements are true:

- The reusable component is driven by documented props.
- Standalone URL and environment handling is outside the library graph.
- The public entrypoint exports only intentional API.
- React and other host singletons are peers and build externals.
- Every dependency is deliberately bundled, external, required, or optional.
- Optional peers are not statically required by the main entrypoint.
- CSS is scoped, exported, marked side-effectful, and tested in a host.
- Package contents are allowlisted and inspected.
- The built bundle contains no host environment variables or secrets.
- Source tests and clean-host tarball tests pass.
- The release workflow validates immutable versioned releases and uses trusted
  publishing.
- Required backend result fields are normalized, documented, deployed, and
  represented in fixtures.
- SpectraSearch owns the route, auth acquisition, runtime config, error
  boundary, and result dispatch.
- Single-item, missing-field, encoding, and multi-item behavior are tested as
  applicable.
- Committed host dependencies use npm semver versions.
- `docs/VIEWERS.md`, this guide, `CONTRIBUTING.md`, and `AGENTS.md` reflect the
  final integration.
