# RALLY 100 local development stand-in

Everything in this folder is for a developer's machine and for browser tests. None of it is deployed, and none of it may ever point at the live Supabase project.

| File | What it is |
|---|---|
| `server.mjs` | A zero-dependency Node 22 stand-in for the two parts of Supabase the app uses: email and password auth (`/auth/v1/...`) and the `rally100` functions (`/rest/v1/rpc/<name>`). It also serves `rally-100/app/` as static files. |
| `setup-db.sh` | Builds the local database `rally100_dev`: RALLY's Supabase shim, every RALLY migration, the RALLY 100 migration and `seed.sql`. Drops and recreates it every run. |
| `seed.sql` | Fictional fixtures: team "RALLY" (owner, leader, three reps) and team "RALLY B" (a leader and a rep). |
| `users.json` | The dev accounts' passwords. Every account uses `rally100dev`. |
| `smoke.mjs` | A short end-to-end check against a running server: prints PASS or FAIL. |

## 1. A local Postgres

PostgreSQL 16 with PostGIS (RALLY's migration 0008 creates the `postgis` extension). Any local cluster works. A throwaway one:

```sh
initdb -D /tmp/r100pg -U postgres --auth=trust
pg_ctl -D /tmp/r100pg -l /tmp/r100pg.log -o "-p 5432 -c listen_addresses=127.0.0.1" start
```

(On Debian or Ubuntu: `apt install postgresql-16 postgresql-16-postgis-3`. On macOS, Postgres.app ships PostGIS.)

## 2. Load everything

```sh
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres sh rally-100/app/dev/setup-db.sh
```

It refuses a database name that does not end in `_dev` and a host that looks like a hosted project, because its first statement is `drop database`.

## 3. Run the server

```sh
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=rally100_dev PORT=8100 \
  node rally-100/app/dev/server.mjs
```

Open http://localhost:8100. On `localhost` the app's `js/config.js` talks to this server instead of Supabase. Sign in with any account below.

| Email | Role | Team |
|---|---|---|
| owner@rally.test | owner | RALLY |
| leader@rally.test | leader | RALLY |
| rep1@rally.test, rep2@rally.test, rep3@rally.test | rep | RALLY |
| leaderb@rally.test | leader | RALLY B |
| repb@rally.test | rep | RALLY B |

Password for all: `rally100dev`. `/auth/v1/signup` also works: it creates an `auth.users` row, so RALLY's signup trigger makes a rep with no team, exactly as in production. Place the account on a team with one `update public.profiles ...` (see `rally/db/seed.example.sql`).

Environment: `PGHOST` (a host name, or a socket directory starting with `/`), `PGPORT`, `PGDATABASE`, `PGUSER`, optional `PGPASSWORD` (trust, password, md5 and SCRAM-SHA-256 all work), and `PORT` for HTTP (default 8100). The server logs one line per request.

## 4. Prove it works

```sh
node rally-100/app/dev/smoke.mjs http://localhost:8100
```

It signs in as rep1, saves three contacts, reads `rep_state`, signs in as the leader, reads `team_state`, and checks the refusals (wrong password, missing token, a rep asking for leader data, a bad phone, an unknown function).

## How faithful it is

* **The functions are the real ones.** Each RPC runs `rally100.<name>(...)` in Postgres the way PostgREST does: one transaction, `set local role authenticated`, `request.jwt.claims` set to `{"sub": <user id>, "role": "authenticated"}`. Every permission, scope check and error comes from the migration, not from this server.
* **No SQL is built from a request.** Function and argument names and types are read once from `pg_catalog`; every value in the JSON body travels as a bound protocol parameter (`$1`, `$2`...). The server speaks the Postgres wire protocol itself because psql variables travel in argv, which caps one value at 128 KB, and an incentive picture can be 400,000 characters.
* **Errors look like PostgREST's.** `{code, message, details, hint}`; 403 for `42501`, 400 for `22023` and other client errors, 409 for conflicts, 404 `PGRST202` for an unknown function or a parameter name that does not match (PostgREST matches functions by parameter names, so a misspelled key fails here exactly as it will in production), 401 `PGRST301` for a missing or expired token, 406 `PGRST106` without `Content-Profile: rally100`.
* **Auth is a stand-in.** Tokens are opaque random strings held in memory for one hour, not JWTs; sign-ups made while it runs keep their password only until it stops. `/auth/v1/recover` answers 204 and sends nothing.
* `/dev/` and dotfiles are never served, so `users.json` stays off the wire.
