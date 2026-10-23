# NoWaste progress

## How to run (short)

Full steps for a new laptop are in README.md.

1. `npm ci` (root only)
2. Copy `server/.env.example` to `server/.env` and `app/.env.example` to `app/.env`
3. `npm run db:up`, then `npm run migrate` and `npm run migrate:test`
4. `npm test` and `npm run lint`
5. `npm run dev:server` in one terminal, `npm run dev:app` in another, then scan the QR code with Expo Go

## Sprint 1 (19 Oct to 1 Nov, 40 points)

| Turn | Owner  | Stories                    | Points | Status                                      | PR link |
| ---- | ------ | -------------------------- | ------ | ------------------------------------------- | ------- |
| 1    | Maryam | US-01, US-09 and skeleton  | 8      | Skeleton built; US-01 and US-09 not started |         |
| 2    | Marina | US-02, US-03 and test plan | 5      | Not started                                 |         |
| 3    | Menna  | US-04, US-07               | 8      | Not started                                 |         |
| 4    | Eman   | US-10, US-11, US-13        | 9      | Not started                                 |         |
| 5    | Farah  | US-18, US-19               | 10     | Not started                                 |         |

## Last turn (who, date, what was done, number of tests passing)

- **Who:** Maryam (Turn 1, part 1: skeleton)
- **Date:** 2026-10-23
- **What was done:** npm workspaces (app, server); Expo SDK 58 app with expo-router, TypeScript strict, Arabic and English i18n files, home screen that calls GET /health; Express server with two entry points (src/api.ts, src/worker.ts) and the SDD layer folders; docker-compose PostgreSQL 16 + PostGIS 3 with the nowaste and nowaste_test databases; first migration (postgis, citext, settings table seeded with BR-01 to BR-12 and TBD-5); GET /health; Jest tests for server and app; ESLint and Prettier; GitHub Actions CI; PR template; docs (traceability, test plan, acceptance tests, feedback changes); CLAUDE.md.
- **Tests passing:** 17 (server 15, app 2). Lint, typecheck and build pass. CI has not run yet (nothing pushed).

## Next turn (who, what to start with)

- **Who:** Maryam (Turn 1, part 2)
- **Start with:** answer the open questions for US-01 (password rules TBD-4, phone format) and US-09 (first-launch language, where the choice is stored before login). Then write the US-01 tests (FR-ACC-01, E-ACC-01, E-ACC-02) and the US-09 tests (FR-ACC-09, IF-UI-02, IF-UI-03, NFR-06) before the code.

## Decisions (ID, decision, date, which SRS/SDD item it closes or changes)

| ID   | Decision                                                                                                                                                                                                   | Date       | Closes or changes                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| D-01 | Backend: Node.js LTS + TypeScript + Express, one codebase with two entry points: src/api.ts (C-02) and src/worker.ts (C-19).                                                                               | 2026-10-23 | Closes the backend-framework part of SRS TBD-2. Providers of the external services stay open. |
| D-02 | App: Expo SDK 58 (runs in Expo Go) + React Native + TypeScript + expo-router.                                                                                                                              | 2026-10-23 | Implements SRS 2.4 / SDD C-01 (React Native, NFR-14).                                         |
| D-03 | Database: PostgreSQL 16 + PostGIS 3 in Docker (service "db"), migrations with node-pg-migrate (SQL files in server/migrations), separate nowaste_test database.                                            | 2026-10-23 | Implements SDD C-28.                                                                          |
| D-04 | Tests: Jest + ts-jest + Supertest on the server against the real nowaste_test database; jest-expo + React Native Testing Library in the app. ESLint + Prettier + TypeScript strict in both.                | 2026-10-23 | Supports NFR-13.                                                                              |
| D-05 | Rule values are stored in the settings table. Each BR row holds the numbers from SRS 5.5 as JSON (for example BR-02 = {"hold_minutes": 45}); the full rule text is in the description column.              | 2026-10-23 | Implements SDD 4.2 "Settings".                                                                |
| D-06 | TypeScript is pinned to 6.0 in both workspaces, because ts-jest does not support TypeScript 7 yet.                                                                                                         | 2026-10-23 | none                                                                                          |
| D-07 | The database host port is configurable (DB_HOST_PORT in a root .env, default 5432), for laptops where port 5432 is already used.                                                                           | 2026-10-23 | none                                                                                          |
| D-08 | GET /health goes through a small infrastructure service (server/src/services/health), so the route still calls a service and SQL stays in server/src/data. It is not one of the SDD services C-03 to C-18. | 2026-10-23 | none                                                                                          |
| D-09 | The root package.json has `"overrides": {"react": "19.3.0"}` so the workspace has exactly one React, the version Expo SDK 58 expects. Two copies break React hooks.                                        | 2026-10-23 | none                                                                                          |
| D-10 | Extra skeleton tests beyond the two requested: HEALTH-03 (503 when the database is down), HEALTH-04 (home screen shows "not reachable"), and one test per BR row of the settings seed.                     | 2026-10-23 | none                                                                                          |

## Open questions

1. **TBD-1:** minimum Android and iOS versions (SRS Appendix C).
2. **TBD-2 (rest):** providers of the payment gateway, AI vision, language model, speech, map, push, email and SMS, and object storage.
3. **TBD-4:** password rules (length and character types), needed for E-ACC-02 in US-01.
4. **US-01:** the valid phone number format (E-ACC-02 needs one; the SRS does not give it).
5. **US-01:** whether sign-up needs email or SMS verification (not stated in the SRS).
6. **US-01:** which salted hash algorithm to use for passwords (NFR-09b names none).
7. **US-09:** the language shown on the very first launch (device language, Arabic, or English). The skeleton uses English for now.
8. **US-09:** where the language choice is stored before login. FR-ACC-09 allows switching before an account exists, but SDD 4.2 stores language only on the User row.
9. **BR-10 / TBD-5:** the settings table has both a BR-10 row (minutes_before_window_end: null) and a TBD-5 row (null). When TBD-5 is decided, should BR-10 read the TBD-5 row, or should both rows be updated?
10. **SDD C-24 Map View:** the task asked for adapter folders C-20 to C-26, but the SDD places C-24 inside the app. No server folder was created for C-24. Confirm.
11. **Arabic texts:** the Arabic strings in app/src/i18n/ar.json should be checked by an Arabic speaker on the team.
12. **npm install scripts:** npm 11 blocks install scripts that are not approved (esbuild, unrs-resolver, @parcel/watcher). Everything works without them so far. Should the team approve them in package.json (`npm install-scripts approve <pkg>`)?
13. **npm audit:** 4 high-severity advisories come from Expo's own CLI (node-forge via @expo/code-signing-certificates). `npm audit fix --force` would downgrade Expo, so it was not run. Wait for an Expo patch release?

## Document updates needed (SRS/SDD changes we found while building)

- SRS Appendix C / SDD 2.4: record D-01 as the backend part of TBD-2.
- SDD 3.1.1 and Figure 1: show the worker (C-19) as an entry point beside the API (C-02), not a layer under it (docs/feedback-changes.md).
- SDD 4.2: add the address and pickup-location changes from docs/feedback-changes.md (US-02, US-10, US-11) and the perishability/shelf-life tables (US-18).
