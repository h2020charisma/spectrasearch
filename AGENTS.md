# AGENTS.md

## Sources

- Prefer `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vite.config.js`, `cypress.config.js`, `.eslintrc.cjs`, `Dockerfile`, `.dockerignore`, `docker/nginx/default.conf`, `.github/workflows/ci.yml`, and `.github/dependabot.yml` for current tooling behavior.
- `docs/VIEWERS.md` documents result viewer dispatch; keep it aligned with `src/viewers.js`, route pages, and viewer package imports.
- `README.md` is intentionally short and is not enough to understand development, testing, or deployment.
- The backend is `ramanchada-api`: https://github.com/h2020charisma/ramanchada-api. Treat its API and `/db/query/sources` response as the source of truth for data sources, fields, app name, and similarity modes.
- Keep this file and `CONTRIBUTING.md` updated whenever commands, tooling, deployment behavior, or backend API assumptions change.

## Project Shape

- This is a single-package React 18 SPA built with Vite and plain JavaScript/JSX.
- The app is served under `/search/`; `vite.config.js` sets `base: "/search/"` and `src/main.jsx` creates a React Router browser router with basename `/search/`.
- The main app entrypoint is `src/main.jsx`; the main search page is `src/pages/HomePage.jsx`; the core search orchestration is `src/components/SearchComp/SearchComp.jsx`.
- Dynamic sidebar filters are rendered from backend-provided field metadata in `src/components/Sidebar/Sidebar.jsx`, `src/components/Widget/Widget.jsx`, `src/components/Widget/WidgetLiveSearch.jsx`, and `src/components/UI/SearchLiveSelect.jsx`.
- Similarity mode selection is rendered from backend-provided metadata in `src/components/UI/Select.jsx` and used by `src/components/UploadFile/UploadFile.jsx`.
- Search results are rendered by `src/components/ImageSelect/` and table view code in `src/components/DataTable/`.
- Spectrum previews are rendered by `src/components/Chart/Chart.jsx` from `/db/dataset` responses.
- HDF5/HSDS browsing is handled by `src/components/h5web/h5web.jsx` and the `/h5web/:domain/*` route.
- Result viewer dispatch is centralized in `src/viewers.js`; route viewers include h5web and predictions, and external viewers are declarative URL templates.
- Prediction viewer embedding is handled by `src/pages/PredictionsPage.jsx`; result actions use `src/components/ResultActions/ResultActions.jsx`, simpler primary links use `src/components/ViewerLink/ViewerLink.jsx`, and multi-item viewer links are rendered by `src/pages/CollectionPage.jsx`.
- Authentication uses `react-oidc-context`; bearer tokens are attached in `src/utils/useFetch.jsx` and passed to image requests through `public/serviceWorker.js`.
- Shared client state is a mix of React state, session/local storage hooks, and a small Zustand store in `src/store/store.js`.

## Backend Contract

- Set the backend base URL with `VITE_BaseURL`; keep the value ending in `/`.
- Discover backend-driven UI metadata with `GET /db/query/sources`; do not hard-code source names, field names, application names, or similarity modes unless there is an explicit compatibility requirement.
- `GET /db/query/sources` is expected to return `application_name`, `default`, `data_sources`, `fields`, and `similarity`.
- Search requests use `GET /db/query` with `page`, `pagesize`, optional `q`, optional `query_type`, optional `ann`, optional `vector_field`, and repeated `data_source` parameters.
- Dynamic field filters for direct `/db/query` GET requests use backend field names as returned by `/db/query/sources`; qdynamic fields must be sent as `qdynamic.<field>=value`.
- Static field values use `GET /db/query/field?name=<field>`; live autocomplete uses `GET /db/query/field/terms?name=<field>&prefix=<term>&limit=25`.
- Similarity search uploads use `POST /db/download?what=knnquery` with multipart form field `files`; the response may include `cdf`, `imageLink`, and `vector_field`.
- Chart previews use `GET /db/dataset?domain=<domain>&values=True`.
- HDF5 downloads use `GET /db/download?what=h5&domain=<domain>`.
- Public data should work without login; private/protected sources require an OIDC bearer token and backend-side authorization.
- Different backend personalities are expected to be backend configuration concerns. The frontend should adapt from discovery metadata instead of branching on a specific backend deployment.

## Commands

- Use pnpm, not npm or yarn; the pnpm version is pinned by `packageManager` in `package.json`.
- Install reproducibly: `pnpm install --frozen-lockfile`.
- `pnpm-workspace.yaml` enforces a 24-hour strict minimum release age, ignores missing publish-time metadata, disables side-effects cache, and allowlists build scripts for Cypress and esbuild.
- qu-bounds uses `@ideaconsult/qubounds-viewer`; when changing viewer package names or embedding props, update `package.json`, imports, `vite.config.js` dependency optimization, lockfile, and docs together.
- Create local environment: `cp .env.example .env`, then edit `VITE_BaseURL` when needed.
- Start Vite dev server: `pnpm dev`.
- Lint: `pnpm lint`.
- Build production assets: `pnpm build`.
- Build a local `/search/` tree and serve it for Cypress: `pnpm build-serve`.
- Run Cypress E2E tests against the local build server: `pnpm exec cypress run`.
- Clean generated build output: `pnpm clean`.

## Testing And Quality

- There is currently no `pnpm test` script; Cypress is the configured browser test runner.
- Cypress E2E tests live in `cypress/e2e/`; fixtures live in `cypress/fixtures/`.
- Cypress loads `.env` through `cypress-dotenv`, so keep test backend values aligned with `.env` or CI setup.
- Cypress fixtures for `/db/query/sources` should mirror the backend discovery response, including `application_name`, `fields`, and `similarity` when tests exercise dynamic sidebar or similarity behavior.
- Run focused checks after code changes. For docs-only changes, inspect the rendered Markdown and skip build-heavy checks unless the content affects commands or tooling.
- If existing lint or test debt blocks an unrelated change, do not hide it. Document what was run and what failed.

## CI And Container

- GitHub Actions are under `.github/workflows/`; Dependabot configuration is `.github/dependabot.yml`.
- CI runs `pnpm install --frozen-lockfile` before Cypress validation. Existing ESLint debt is not yet a required CI gate.
- The Dockerfile `FROM node:x.y.z-slim AS build-stage` line is the source of truth for the Node.js version used by CI; update `.github/workflows/ci.yml` if that line format changes.
- Docker builds use `VITE_BaseURL` plus qu-bounds viewer config build args (`VITE_PredictionsCore`, `VITE_ChemicalsCore`, `VITE_SubjectField`, `VITE_HsdsUrl`, `VITE_HsdsDomain`) so separate frontend images can be built for different backend deployments.
- Same-repo PRs publish mutable and immutable preview images for all configured targets; fork PRs run validation only and do not build or publish Docker images.
- Only `push` events to `main` publish production tags and sign images with cosign.
- Docker uses Corepack with pnpm in the Node build stage and `nginxinc/nginx-unprivileged` at runtime.
- `.dockerignore` intentionally keeps Docker context narrow; update it if new build inputs are added.
- Checked-in nginx config lives in `docker/nginx/default.conf`; the runtime container listens on port `8080`.
- The app expects browser URLs under `/search/`. Current deployment uses Traefik `PathPrefix('/search')` plus prefix stripping before requests reach nginx.
- The production container serves static Vite output with nginx. Keep Docker, nginx, Vite base path, and Traefik assumptions in sync.
- Dependabot covers GitHub Actions, pnpm-managed npm dependencies, and Docker base images. Docker updates intentionally ignore Node versions `>=25` while the project is pinned to Node 24.
- Do not add secrets to the image build context or checked-in environment files. `.env` is local-only.

## Maintenance Rules

- Prefer small, direct changes that preserve the backend-driven UI model.
- Do not introduce hard-coded backend-specific fields, sources, or labels when they can come from `/db/query/sources`.
- When changing viewer registry behavior, routes, viewer package names, or embedding props, update `docs/VIEWERS.md` in the same change.
- Keep generated output such as `dist/` out of commits unless a future project decision explicitly changes this.
- Update `AGENTS.md` and `CONTRIBUTING.md` in the same PR when changing install commands, scripts, test tooling, deployment assumptions, or backend API expectations.
