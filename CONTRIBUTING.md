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
- Docker is optional for local app development, but useful for testing the production container.

## Start developing

Clone the repository and install dependencies:

```sh
pnpm install --frozen-lockfile
```

Create a local environment file:

```sh
cp .env.example .env
```

Edit `.env` if you need a non-default backend:

```sh
VITE_BaseURL="https://api.ramanchada.ideaconsult.net/"
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

Cypress uses `cypress-dotenv`, so `.env` should contain the backend URL expected by the tests.

Cypress fixtures for `/db/query/sources` should mirror the backend discovery response, including `application_name`, `fields`, and `similarity` when tests exercise dynamic sidebar or similarity behavior.

## Using specific Node.js versions

The Dockerfile `FROM node:x.y.z-slim AS build-stage` line is the source of truth for the Node.js version used by CI and Docker builds.

Use a compatible local Node.js version for development. When changing the Docker Node.js version, update this file, `AGENTS.md`, Docker, and CI together.

## Backend API expectations

- `VITE_BaseURL` must point to a `ramanchada-api` deployment and should end with `/`.
- The app discovers data sources, fields, app name, and similarity modes from `GET /db/query/sources`.
- Search requests use `GET /db/query` with repeated `data_source` parameters where needed.
- Dynamic filters should follow backend field names returned by discovery; qdynamic filters are sent as `qdynamic.<field>=value`.
- Similarity uploads use `POST /db/download?what=knnquery` with multipart form field `files`.
- Chart previews use `GET /db/dataset?domain=<domain>&values=True`.

## Dependency updates

Routine dependency updates should go through a pull request and pass CI.

When updating dependencies:

1. Use `pnpm add <package>@<version>` or another intentional pnpm update command.
2. Review both `package.json` and `pnpm-lock.yaml`.
3. Run `pnpm lint` and the relevant Cypress checks.
4. Mention any breaking changes or skipped checks in the pull request.

For urgent security fixes, review the advisory, changelog, package diff, and transitive dependency changes before merging.

## Docker and deployment

The app is served under `/search/`. Current deployment uses Traefik with `PathPrefix('/search')` and prefix stripping before requests reach nginx.

Docker builds pass `VITE_BaseURL` as a build argument. This allows images for different backend deployments while keeping the frontend code backend-discovery driven.

Docker uses Corepack with pnpm in the pinned Node.js build stage and `nginxinc/nginx-unprivileged` at runtime. The runtime container listens on port `8080`.

The checked-in nginx config lives at `docker/nginx/default.conf`. It provides the React Router fallback for routes served behind the `/search/` deployment path.

The `.dockerignore` file intentionally allowlists only Docker build inputs. Update it when new files become required for production builds.

CI validates pull requests with Cypress before any Docker job. Same-repo pull requests publish preview images for all configured backend targets. Fork pull requests run validation only and do not build or publish Docker images. Pushes to `main` publish production tags and sign images with cosign.

Dependabot covers GitHub Actions, pnpm-managed npm dependencies, and Docker base images. Docker updates intentionally ignore Node.js versions `>=25` while this project is pinned to Node 24.

Keep Vite base path, Docker/nginx behavior, and Traefik routing assumptions synchronized when changing deployment behavior.

## Documentation maintenance

Update `AGENTS.md` and this file whenever install commands, scripts, test tooling, deployment assumptions, or backend API expectations change.
