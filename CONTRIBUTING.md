## Introduction

Spectra Search is a React/Vite web app for searching spectral and chemical datasets through the `ramanchada-api` backend.

The frontend is intentionally backend-driven. Data sources, sidebar fields, application name, and similarity modes come from `GET /db/query/sources` rather than hard-coded frontend lists.

Backend reference: https://github.com/h2020charisma/ramanchada-api

## Best practices

- **Do not commit to `main` directly**. Please use [feature branches](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow) and [pull requests](https://help.github.com/articles/about-pull-requests/). Only urgent fixes that are small enough may be directly merged to `main` without a pull request.

- **Rebase regularly**. If your feature branch has conflicts with `main`, you will be asked to rebase it before merging. Getting into the habit of [rebasing](https://git-scm.com/docs/git-rebase) your feature branches on a regular basis while still working on them will save you from the hassle of dealing with massive and probably hard-to-deal-with conflicts later.

- **Avoid merge commits when pulling**. If you made local commits on a branch, but there have also been new commits to it on GitHub, you will not be able to pull the branch cleanly (i.e., fast-forward it). By default, Git will try to incorporate the remote commits to your local branch with a merge commit. Do **not** do this. Either use `git pull --rebase` or run the following to change the default:

For the current repo only:
```sh
git config pull.rebase true
```

For all Git repos on this system:
```sh
git config --global pull.rebase true
```

## Tool requirements

- Node.js and pnpm are required.
- Use the committed `pnpm-lock.yaml` for reproducible installs.
- Use `pnpm install --frozen-lockfile` for CI-like verification.
- Use `pnpm install` only when intentionally updating dependencies and the lockfile.
- The pnpm version is pinned by `packageManager` in `package.json`.
- pnpm enforces a 24-hour strict minimum package release age, except for first-party viewer packages, and disables side-effects cache.
- Docker is optional for local app development, but useful for testing the production container.

## Start developing

Clone the repository and install dependencies:

```sh
pnpm install --frozen-lockfile
```

Create a local environment file only if you need to override Cypress intercepts:

```sh
cp .env.example .env
```

Select one of the tracked frontend config profiles for local runs. The name may include or omit `.json`:

```sh
pnpm select-config spectra
# or
pnpm select-config nambit.json
```

This generates the git-ignored `public/config.json`. If it is missing, `pnpm dev` and `pnpm build` generate it from `spectra.json`. You may edit the generated file for temporary local experiments without dirtying the worktree:

```json
{
  "apiBaseUrl": "https://api.ramanchada.ideaconsult.net/"
}
```

Start the development server:

```sh
pnpm dev
```

Build production assets:

```sh
pnpm build
```

Build and serve the app locally under `/search/`, matching the Cypress setup:

```sh
pnpm build-serve
```

Clean generated build output:

```sh
pnpm clean
```

## Running the formatters & linters

Run ESLint:

```sh
pnpm lint
```

Fix lint issues in code you touch. If unrelated existing lint debt blocks a change, mention the exact command and failure in the pull request.

## Running the tests

There is currently no `pnpm test` script. Cypress is the configured browser test runner.

Run the production-like local server in one terminal:

```sh
pnpm build-serve
```

Run Cypress E2E tests in another terminal:

```sh
pnpm exec cypress run
```

For interactive Cypress work, use:

```sh
pnpm exec cypress open
```

Cypress intercepts runtime config and API startup requests before visiting the app, using a non-routable test origin by default. `cypress-dotenv` can override that test-only origin with `API_BASE_URL` from `.env`; it does not configure the application build.

Cypress fixtures for `/db/query/sources` should mirror the backend discovery response, including `application_name`, `fields`, and `similarity` when tests exercise dynamic sidebar or similarity behavior.

## Using specific Node.js versions

The Dockerfile `FROM node:x.y.z-slim AS build-stage` line is the source of truth for the Node.js version used by CI and Docker builds.

Use a compatible local Node.js version for development. When changing the Docker Node.js version, update this file, `AGENTS.md`, Docker, and CI together.

## Backend API expectations

- `apiBaseUrl` in frontend runtime config must point to a `ramanchada-api` deployment and should end with `/`.
- `ambitUrl` in frontend runtime config is the fallback AMBIT base URL for substance/study viewing when the substance UUID/dbtag is not mapped by `src/utils/tagdbs.js`; the default is `https://apps.ideaconsult.net/nanoreg1/`.
- qu-bounds embedding reads `predictionsCore`, `chemicalsCore`, `subjectField`, `hsdsUrl`, and `hsdsDomain` from frontend runtime config, then passes them as props to `@ideaconsult/qubounds-viewer`.
- jtoxkit substance/study embedding derives `apiBase` from the result UUID/dbtag when possible, falls back to runtime config `ambitUrl`, and passes runtime config `apiBaseUrl` as the dose-response conversion base to `@ideaconsult/jtoxkit-react`.
- The app discovers data sources, fields, app name, and similarity modes from `GET /db/query/sources`.
- Search requests use `GET /db/query` with repeated `data_source` parameters where needed.
- Dynamic filters should follow backend field names returned by discovery; qdynamic filters are sent as `qdynamic.<field>=value`.
- Similarity uploads use `POST /db/download?what=knnquery` with multipart form field `files`.
- Chart previews use `GET /db/dataset?domain=<domain>&values=True`.

## Embedded viewers

Result viewer dispatch is configured in `src/viewers.js` and documented in `docs/VIEWERS.md`.

Use `kind: "external"` for viewers that can be represented as links built from result fields. External viewers usually require only one registry entry.

Use `kind: "route"` for embedded React viewers. A route viewer should have a props-driven component, a page under `src/pages/`, a route in `src/main.jsx`, and a registry entry in `src/viewers.js`.

The qu-bounds viewer is imported as [`@ideaconsult/qubounds-viewer`](https://github.com/ideaconsult/qubounds-viewer). The substance/study viewer is imported as [`@ideaconsult/jtoxkit-react`](https://github.com/ideaconsult/jtoxkit-react). Treat local `file:` dependencies as development-only; when a viewer package version or embedding props change, update package metadata, imports, Vite dependency optimization, lockfile, and docs together.

When changing viewer registry behavior, routes, viewer package names, or embedding props, update `docs/VIEWERS.md` in the same pull request.

### Local viewer package development

Keep committed viewer dependencies as semver npm packages. For local debugging, prefer
`pnpm link` so package overrides stay in `node_modules` instead of `package.json` and
`pnpm-lock.yaml`.

Viewer packages expose built `dist/` files, not their `src/` files. Keep the relevant
library build running in watch mode while this app is running.

For jtoxkit-react:

```sh
# terminal 1, in ../jtoxkit-react
pnpm build:lib -- --watch
```

```sh
# terminal 2, in this repo
pnpm link ../jtoxkit-react
pnpm dev -- --force
```

For qubounds-viewer:

```sh
# terminal 1, in ../qubounds-viewer
pnpm build:lib -- --watch
```

```sh
# terminal 2, in this repo
pnpm link ../qubounds-viewer
pnpm dev -- --force
```

If both local viewers are needed, link both before starting the dev server:

```sh
pnpm link ../jtoxkit-react
pnpm link ../qubounds-viewer
pnpm dev -- --force
```

Because `vite.config.js` prebundles both viewer packages through `optimizeDeps.include`, a
library rebuild may not appear until Vite re-optimizes dependencies. Restart the dev server
with `pnpm dev -- --force` whenever updates are not picked up.

To return to registry packages:

```sh
pnpm unlink @ideaconsult/jtoxkit-react
pnpm unlink @ideaconsult/qubounds-viewer
pnpm install --frozen-lockfile
pnpm dev -- --force
```

Use packed tarballs for package-consumer smoke tests, not everyday live debugging. In the
viewer repo:

```sh
pnpm build:lib
pnpm pack --pack-destination /tmp/viewer-packs
```

Then install the tarball in this repo, preferably on a throwaway branch:

```sh
pnpm add /tmp/viewer-packs/ideaconsult-jtoxkit-react-0.1.0.tgz
# or:
pnpm add /tmp/viewer-packs/ideaconsult-qubounds-viewer-0.1.0.tgz
pnpm dev -- --force
```

Tarball installs intentionally modify `package.json` and `pnpm-lock.yaml`. Restore the
normal semver dependency before committing. Do not commit local `file:` or `.tgz` viewer
dependencies unless the pull request is explicitly about temporary local integration.

## Dependency updates

Routine dependency updates should go through a pull request and pass CI.

When updating dependencies:

1. Use `pnpm add <package>@<version>` or another intentional pnpm update command.
2. Review both `package.json` and `pnpm-lock.yaml`.
3. Run `pnpm lint` and the relevant Cypress checks.
4. Mention any breaking changes or skipped checks in the pull request.

pnpm enforces a minimum package release age before accepting dependencies from the lockfile. This reduces exposure to newly published malicious packages and compromised releases that are often detected and removed shortly after publication.

Routine dependency updates should wait for Dependabot and CI to pass normally. Do not bypass the release-age policy only to make a routine update merge sooner.

For urgent security fixes that cannot wait for the configured release-age window:

1. Confirm that the project is affected and that waiting would create unacceptable risk.
2. Review the release manually, including the advisory, changelog, package diff, publisher/provenance information where available, install scripts, and new transitive dependencies.
3. Add a temporary, version-specific exception in `pnpm-workspace.yaml`, for example:

```yaml
minimumReleaseAgeExclude:
  - vulnerable-package@1.2.3
```

4. Reference the advisory and the manual review in the pull request.
5. Remove the exception after the package version is older than the configured release-age window.

## Docker and deployment

The app is served under `/search/`. Current deployment uses Traefik with `PathPrefix('/search')` and prefix stripping before requests reach nginx.

Docker builds one generic frontend image. Packaged deployment configs live under `public/configs/*.json`, and the container selects one at startup with `SPECTRASEARCH_CONFIG_FILE`, defaulting to `spectra.json`.

For example:

```yaml
services:
  spectrasearch:
    image: ghcr.io/h2020charisma/spectrasearch:latest
    environment:
      SPECTRASEARCH_CONFIG_FILE: nambit.json
```

Docker uses Corepack with pnpm in the pinned Node.js build stage and `nginxinc/nginx-unprivileged` at runtime. The runtime container listens on port `8080`.

The deployed asset tree remains root-owned. Only `/usr/share/nginx/html/config.json` is writable by the unprivileged nginx user so the startup selector cannot modify application bundles.

The checked-in nginx config lives at `docker/nginx/default.conf`. It provides the React Router fallback for routes served behind the `/search/` deployment path.

The `.dockerignore` file intentionally allowlists only Docker build inputs. Update it when new files become required for production builds.

CI validates pull requests with Cypress before any Docker job. Same-repo pull requests publish one generic preview image. Fork pull requests run validation only and do not build or publish Docker images. Pushes to `main` publish `latest` and immutable `sha-*` production tags and sign images with cosign.

Dependabot covers GitHub Actions, pnpm-managed npm dependencies, and Docker base images. Docker updates intentionally ignore Node.js versions `>=25` while this project is pinned to Node 24.

Keep Vite base path, Docker/nginx behavior, and Traefik routing assumptions synchronized when changing deployment behavior.

## Documentation maintenance

Update `AGENTS.md` and this file whenever install commands, scripts, test tooling, deployment assumptions, or backend API expectations change. Update `docs/VIEWERS.md` whenever viewer dispatch, routes, package names, or embedding assumptions change.
