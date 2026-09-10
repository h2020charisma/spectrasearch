FROM node:24.21.0-slim AS build-stage

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CYPRESS_INSTALL_BINARY=0

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install --frozen-lockfile

COPY index.html vite.config.js ./
COPY scripts/select-config.mjs ./scripts/select-config.mjs
COPY public ./public
COPY src ./src

RUN pnpm build-docker


FROM eclipse-temurin:25.0.4_7-jdk@sha256:dcf835e52330939b6c9f90ecab8aafcbcaa8fbf48423db44de884cf978c10144 AS java-build-stage

WORKDIR /app

# The wrapper validates the configured ZIP; without unzip it silently switches to a tarball.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*

COPY --chmod=755 mvnw ./mvnw
COPY .mvn ./.mvn
COPY pom.xml ./pom.xml
COPY src/main/java ./src/main/java
COPY src/main/resources ./src/main/resources
COPY --from=build-stage /app/dist ./dist

RUN ./mvnw --batch-mode clean package -DskipTests


FROM eclipse-temurin:25.0.4_7-jre@sha256:15090d159279e5c158473eccb48cd87f57b3e3a47511a797eb5a7a7ea6f86b0f

ENV QUARKUS_HTTP_HOST=0.0.0.0

WORKDIR /deployments

COPY --from=java-build-stage /app/target/quarkus-app/ ./

USER 1001

RUN test -r quarkus-run.jar \
    && test ! -w quarkus-run.jar \
    && test ! -w app \
    && test ! -w lib \
    && test ! -w quarkus \
    && test -w /tmp

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]
