FROM node:18.16-slim as build-stage

WORKDIR /app

COPY . .

RUN corepack enable
RUN yarn install
RUN yarn build

ARG API_HOST
ARG REDIRECT_DOMAIN

ENV API_HOST=${API_HOST}
ENV REDIRECT_DOMAIN=${REDIRECT_DOMAIN}


FROM nginx:stable-alpine-slim as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]