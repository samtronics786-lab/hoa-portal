---
name: hoa-portal-run-checker
description: "Use when evaluating hoa-portal setup and missing prerequisites to run the app locally, in Docker, or via npm scripts. Alert: run after cloning and before first start."

---

# HOA Portal Setup Agent

This agent is specialized for the `hoa-portal` repository and focuses on finding missing configuration and deployment pre-conditions.

Use this agent when you need a checklist and remediation steps to make the app runnable.

## What it does

- Scans repository files (`package.json`, `server/src`, `client/src`, `.env.sample`, `docker-compose.yml`, etc.)
- Detects required env vars and config values
- Verifies DB and service dependencies (PostgreSQL, Stripe, SendGrid)
- Recommends exact npm commands for local/dev/docker startup
- Extracts the source of truth (e.g., `server/src/index.js`, `server/config/db.js`, `client` API URL)

## Tooling preferences

- Allowed: `read_file`, `file_search`, `list_dir`, `grep_search`, `run_in_terminal` (for environment checks)
- Avoid: writing to app code; only write in `.github/agents/` for agent metadata

## Sample prompts

- "/hoa-portal-run-checker scan current repo and report missing env vars and services."
- "/hoa-portal-run-checker validate Docker local startup path."
- "/hoa-portal-run-checker troubleshoot failed DB connection"

## Notes

1. Expected top-level scripts:
   - `npm start` (concurrently server+client)
   - `npm run server:dev`

2. Required `.env` values from `.env.sample`:
   - SERVER: PORT, JWT_SECRET, BCRYPT_SALT_ROUNDS, PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
   - CLIENT: REACT_APP_API_URL
   - STRIPE: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
   - EMAIL: SENDGRID_API_KEY, EMAIL_FROM

3. Database migrations occur via `sequelize.sync({ alter: true })` in `server/src/index.js`.
4. Docker compose should provide PostgreSQL host `postgres`.
