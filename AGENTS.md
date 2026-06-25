# AGENTS.md

## Sources

- Prefer `package.json`, `vite.config.js`, `cypress.config.js`, `.eslintrc.cjs`, `Dockerfile`, `.github/workflows/ci.yml`, and `.github/dependabot.yml` for current tooling behavior.
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

- Install reproducibly: `npm ci`.
- Create local environment: `cp .env.example .env`, then edit `VITE_BaseURL` when needed.
- Start Vite dev server: `npm run dev`.
- Lint: `npm run lint`.
- Build production assets: `npm run build`.
- Build a local `/search/` tree and serve it for Cypress: `npm run build-serve`.
- Run Cypress E2E tests against the local build server: `npx cypress run`.
- Clean generated build output: `npm run clean`.

## Testing And Quality

- There is currently no `npm test` script; Cypress is the configured browser test runner.
- Cypress E2E tests live in `cypress/e2e/`; fixtures live in `cypress/fixtures/`.
- Cypress loads `.env` through `cypress-dotenv`, so keep test backend values aligned with `.env` or CI setup.
- Cypress fixtures for `/db/query/sources` should mirror the backend discovery response, including `application_name`, `fields`, and `similarity` when tests exercise dynamic sidebar or similarity behavior.
- Run focused checks after code changes. For docs-only changes, inspect the rendered Markdown and skip build-heavy checks unless the content affects commands or tooling.
- If existing lint or test debt blocks an unrelated change, do not hide it. Document what was run and what failed.

## CI And Container

- GitHub Actions are under `.github/workflows/`; Dependabot configuration is `.github/dependabot.yml`.
- Docker builds use `VITE_BaseURL` as a build argument so one frontend image can be built for different backend deployments.
- The app expects browser URLs under `/search/`. Current deployment uses Traefik `PathPrefix('/search')` plus prefix stripping before requests reach nginx.
- The production container serves static Vite output with nginx. Keep Docker, nginx, Vite base path, and Traefik assumptions in sync.
- Do not add secrets to the image build context or checked-in environment files. `.env` is local-only.

## Maintenance Rules

- Prefer small, direct changes that preserve the backend-driven UI model.
- Do not introduce hard-coded backend-specific fields, sources, or labels when they can come from `/db/query/sources`.
- Keep generated output such as `dist/` out of commits unless a future project decision explicitly changes this.
- Update `AGENTS.md` and `CONTRIBUTING.md` in the same PR when changing install commands, scripts, test tooling, deployment assumptions, or backend API expectations.
