# Movie Mux - Movie Rating Portal

## Frontend development (Nuxt)

The frontend uses **Nuxt 4**, **Vue 3**, **TypeScript**, **Pinia** and a custom responsive design system. Domain modules remain in `src/modules`; `src/pages` only adapts existing module views to Nuxt routes. The original MovieMux logo and `#00f6ff` primary color are preserved in both themes.

### Requirements

- Node **26.13.0** (`.node-version` / `.nvmrc`)
- pnpm **12.16.1** (`packageManager`)

TypeScript **6.0.3** is the newest compatible compiler for the current Vue type checker and typescript-eslint. TypeScript 7.0.2 was tested but is not supported by those tools: vue-tsc cannot resolve its compiler API and typescript-eslint explicitly rejects it. Checks are retained rather than disabled.

### Run

```sh
npm install --global pnpm@12.16.1
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev --dotenv .env.local
```

Configure these **public endpoint URLs**, never secrets:

- `NUXT_PUBLIC_API_URL`: gateway base including `/api` (for example `http://localhost:8080/api`). Direct monolith access instead requires its `/api/monolith` context path.
- `NUXT_PUBLIC_SOCKET_URL`: separate Socket.IO service origin (default local transport `http://localhost:3334`; `/ws` path remains unchanged).
- `NUXT_PUBLIC_TMDB_IMAGE_BASE`: image base, normally `https://image.tmdb.org/t/p`.

The gateway and Socket.IO service are separate endpoints: the gateway does not forward `/ws`. Prefer a same-origin reverse proxy for browser deployment. The currently inspected gateway CORS configuration omits `PATCH`; cross-origin profile/password/review/watchlist mutations require the gateway owner to allow that method, or same-origin routing. This frontend retains the backend’s existing PATCH contracts.

Legacy build-time `CINE_BACKEND_URL`, `CINE_BACKEND_SOCKET_URL` and `TMDB_IMAGE_BASE` values remain fallbacks. Prefer `NUXT_PUBLIC_*` variables for runtime deployment configuration. Authentication and authorization must still be enforced by the backend; decoded client JWT roles only control frontend navigation.

### Local same-origin backend testing

For a gateway running locally on port 18081, enable the opt-in development proxy:

```sh
NUXT_PUBLIC_API_URL=/api MOVIEMUX_DEV_API_ORIGIN=http://127.0.0.1:18081 pnpm dev --host 127.0.0.1
```

Set `NUXT_PUBLIC_API_URL=/api` explicitly (or unset any absolute runtime override); Nuxt runtime environment values otherwise override configuration defaults. The browser calls the frontend’s `/api` on the same origin; Nitro forwards to the local gateway while retaining `/api`, Authorization, request bodies and HTTP methods including PATCH. Only loopback HTTP origins are allowed; do not put secrets in the target. This setting applies only to the development server, not production builds or deployments. The gateway must point to the local monolith (for example port 18080, context `/api/monolith`); Socket.IO remains a separate configured local service.

The proxy can be checked without external services using `node tests/dev-proxy-smoke.ts` (local echo upstream only).

### Verify and build

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:ssr
pnpm test:pwa
node .output/server/index.mjs
```

`test:ssr` runs the production build against isolated fictional fixtures and checks redirects, malformed tokens, concurrent session isolation, routes and PWA assets. Component/unit tests use mocks. Neither replaces acceptance against the real backend.

For a local interactive preview without a backend, see [QA fixture instructions](scripts/qa/README.md). Fixture tokens are not real credentials and that server must never be deployed.

### Deployment

The Dockerfile builds a Nitro server and runs as non-root. Supply endpoint variables at runtime; expose port 3000. The runtime entrypoint changed from Quasar's `dist/ssr/index.js` to **`.output/server/index.mjs`**. No backend contracts or database changes are needed.

PWA support preserves the app's original icons and standalone presentation. Only public frontend assets and the explicit offline notice are precached; authenticated API data is not cached. Updates are offered through an in-app prompt.

---

## Introduction:

This is a personal project aimed at creating a comprehensive movie rating portal. Whether you're a movie buff or simply looking for a way to discover new films.

Inspired by IMDB and TMDB.

## Inspiration:

The project takes inspiration from renowned platforms such as IMDB (Internet Movie Database) and TMDB (The Movie Database), aiming to provide a comparable range of features and functionalities.

## Technologies

```
Vue.js, Java, Spring Boot, Lombok, Hibernate, Apache Maven, PostgreSQL, Discord API, Git, Github, Docker, Angular 16, Bootstrap, NodeJS, ExpressJS, Axios,Typescript, Prisma, SQLite, HTML, CSS, SASS, VSCode, Quasar Framework, TypeORM, Socket.io, Kotlin, Spring Cloud Gateway, Spring Webflux, Redis, Nginx...
```

<div >
	<img width="50" src="https://user-images.githubusercontent.com/25181517/117448124-a2da9800-af3e-11eb-85d2-bd1b69b65603.png" alt="Vue.js" title="Vue.js"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/183890598-19a0ac2d-e88a-4005-a8df-1ee36782fde1.png" alt="TypeScript" title="TypeScript"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/117201156-9a724800-adec-11eb-9a9d-3cd0f67da4bc.png" alt="Java" title="Java"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/183891303-41f257f8-6b3d-487c-aa56-c497b880d0fb.png" alt="Spring Boot" title="Spring Boot"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/117207493-49665200-adf4-11eb-808e-a9c0fcc2a0a0.png" alt="Hibernate" title="Hibernate"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/185062810-7ee0c3d2-17f2-4a98-9d8a-a9576947692b.png" alt="Kotlin" title="Kotlin"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/183568594-85e280a7-0d7e-4d1a-9028-c8c2209e073c.png" alt="Node.js" title="Node.js"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/183859966-a3462d8d-1bc7-4880-b353-e2cbed900ed6.png" alt="Express" title="Express"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/187070862-03888f18-2e63-4332-95fb-3ba4f2708e59.png" alt="websocket" title="websocket"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/192108374-8da61ba1-99ec-41d7-80b8-fb2f7c0a4948.png" alt="GitHub" title="GitHub"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/192108372-f71d70ac-7ae6-4c0d-8395-51d8870c2ef0.png" alt="Git" title="Git"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/192158954-f88b5814-d510-4564-b285-dff7d6400dad.png" alt="HTML" title="HTML"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/183898674-75a4a1b1-f960-4ea9-abcb-637170a00a75.png" alt="CSS" title="CSS"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/192158956-48192682-23d5-4bfc-9dfb-6511ade346bc.png" alt="Sass" title="Sass"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/183898054-b3d693d4-dafb-4808-a509-bab54cf5de34.png" alt="Bootstrap" title="Bootstrap"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/183890595-779a7e64-3f43-4634-bad2-eceef4e80268.png" alt="Angular" title="Angular"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/183049794-a3dfaddd-22ee-4ffe-b0b4-549ccd4879f9.png" alt="yarn" title="yarn"/>
	<img width="50" src="https://github-production-user-asset-6210df.s3.amazonaws.com/62091613/261395532-b40892ef-efb8-4b0e-a6b5-d1cfc2f3fc35.png" alt="Vite" title="Vite"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/117207242-07d5a700-adf4-11eb-975e-be04e62b984b.png" alt="Maven" title="Maven"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/190229463-87fa862f-ccf0-48da-8023-940d287df610.png" alt="Lombok" title="Lombok"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/117208740-bfb78400-adf5-11eb-97bb-09072b6bedfc.png" alt="PostgreSQL" title="PostgreSQL"/>
	<img width="50" src="https://github.com/marwin1991/profile-technology-icons/assets/136815194/82df4543-236b-4e45-9604-5434e3faab17" alt="SQLite" title="SQLite"/>
	<img width="50" src="https://user-images.githubusercontent.com/25181517/117207330-263ba280-adf4-11eb-9b97-0ac5b40bc3be.png" alt="Docker" title="Docker"/>
  <img width="50" src="https://user-images.githubusercontent.com/25181517/182884894-d3fa6ee0-f2b4-4960-9961-64740f533f2a.png" alt="Redis" title="Redis"/>
  <img width="50" src="https://user-images.githubusercontent.com/25181517/183345125-9a7cd2e6-6ad6-436f-8490-44c903bef84c.png" alt="Nginx" title="Nginx"/>
</div>

## Images

<p align="center">
Home Page
</p>
<p align="center">
  <img src="./showcase/home.png" style="width: 500px;" />
</p>

<p align="center">
Movie Page
</p>
<p align="center">
  <img src="./showcase/movie.png" style="width: 500px;" />
</p>

<p align="center">
Discover Page
</p>
<p align="center">
  <img src="./showcase/discover.png" style="width: 500px;" />
</p>
<p align="center">
  <img src="./showcase/discover2.png" style="width: 500px;" />
</p>

<p align="center">
Movie Watchlist Page
</p>
<p align="center">
  <img src="./showcase/watchlist.png" style="width: 500px;" />
</p>
<p align="center">
  <img src="./showcase/watchlist2.png" style="width: 500px;" />
</p>

<p align="center">
Dashboard
</p>
<p align="center">
  <img src="./showcase/dashboard.png" style="width: 500px;" />
</p>

### Website (Access by invitation only):

[Movie Mux](https://www.moviemux.com)

### Project Ecosystem:

[Movie Mux Back-End](https://github.com/HenriqueMendesCoelho/cine-kronusBoss-api) - A corresponding backend project complements the frontend, ensuring the cohesive operation of the movie rating portal.<br>
[Movie Mux Socket.io Back-End](https://github.com/HenriqueMendesCoelho/moviemux-websocket) - Designed and implemented a real-time update system using Socket.io<br>
[Movie Mux Gateway](https://github.com/HenriqueMendesCoelho/moviemux-gateway) - The gateway serves as a single entry point for all client requests, routing them to the appropriate backend services.

External integration aggregator projects<br>
[Kronus Integration Tool Front-End](https://github.com/HenriqueMendesCoelho/kronus-integration-tool-frontend)<br>
[Kronus Integration Tool Back-End](https://github.com/HenriqueMendesCoelho/kronus-integration-tool-api)

### This product uses the TMDB API but is not endorsed or certified by TMDB.
