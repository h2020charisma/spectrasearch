FROM node:24.17.0-slim AS build-stage

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CYPRESS_INSTALL_BINARY=0

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install --frozen-lockfile

ARG VITE_BaseURL="https://api.ramanchada.ideaconsult.net/"
ENV VITE_BaseURL=$VITE_BaseURL

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

RUN pnpm build-docker


FROM nginxinc/nginx-unprivileged:1.31

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 8080
