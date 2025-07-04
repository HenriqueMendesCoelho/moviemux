FROM node:24.3.0-alpine3.22 as build-stage

ARG CINE_BACKEND_URL=${CINE_BACKEND_URL}
ARG CINE_BACKEND_SOCKET_URL=${CINE_BACKEND_SOCKET_URL}
ENV CINE_BACKEND_URL=${CINE_BACKEND_URL}
ENV CINE_BACKEND_SOCKET_URL=${CINE_BACKEND_SOCKET_URL}

WORKDIR /usr/src/app

COPY . .

RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile

RUN pnpm build


FROM node:24.3.0-alpine3.22 as production-stage

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

COPY --from=build-stage /usr/src/app/dist ./dist
COPY --from=build-stage /usr/src/app/node_modules ./node_modules

USER appuser

EXPOSE 3000
CMD [ "node", "./dist/ssr/index.js" ]

