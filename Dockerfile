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

COPY --from=requirements-stage /tmp/dist /usr/share/nginx/html
