# NoWaste

NoWaste is a location-based mobile app that reduces food waste in Egypt (course project).
Requirements: [docs/SRS.pdf](docs/SRS.pdf). Design: [docs/SDD.pdf](docs/SDD.pdf). Changes after feedback: [docs/feedback-changes.md](docs/feedback-changes.md). Progress: [PROGRESS.md](PROGRESS.md).

## Project layout

| Folder               | What it is                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| `app/`               | Mobile app (SDD C-01): Expo + React Native + TypeScript + expo-router             |
| `server/`            | Backend: REST API (`src/api.ts`, SDD C-02) and worker (`src/worker.ts`, SDD C-19) |
| `server/migrations/` | Database migrations (node-pg-migrate, SQL files)                                  |
| `docs/`              | SRS, SDD, traceability, test plan, acceptance tests, feedback changes             |
| `docker-compose.yml` | Local PostgreSQL 16 + PostGIS 3 database                                          |

## Run the project on a new laptop

### 1. Install the tools (once)

- **Node.js LTS** from <https://nodejs.org> (version 24 or later). Check with `node -v`.
- **Docker Desktop** from <https://www.docker.com/products/docker-desktop/>. Start it and wait until it says "Engine running".
- **Git** or **GitHub Desktop**, to clone the repository.
- **Expo Go** on your phone (Google Play or App Store).

Tip: keep the project folder outside OneDrive if you can. OneDrive tries to sync `node_modules`, which makes installs very slow.

### 2. Get the code and install packages

Clone the repository, open a terminal in the project folder (the folder that contains this README), then run:

```bash
npm ci
```

This installs the packages for both `app` and `server` from the one `package-lock.json` at the root.
Never run `npm install` inside `app/` or `server/`. To add a package, run from the root:
`npm install <name> -w app` or `npm install <name> -w server`.

### 3. Create your .env files

Copy each example file and remove `.example` from the name:

- `server/.env.example` to `server/.env`
- `app/.env.example` to `app/.env`

In `app/.env`, set `EXPO_PUBLIC_API_URL` to your laptop's Wi-Fi address, for example `http://192.168.1.10:3000`.
On Windows, run `ipconfig` and use the "IPv4 Address" of your Wi-Fi adapter. The phone and laptop must be on the same Wi-Fi.

**If port 5432 is already in use** (for example you installed PostgreSQL yourself), copy `.env.example` (in the root) to `.env`, set `DB_HOST_PORT=5433`, and change `5432` to `5433` in both URLs in `server/.env`.

### 4. Start the database and create the tables

```bash
npm run db:up
```

```bash
npm run migrate
```

```bash
npm run migrate:test
```

`db:up` starts PostgreSQL + PostGIS in Docker and waits until it is ready. The two migrate commands create the tables in the development database (`nowaste`) and in the test database (`nowaste_test`).

### 5. Check that everything works

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run typecheck
```

### 6. Run the server and the app

In one terminal:

```bash
npm run dev:server
```

Open <http://localhost:3000/health> in a browser. You should see `{"status":"ok","db":"ok"}`.

In a second terminal:

```bash
npm run dev:app
```

Scan the QR code with Expo Go (Android) or the Camera app (iPhone). The home screen shows **Server: connected**.

The worker can be started with `npm run dev:worker`; for now it only prints `worker started`.

### 7. Stop the database

```bash
npm run db:down
```

The data stays in the Docker volume `nowaste_db_data` and is there again after the next `npm run db:up`.

## All root scripts

| Script                              | What it does                                          |
| ----------------------------------- | ----------------------------------------------------- |
| `npm run db:up` / `db:down`         | Start / stop the Docker database                      |
| `npm run migrate` / `migrate:test`  | Run the migrations on the development / test database |
| `npm run dev:server` / `dev:worker` | Run the API / worker with auto-reload                 |
| `npm run dev:app`                   | Start Expo for the app                                |
| `npm run build`                     | Compile the server to `server/dist`                   |
| `npm test`                          | Server tests, then app tests                          |
| `npm run lint` / `typecheck`        | ESLint / TypeScript checks for both workspaces        |
| `npm run format`                    | Format all files with Prettier                        |

## Working on a story

Read [CLAUDE.md](CLAUDE.md) for the team rules. Work on a branch, open a pull request to `main`, and fill in the pull request template. GitHub Actions runs lint, typecheck, build and tests on every push.
