FROM node:24.18.0-slim AS build-stage

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CYPRESS_INSTALL_BINARY=0

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install --frozen-lockfile

ARG VITE_BASE_URL="https://api.ramanchada.ideaconsult.net/"
ENV VITE_BASE_URL=$VITE_BASE_URL

ARG VITE_AMBIT_URL="https://apps.ideaconsult.net/nanoreg1/"
ENV VITE_AMBIT_URL=$VITE_AMBIT_URL

ARG VITE_PREDICTIONS_CORE="vega"
ENV VITE_PREDICTIONS_CORE=$VITE_PREDICTIONS_CORE

ARG VITE_CHEMICALS_CORE="dsstox"
ENV VITE_CHEMICALS_CORE=$VITE_CHEMICALS_CORE

ARG VITE_SUBJECT_FIELD="dsstox_id_s"
ENV VITE_SUBJECT_FIELD=$VITE_SUBJECT_FIELD

ARG VITE_HSDS_URL="https://hsds.adma.ai"
ENV VITE_HSDS_URL=$VITE_HSDS_URL

ARG VITE_HSDS_DOMAIN="/qubounds"
ENV VITE_HSDS_DOMAIN=$VITE_HSDS_DOMAIN

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

RUN pnpm build-docker


FROM nginxinc/nginx-unprivileged:1.31

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 8080
