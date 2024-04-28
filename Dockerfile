FROM node:20.11.1-slim as build-stage

ARG CINE_BACKEND_URL=${CINE_BACKEND_URL}
ARG CINE_BACKEND_SOCKET_URL=${CINE_BACKEND_SOCKET_URL}
ENV CINE_BACKEND_URL=${CINE_BACKEND_URL}
ENV CINE_BACKEND_SOCKET_URL=${CINE_BACKEND_SOCKET_URL}

WORKDIR /usr/src/app
COPY . .
RUN corepack enable
RUN yarn install
RUN yarn build

FROM node:20.5.1-slim as production-stage

WORKDIR /usr/src/app
COPY --from=build-stage /usr/src/app/dist ./dist
COPY --from=build-stage /usr/src/app/node_modules ./node_modules

EXPOSE 3000
CMD [ "node", "./dist/ssr/index.js" ]
