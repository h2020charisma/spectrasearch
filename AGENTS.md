# AGENTS.md

## Sources

- Prefer `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `pom.xml`, `.mvn/wrapper/maven-wrapper.properties`, `src/route-contract.json`, `src/main/resources/application.properties`, `vite.config.js`, `cypress.config.js`, `playwright.config.js`, `.eslintrc.cjs`, `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, and `.github/dependabot.yml` for current tooling behavior.
- `docs/VIEWERS.md` documents result viewer dispatch; keep it aligned with `src/viewers.js`, route pages, and viewer package imports.
- `docs/ADDING_VIEWERS.md` is the required contract for creating a viewer package or adding a viewer integration. Read it before scaffolding a viewer or changing its public package boundary.
- `README.md` is intentionally short and is not enough to understand development, testing, or deployment.
- The backend is `ramanchada-api`: https://github.com/h2020charisma/ramanchada-api. Treat its API and `/db/query/sources` response as the source of truth for data sources, fields, app name, and similarity modes.
- Keep this file and `CONTRIBUTING.md` updated whenever commands, tooling, deployment behavior, or backend API assumptions change.
- Viewer documentation currently describes SpectraSearch PR #104 (`viewers`) and ramanchada-api PR #134 (`viewers_support`) as if merged. After both merge, remove this temporary instruction and the pre-merge notices/branch URLs in `CONTRIBUTING.md`, `docs/VIEWERS.md`, and `docs/ADDING_VIEWERS.md` without removing the permanent viewer guidance.

## Project Shape

- This is a single-package React 18 SPA built with Vite and plain JavaScript/JSX.
- The app is served under `/search/`; `vite.config.js` sets `base: "/search/"` and `src/main.jsx` creates a React Router browser router with basename `/search/` from `src/route-contract.json`.
- The production runtime is a Java 25 Quarkus application. Traefik strips external `/search/` before forwarding, so Quarkus owns internal `/`, `/assets/**`, `/config.json`, and `/health`; direct internal `/search/**` is intentionally unsupported.
- SPA fallback is an explicit allowlist in `src/main/java/net/ideaconsult/spectrasearch/SpaResource.java`, not a generic extensionless catch-all. `src/route-contract.json` drives React routing and provides deep-link examples consumed by JUnit and Playwright; update the contract, component map, and Java allowlist together.
- The main app entrypoint is `src/main.jsx`; the main search page is `src/pages/HomePage.jsx`; the core search orchestration is `src/components/SearchComp/SearchComp.jsx`.
- Dynamic sidebar filters are rendered from backend-provided field metadata in `src/components/Sidebar/Sidebar.jsx`, `src/components/Widget/Widget.jsx`, `src/components/Widget/WidgetLiveSearch.jsx`, and `src/components/UI/SearchLiveSelect.jsx`.
- Similarity mode selection is rendered from backend-provided metadata in `src/components/UI/Select.jsx` and used by `src/components/UploadFile/UploadFile.jsx`.
- Search results are rendered by `src/components/ImageSelect/` and table view code in `src/components/DataTable/`.
- Spectrum previews are rendered by `src/components/Chart/Chart.jsx` from `/db/dataset` responses.
- HDF5/HSDS browsing is handled by `src/components/h5web/h5web.jsx` and the `/h5web/:domain/*` route.
- Result viewer dispatch is centralized in `src/viewers.js`; route viewers include h5web, predictions, and substance/study, and external viewers are declarative URL templates.
- Prediction viewer embedding is handled by `src/pages/PredictionsPage.jsx`; substance/study viewer embedding is handled by `src/pages/SubstancePage.jsx`; result actions use `src/components/ResultActions/ResultActions.jsx`, simpler primary links use `src/components/ViewerLink/ViewerLink.jsx`, and multi-item viewer links are rendered by `src/pages/CollectionPage.jsx`.
- Authentication uses `react-oidc-context`; bearer tokens are attached in `src/utils/useFetch.jsx` and passed to image requests through `public/serviceWorker.js`.
- The isolated trusted-tier auth probe is a separate Vite entry at `auth-probe.html` and `src/auth-probe/`. It exercises Quarkus confidential OIDC without importing the legacy SPA OIDC client, registering a service worker, or migrating resource traffic. The normal production artifact keeps the runtime OIDC tenant disabled unless explicitly configured as documented in `docs/TRUSTED_TIER_DEPLOYMENT.md`.
- Shared client state is a mix of React state, session/local storage hooks, and a small Zustand store in `src/store/store.js`.

## Backend Contract

- Frontend config profiles are tracked in `public/configs/*.json`. `public/config.json` is generated, git-ignored, and used by local builds.
- The packaged Quarkus runtime excludes generated `public/config.json`. Its `/config.json` endpoint selects and validates a packaged profile from `SPECTRASEARCH_CONFIG_FILE`, defaulting to `spectra.json`, and fails startup for invalid or missing profiles.
- Runtime config must include `apiBaseUrl`; keep the value ending in `/`.
- Runtime config `ambitUrl` is the fallback AMBIT base URL for unmapped substance UUID/dbtag values; the default is `https://apps.ideaconsult.net/nanoreg1/`.
- Discover backend-driven UI metadata with `GET /db/query/sources`; do not hard-code source names, field names, application names, or similarity modes unless there is an explicit compatibility requirement.
- `GET /db/query/sources` is expected to return `application_name`, `default`, `data_sources`, `fields`, and `similarity`.
- Search requests use `GET /db/query` with `page`, `pagesize`, optional `q`, optional `query_type`, optional `ann`, optional `vector_field`, and repeated `data_source` parameters.
- Dynamic field filters for direct `/db/query` GET requests use backend field names as returned by `/db/query/sources`; qdynamic fields must be sent as `qdynamic.<field>=value`.
- Static field values use `GET /db/query/field?name=<field>`; live autocomplete uses `GET /db/query/field/terms?name=<field>&prefix=<term>&limit=25`.
- The import report uses `GET /db/query/summary` with repeated `metrics` and `data_source` parameters. It returns one entry per data source: `provenance` (how many documents populate each candidate field), `group_by` (the field the backend chose), `numFound`, and `rows`. Which provenance field a source is grouped by is a backend decision derived from the index — do not infer a source's kind in the frontend, and do not assume two sources are grouped by the same field.
- Similarity search uploads use `POST /db/download?what=knnquery` with multipart form field `files`; the response may include `cdf`, `imageLink`, and `vector_field`.
- Chart previews use `GET /db/dataset?domain=<domain>&values=True`.
- HDF5 downloads use `GET /db/download?what=h5&domain=<domain>`.
- Public data should work without login; private/protected sources require an OIDC bearer token and backend-side authorization.
- Different backend personalities are expected to be backend configuration concerns. The frontend should adapt from discovery metadata instead of branching on a specific backend deployment.

## Viewer Development Contract

- Before creating a publishable viewer, read `docs/ADDING_VIEWERS.md`. If this checkout may be stale, fetch the current guide from `https://raw.githubusercontent.com/h2020charisma/spectrasearch/main/docs/ADDING_VIEWERS.md`; use the `viewers` branch in that URL only until PR #104 merges. If the guide cannot be retrieved, stop and ask the user to provide it rather than proceeding from assumptions.
- Seed a new viewer repository with its own `AGENTS.md` that links to the guide and records the package's public API, commands, data contracts, tests, and release process.
- Keep standalone app concerns out of reusable library code. Viewer package internals must not read host routes, host storage, `import.meta.env`, `VITE_*`, deployment config, or host OIDC state. The standalone shell and embedding host translate those values into documented props.
- The host owns routing, authentication acquisition, runtime deployment config, result dispatch, layout, and route-level error handling. The backend owns normalization of storage-specific fields into the `/db/query` result contract.
- React and ReactDOM are host singletons: declare them as peers, externalize React and its runtime subpaths from the package build, and retain host deduplication for linked development.
- Treat CSS and assets as public API. Export a stable stylesheet, mark it side-effectful, scope it under a package root, and keep standalone global styles outside the library graph.
- Test the packed artifact in a clean consumer. Source tests and a local link do not validate npm contents, export maps, CSS paths, peer resolution, or production builds.
- Keep committed host dependencies on npm semver versions. `pnpm link`, `file:`, tarballs, and temporary overrides are local development or artifact-test mechanisms only.

## Commands

- Use pnpm, not npm or yarn; the pnpm version is pinned by `packageManager` in `package.json`.
- Quarkus builds require Java 25. Use the committed Maven Wrapper, which pins and checksum-verifies Maven 3.9.16; Unix systems also need `unzip` for its first download. Do not rely on a workstation Maven version.
- The Dockerfile build-stage image is the source of truth for Node.js. On native Windows, prefer pnpm-managed Node installed with `pnpm runtime set node <Dockerfile-version> -g`; avoid an MSI-installed Node taking precedence in `PATH`.
- Install reproducibly: `pnpm install --frozen-lockfile`.
- `pnpm-workspace.yaml` enforces a 24-hour strict minimum release age, excludes first-party viewer packages from that age gate, ignores missing publish-time metadata, disables side-effects cache, and allowlists build scripts for Cypress and esbuild.
- qu-bounds uses `@ideaconsult/qubounds-viewer`; substance/study uses `@ideaconsult/jtoxkit-react`; when changing viewer package names or embedding props, update `package.json`, imports, `vite.config.js` dependency optimization, lockfile, and docs together.
- Select a local frontend config with `pnpm select-config <name>`; names may include or omit `.json`. Edit the generated `public/config.json` only for temporary local experiments. `.env.example` is only for optional Cypress intercept overrides.
- Start Vite dev server: `pnpm dev`.
- Select a packaged local config: `pnpm select-config spectra`, `pnpm select-config nambit`, or `pnpm select-config test`.
- Lint: `pnpm lint`.
- Build production assets: `pnpm build`.
- Build the frontend and Quarkus runtime: `pnpm shell:build`.
- Build and run all JVM shell tests: `pnpm shell:verify`.
- Serve an already-built Quarkus artifact through the local prefix-strip harness: `pnpm shell:serve`.
- Install the Playwright Chromium binary: `pnpm exec playwright install chromium`.
- Build and run focused runtime-shell browser tests: `pnpm test:playwright`.
- Run focused runtime-shell browser tests against an already-built artifact: `pnpm test:playwright:built`.
- Build and run the bounded runtime OIDC deployment-contract test: `pnpm oidc:verify:deployment`.
- Run the deployment-contract test against an already-built ordinary artifact: `pnpm oidc:test:deployment`.
- Build the disposable stateless Phase 2 auth experiment: `pnpm phase2:build:stateless`.
- Build and run the stateless Phase 2 auth experiment: `pnpm phase2:test:stateless`.
- Build the bounded Valkey comparison artifact: `pnpm phase2:build:valkey`.
- Build and run the Valkey comparison: `pnpm phase2:test:valkey`.
- Run Cypress E2E tests against `pnpm shell:serve`: `pnpm exec cypress run`.
- Clean generated build output: `pnpm clean`.

## Testing And Quality

- There is no aggregate `pnpm test` script. Cypress remains the existing SPA browser suite; Playwright contains only focused Quarkus runtime-shell checks.
- Quarkus/JUnit tests live under `src/test/java/` and require a Vite build first. `pnpm shell:verify` performs both steps and checks every route example in `src/route-contract.json`.
- Playwright tests live under `playwright/e2e/`; `pnpm test:playwright` builds the artifact before Playwright starts the shell. `pnpm test:playwright:built` requires an existing artifact. The prefix-strip harness preserves raw request targets so malformed-path checks exercise Quarkus rather than Node URL normalization.
- `scripts/phase2/run-auth-experiment.mjs` owns disposable loopback-only Keycloak and optional Valkey containers, generated secrets, local TLS, one Quarkus process, and its Playwright browser. It writes sanitized metadata and numeric reports under ignored `phase2-results/`, separate from Playwright's cleaned output directory, and must never be pointed at a shared or remote identity service.
- Enabled OIDC requires the stock process-local refresh cache with a positive short TTL; the tested and baked value is 5 seconds for a single Quarkus instance. Cache-disabled hard-expired parallel refresh loses the session under strict refresh-token rotation.
- The `valkey-token-state` Maven profile exists only for the bounded comparison and adds the preview Redis token-state extension at build time. The comparison currently fails parallel-refresh and bounded-outage gates; do not treat it as the selected runtime or add locks/CAS around it.
- Stock RP-initiated logout is measured by the probe but is not an accepted application endpoint design: Quarkus triggers it with a state-changing GET and does not apply the REST CSRF filter to the framework-owned path. Omit it or add a separately reviewed POST anti-forgery boundary before adoption.
- Cypress E2E tests live in `cypress/e2e/`; fixtures live in `cypress/fixtures/`.
- Cypress loads `.env` through `cypress-dotenv` for an optional test-only `API_BASE_URL`; it intercepts runtime config before the app starts and must not contact production APIs.
- Cypress fixtures for `/db/query/sources` should mirror the backend discovery response, including `application_name`, `fields`, and `similarity` when tests exercise dynamic sidebar or similarity behavior.
- Run focused checks after code changes. For docs-only changes, inspect the rendered Markdown and skip build-heavy checks unless the content affects commands or tooling.
- If existing lint or test debt blocks an unrelated change, do not hide it. Document what was run and what failed.

## CI And Container

- GitHub Actions are under `.github/workflows/`; Dependabot configuration is `.github/dependabot.yml`.
- CI runs `pnpm install --frozen-lockfile`, JUnit, the bounded OIDC deployment contract, Playwright, and Cypress against one ordinary Quarkus artifact before any Docker publication job. Existing ESLint debt is not yet a required CI gate.
- The Dockerfile `FROM node:x.y.z-slim AS build-stage` line is the source of truth for the Node.js version used by CI; update `.github/workflows/ci.yml` if that line format changes.
- Docker builds one generic frontend image with packaged configs under `public/configs/`; select one at container startup with `SPECTRASEARCH_CONFIG_FILE`. The `test.json` profile targets `api-test.ramanchada.ideaconsult.net` for viewer integration testing.
- Docker builds generate a deterministic `spectra.json` active config before Vite runs, but exclude that generated file from Quarkus static resources. The runtime endpoint selects the configured packaged profile without modifying application files.
- Same-repo PRs publish mutable and immutable preview images; fork PRs run validation only and do not build or publish Docker images.
- Only `push` events to `main` publish production tags and sign images with cosign.
- Docker uses Corepack with pnpm in the Node build stage, Maven and a Java 25 JDK in the Quarkus build stage, and only a Java 25 JRE at runtime.
- `.dockerignore` intentionally keeps Docker context narrow; update it if new build inputs are added.
- The Quarkus runtime container listens on port `8080`, runs as UID `1001`, and starts with an exec-form `java -jar quarkus-run.jar` entrypoint. Packaged application files remain root-owned and non-writable by the runtime user.
- The normal production artifact includes the OIDC extension but defaults the runtime tenant off with `quarkus.oidc.tenant-enabled=false`; it requires no issuer, client, proxy setting, secret file, or Valkey configuration for anonymous shell operation. Set `QUARKUS_OIDC_TENANT_ENABLED=true` and the complete contract in `docs/TRUSTED_TIER_DEPLOYMENT.md` to enable trusted-tier authentication. Do not use a custom Quarkus profile as the deployment switch.
- The app expects browser URLs under `/search/`. Current deployment uses Traefik `PathPrefix('/search')` plus prefix stripping before requests reach the container.
- The current Traefik configuration redirects bare `/search` to `/search/` and strips `/search/` before requests reach Quarkus. Keep Docker, Quarkus, Vite base path, and Traefik assumptions in sync.
- Dependabot does not currently cover Maven. Do not assume Quarkus dependency updates are automated.
- Dependabot covers GitHub Actions, pnpm-managed npm dependencies, and Docker base images. Docker updates intentionally ignore Node versions `>=25` while the project is pinned to Node 24.
- Do not add secrets to packaged frontend config, the image build context, or checked-in environment files. Frontend runtime config is public browser data.

## Maintenance Rules

- Prefer small, direct changes that preserve the backend-driven UI model.
- Do not introduce hard-coded backend-specific fields, sources, or labels when they can come from `/db/query/sources`.
- When changing viewer registry behavior, routes, viewer package names, or embedding props, update `docs/VIEWERS.md` in the same change.
- When changing the reusable viewer package contract, local link/tarball workflow, package publication requirements, or viewer definition of done, update `docs/ADDING_VIEWERS.md` in the same change.
- Keep generated output such as `dist/` out of commits unless a future project decision explicitly changes this.
- Update `AGENTS.md` and `CONTRIBUTING.md` in the same PR when changing install commands, scripts, test tooling, deployment assumptions, or backend API expectations.
