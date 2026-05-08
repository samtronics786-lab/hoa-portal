# HOA Portal Local Setup and Agent

This repository contains an agent customization for quickly validating local setup preconditions.

## Agent: hoa-portal-run-checker

Location: `.github/agents/hoa-portal.agent.md`

Usage from Copilot Chat:

- `/hoa-portal-run-checker scan current repo and report missing env vars and services.`
- `/hoa-portal-run-checker validate Docker local startup path.`
- `/hoa-portal-run-checker troubleshoot failed DB connection`

### When to use

- After cloning the repo, before any `npm run` command.
- Before running `docker compose up`.
- When debugging environment variable mismatches or service dependencies (Postgres, Stripe, Amazon SES).

## Required env file

Copy or create from `.env.sample`:

```bash
cp .env.sample .env
```

Set values:

- `JWT_SECRET`
- `BCRYPT_SALT_ROUNDS`
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `REACT_APP_API_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `EMAIL_PROVIDER`, `EMAIL_FROM`, `SES_AWS_REGION`, `SES_AWS_ACCESS_KEY_ID`, `SES_AWS_SECRET_ACCESS_KEY`

## Start commands

- `npm install`
- `npm start` (root; runs server and client concurrently)
- `npm run server:dev` + `npm run client:start` (separate terminals)
- `npm run server:seed` (loads seed data)

## Docker

- `docker compose up --build`

Make sure `.env` contains all required credentials before starting.
