# Railway Deployment Guide

This project is set up to deploy as **two separate Railway services** plus a managed Postgres database:

- `hoa-portal-client`
- `hoa-portal-server`
- `Postgres`

## Recommended production URLs

- Frontend: `https://portal.deanspondcommunity.com`
- Backend API: `https://api.deanspondcommunity.com`

The frontend should call the backend using a public API base URL, for example:

`VITE_API_BASE_URL=https://api.deanspondcommunity.com/api`

## 1. Create the Railway services

Create three Railway resources:

1. A Postgres database
2. A service for the backend using the `server` folder
3. A service for the frontend using the `client` folder

## 2. Backend service settings

**Root directory**

`server`

**Build**

Use the `Dockerfile` already in the `server` folder, or a Node deployment using:

- Install: `npm install`
- Start: `npm start`

**Required backend environment variables**

- `NODE_ENV=production`
- `PORT=${{PORT}}`
- `DATABASE_URL=<Railway Postgres connection string>`
- `PGSSLMODE=require`
- `JWT_SECRET=<strong secret>`
- `CLIENT_APP_URL=https://portal.deanspondcommunity.com`
- `BCRYPT_SALT_ROUNDS=10`
- `SESSION_IDLE_TIMEOUT_MINUTES=30`
- `SESSION_MAX_AGE_DAYS=7`

Optional integrations:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `EMAIL_PROVIDER=ses`
- `SES_AWS_REGION`
- `SES_AWS_ACCESS_KEY_ID`
- `SES_AWS_SECRET_ACCESS_KEY`
- `SENDGRID_API_KEY`
- `EMAIL_FROM`
- `STORAGE_PROVIDER=r2`
- `STORAGE_BUCKET`
- `STORAGE_PUBLIC_BASE_URL`
- `STORAGE_S3_ENDPOINT`
- `STORAGE_AWS_REGION`
- `STORAGE_AWS_ACCESS_KEY_ID`
- `STORAGE_AWS_SECRET_ACCESS_KEY`

## 3. Frontend service settings

**Root directory**

`client`

**Build**

Use the `Dockerfile` already in the `client` folder.

**Required frontend environment variables**

- `PORT=${{PORT}}`
- `VITE_API_BASE_URL=/api`
- `API_PROXY_TARGET=https://api.deanspondcommunity.com`

The frontend container is configured to serve static files with Nginx on Railway's injected `PORT`, and proxy `/api` and `/uploads` to the backend public URL.

## 4. Local development

Local Docker Compose can still use:

- frontend on `http://localhost:3000`
- backend on `http://localhost:5000`
- frontend API base as `/api`

For local Vite dev, the proxy in `client/vite.config.ts` remains available.

## 5. Database notes

The app now supports `DATABASE_URL` in addition to individual `PG*` environment variables.

Production deployments should prefer:

- `DATABASE_URL`
- `PGSSLMODE=require`

## 6. Important production follow-up

Before a real pilot launch, also complete:

1. Set `EMAIL_PROVIDER=ses` and use the dedicated `SES_AWS_*` credentials for Amazon SES
2. Set `STORAGE_PROVIDER=r2` and use the dedicated `STORAGE_AWS_*` credentials for Cloudflare R2 or S3 uploads
3. Replace the bootstrap migration with explicit future migrations
4. Configure real SMS/email delivery
5. Add rate limiting to authentication endpoints
6. Add monitoring and backups
