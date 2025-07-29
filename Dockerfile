FROM node:lts-alpine AS requirements-stage

WORKDIR /tmp

COPY \
      ./.env \
      ./.eslintrc.cjs \
      ./index.html \
      ./package*.json \
      ./vite.config.js \
      /tmp
COPY ./public /tmp/public
COPY ./src /tmp/src

RUN npm install
RUN npm run build-docker


FROM nginx:mainline

# Allow React routing. Fail if the configuration file is not modified.
RUN configfile="/etc/nginx/conf.d/default.conf"; \
    confighash="$(md5sum "${configfile}")"; \
    sed -Ei \
      '/\s*location\s+\/\s+\{\s*$/a \        try_files $uri /index.html;' \
      "${configfile}" && \
    printf "${confighash}" | md5sum --check --status - && exit 1 || true

COPY --from=requirements-stage /tmp/dist /usr/share/nginx/html
