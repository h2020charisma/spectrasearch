FROM node:24.18.0-slim AS build-stage

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CYPRESS_INSTALL_BINARY=0

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install --frozen-lockfile

ARG VITE_BaseURL="https://api.ramanchada.ideaconsult.net/"
ENV VITE_BaseURL=$VITE_BaseURL

ARG VITE_PredictionsCore="vega"
ENV VITE_PredictionsCore=$VITE_PredictionsCore

ARG VITE_ChemicalsCore="dsstox"
ENV VITE_ChemicalsCore=$VITE_ChemicalsCore

ARG VITE_SubjectField="dsstox_id_s"
ENV VITE_SubjectField=$VITE_SubjectField

ARG VITE_HsdsUrl="https://hsds.adma.ai"
ENV VITE_HsdsUrl=$VITE_HsdsUrl

ARG VITE_HsdsDomain="/qubounds"
ENV VITE_HsdsDomain=$VITE_HsdsDomain

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

RUN pnpm build-docker


FROM nginxinc/nginx-unprivileged:1.31

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 8080
