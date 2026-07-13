FROM node:24.18.0-slim AS build-stage

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CYPRESS_INSTALL_BINARY=0

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install --frozen-lockfile

COPY index.html vite.config.js ./
COPY scripts ./scripts
COPY public ./public
COPY src ./src

RUN pnpm build-docker


FROM nginxinc/nginx-unprivileged:1.31

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/entrypoint.d/*.sh /docker-entrypoint.d/
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY --from=build-stage --chown=101:0 /app/dist/config.json /usr/share/nginx/html/config.json

EXPOSE 8080
