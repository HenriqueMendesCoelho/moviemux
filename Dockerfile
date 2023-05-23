FROM arm64v8/node:18.16-slim as build-stage

WORKDIR /app

COPY . .

RUN corepack enable
RUN yarn install
RUN yarn build

FROM arm64v8/nginx:stable-alpine-slim as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]