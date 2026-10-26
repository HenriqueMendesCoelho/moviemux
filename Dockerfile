FROM node:24.3.0-alpine3.22 as build-stage

ARG CINE_BACKEND_URL=${CINE_BACKEND_URL}
ARG CINE_BACKEND_SOCKET_URL=${CINE_BACKEND_SOCKET_URL}
ARG TMDB_IMAGE_BASE=${TMDB_IMAGE_BASE}

ENV TMDB_IMAGE_BASE=${TMDB_IMAGE_BASE}
ENV CINE_BACKEND_URL=${CINE_BACKEND_URL}
ENV CINE_BACKEND_SOCKET_URL=${CINE_BACKEND_SOCKET_URL}

WORKDIR /usr/src/app

COPY . .

RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile && \
    pnpm --dir src-ssr install --frozen-lockfile && \
    pnpm --dir src-pwa install --frozen-lockfile

RUN pnpm build

# SSR runtime dependencies (express, vue, quasar...) are installed into the build output
RUN pnpm --dir dist/ssr install --prod


FROM node:24.3.0-alpine3.22 as production-stage

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

COPY --from=build-stage /usr/src/app/dist ./dist

USER appuser

EXPOSE 3000
CMD [ "node", "./dist/ssr/index.js" ]

