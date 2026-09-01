# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Feeder — a self-hosted news aggregator. Angular 22 SPA frontend + NestJS 11 API backend,
MySQL (TypeORM) for persistence, Redis + BullMQ for queues/cache, Playwright for scraping
sites that have no RSS feed.

## Repo layout

Split monorepo with **no npm workspaces**. Each app is installed and run independently:

- `backend/`  — NestJS API (`npm` root here, own `node_modules`)
- `frontend/` — Angular SPA (`npm` root here, own `node_modules`)
- root `package.json` — tooling only: Biome, commitlint, lefthook, secretlint
- `exemple/` — reference skeleton copied from another project; **not compiled, not imported**. Ignore unless explicitly asked.
- `.ai-scripts/` — throwaway test/PoC scripts live here (per `gemini.md`); never leave scratch scripts elsewhere.

Node version is pinned to 24.14.0 (`.tool-versions`).

## Common commands

### Docker (preferred for running the whole stack)
```sh
docker compose up -d                              # mysql + redis + backend (:3000) + frontend (:4200)
docker compose -f docker-compose.tools.yml up -d  # phpMyAdmin (:8080), Redis Commander (:8081)
```

### Backend (`cd backend`)
```sh
npm run start:dev        # watch mode
npm run build            # nest build -> dist/
npm run start:prod       # node dist/main
npm run lint             # eslint --fix
npm run format           # prettier --write
npm test                 # jest (all *.spec.ts under src/)
npm test -- feeds.service        # single spec by name pattern
npx jest src/feeds/feeds.service.spec.ts   # single spec by path
npm run test:e2e         # jest with test/jest-e2e.json
npm run test:cov         # coverage
npx ts-node src/refresh.ts   # one-off: enqueue a scrape job for every Source
```

### Frontend (`cd frontend`)
```sh
npm start                # ng serve --poll 2000 (:4200)
npm run build            # ng build
npm test                 # ng test (Vitest)
```

### Lint / commit (root)
```sh
npx @biomejs/biome check --write .   # root formatter/linter (tab, width 4, single quotes)
npx lefthook install                 # enable git hooks once after clone
```

`lefthook` pre-commit runs `secretlint` on staged files and `biome check --write` on staged
`*.{js,ts,cjs,mjs,json}` — expect Biome to reformat staged backend/frontend files against the
**root** style, which differs from each app's own Prettier config. Commits must follow
Conventional Commits; scope must be one of `back|front|infra|docs|deps|repo|db|scripts|config`
and the header ≤ 100 chars.

## Backend architecture

`AppModule` (`backend/src/app.module.ts`) wires: global `ConfigModule`, `TypeOrmModule` (MySQL,
`autoLoadEntities`, **`synchronize: true`** — schema is auto-migrated, there are no migration
files), `BullModule` (Redis connection), `ScheduleModule`, plus feature modules `AuthModule`,
`FeedsModule`, `ScraperModule`, `WebhooksModule`, `LoggingModule`, `HealthModule`.

### The scraping pipeline (core flow)

1. `FeedsScheduler` (`feeds/feeds.scheduler.ts`) — cron `0,30 * * * *`. Finds `Source` rows
   whose `nextFetchAt` is due (or null) and adds a `fetch` job to the BullMQ **`scraper`**
   queue, spaced 15s apart.
2. `ScraperProcessor` (`scraper/scraper.processor.ts`) — consumes `scraper`. Branches on
   `Source.type`:
   - `RSS`: `rss-parser` with custom `media:*` fields; dedupes by `(url, source)`; extracts
     image from enclosure / media tags / first `<img>`.
   - `SCRAPE`: launches Playwright chromium. Optional `Subscription.authStorageState` is loaded
     as browser storage state for authenticated feeds. Three sub-modes based on
     `Source.selectors`: (a) `selectors.script` — arbitrary JS run via `page.evaluate`,
     must return `[{title,url,content?,imageUrl?,date?}]`; (b) `selectors.item` + field
     selectors — per-card extraction; (c) fallback — single item from the page.
   - New articles are saved, then `triggerWebhooks(article, source)` runs.
3. After processing, `calculateNextFetch` updates `Source.lastFetchAt`, `consecutiveMisses`,
   and `nextFetchAt` = now + (avg gap between last ≤10 articles) × `1.5^consecutiveMisses`,
   clamped to [1h, 14d].
4. `triggerWebhooks` resolves which users subscribe to the source, finds their active
   `Webhook`s, matches `triggerType` (`ALL` / `SOURCE` / `TAG`), renders `payloadTemplate`
   (`{{item.*}}`, `{{feed.name}}` placeholders), and adds a `dispatch` job to the BullMQ
   **`webhooks`** queue.
5. `WebhooksProcessor` (`webhooks/webhooks.processor.ts`) — POSTs the payload with an
   `x-feeder-signature` HMAC-SHA256 header keyed by `webhook.secret`.

### Data model (`*/entities/*.entity.ts`, all UUID PKs)

- `Source` — a feed/site (shared, public). `type` RSS|SCRAPE, `selectors` (json), scheduling
  columns (`nextFetchAt`, `lastFetchAt`, `consecutiveMisses`, `cronSchedule`, `userScheduleHint`).
- `Subscription` — user ↔ source join with per-user `tags`, `customName`, and
  `authStorageState` (Playwright login state for private feeds).
- `Article` — belongs to a `Source`; deduped by `(url, source)`.
- `UserArticleState` — user ↔ article read/saved flags.
- `User`, `UserCredential` — account + WebAuthn credentials.
- `Webhook` — per-user outbound webhook (`triggerType`, `triggerValue`, `payloadTemplate`, `secret`).

**Privacy rule** (`gemini.md`): public feeds are deduplicated into one shared `Source`;
authenticated feeds are strictly isolated per user through `Subscription.authStorageState`.

### Auth

`auth/auth.service.ts` supports password (bcrypt) and WebAuthn passkeys
(`@simplewebauthn/server`). Login returns a JWT; protect routes with `JwtAuthGuard` /
`JwtStrategy`. WebAuthn challenge state is stored in Redis via a direct `ioredis` client
constructed in `AuthService` (not the shared Redis module). `AuthModule` exports `JwtModule`
so other feature modules can import it for guards.

## Frontend architecture

Angular 22, **standalone components**, bootstrapped in `src/app/app.config.ts` (no NgModules).

- **Routing** — `src/app/app.routes.ts`, flat routes guarded by `authGuard` / `adminGuard`
  (`core/guards/`). Pages in `src/app/pages/*.component.ts` (dashboard, login, register,
  discover, reader, settings, admin, webhooks-config).
- **UI** follows **Atomic Design**: `ui/atoms`, `ui/organisms`, `ui/templates`. Styling is
  **Tailwind 3** (`tailwind.config.js`). Icons: `@lucide/angular`. Code editing:
  `@monaco-editor/loader` (`ui/code-editor.component.ts`) for feed selector scripts.
- **HTTP** — `core/auth.interceptor.ts` reads `localStorage['access_token']` and adds the
  `Authorization: Bearer` header. Services under `core/services/` (`feeds.service.ts`,
  `webhooks.service.ts`) **hardcode `http://localhost:3000`** — there is no dev proxy; the
  backend allows all CORS origins.
- **i18n** — `@ngx-translate`, JSON catalogs in `public/i18n/{en,pt,es}.json`, default `en`.
- **Theme** — `core/theme.service.ts` toggles light/dark.

## Conventions & gotchas

- Follow `gemini.md` (project's 12-rule working agreement, in Portuguese): make surgical
  changes, match existing style ("Clean Code + standard NestJS", **not** strict Hexagonal),
  put throwaway scripts in `.ai-scripts/`, always use Docker for orchestration, fail loudly.
- **Vendored / drifting modules**: `backend/src/{config,logging,health,redis,encryption,common}`
  were copied from another project ("gatuno"). `config/app-config.schema.ts` is that project's
  Joi schema (requires `DB_TYPE`, `API_URL`, `USERADMIN_EMAIL`, Kafka/MQTT/RustFS vars…) and
  does **not** match Feeder's `.env` / `.env.example`. `LoggingModule` and `HealthModule` are
  imported by `AppModule` and pull in `AppConfigModule`. Before assuming these work, verify
  `cd backend && npm run start:dev` actually boots; prefer `feeds/`, `scraper/`, `webhooks/`,
  `auth/` as the source of truth for real Feeder behavior.
- Backend TS path aliases exist (`@config/*`, `@redis/*`, `@common/*`, `@/*`, …) but are only
  used by the vendored modules; feature code uses relative imports.
- `synchronize: true` — an entity change rewrites the live MySQL schema on next boot. There is
  no migration workflow.
- Env: copy `.env.example` to `.env`. Inside Docker, `DB_HOST=mysql` / `REDIS_HOST=redis`;
  running Node natively, both are `localhost`.
- Some backend values are hardcoded rather than read from config (e.g. `AuthService.rpID`,
  `origin`, JWT `expiresIn: '1d'`); `RP_NAME`/`RP_ID`/`ORIGIN` env vars exist but aren't all wired.
