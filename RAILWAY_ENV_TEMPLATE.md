# Railway Production Environment Template

## Backend Service

Set these in the Railway backend service:

```env
# Core app
NODE_ENV=production
PORT=${{PORT}}
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
BCRYPT_SALT_ROUNDS=10
SESSION_IDLE_TIMEOUT_MINUTES=30
SESSION_MAX_AGE_DAYS=7

# Database - Railway Postgres
DATABASE_URL=${{Postgres.DATABASE_URL}}
PGSSLMODE=require
DB_SSL=true

# Production app URLs / CORS
CLIENT_APP_URL=https://portal.deanspondcommunity.com
ALLOWED_ORIGINS=https://portal.deanspondcommunity.com
REACT_APP_API_URL=/api

# Stripe
STRIPE_SECRET_KEY=sk_live_or_test_value
STRIPE_WEBHOOK_SECRET=whsec_value

# Email via SES
EMAIL_PROVIDER=ses
EMAIL_FROM=notifications@deanspondcommunity.com
SES_AWS_REGION=us-east-1
SES_AWS_ACCESS_KEY_ID=REPLACE_WITH_SES_ACCESS_KEY
SES_AWS_SECRET_ACCESS_KEY=REPLACE_WITH_SES_SECRET

# SMS via Twilio
TWILIO_ACCOUNT_SID=REPLACE_WITH_TWILIO_SID
TWILIO_AUTH_TOKEN=REPLACE_WITH_TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER=REPLACE_WITH_TWILIO_NUMBER

# File storage via Cloudflare R2
STORAGE_PROVIDER=r2
STORAGE_BUCKET=hoa-portal
STORAGE_PUBLIC_BASE_URL=https://assets.deanspondcommunity.com
STORAGE_S3_ENDPOINT=https://605ac31acd3586eccf835f1a1bc9e500.r2.cloudflarestorage.com
STORAGE_AWS_REGION=auto
STORAGE_AWS_ACCESS_KEY_ID=REPLACE_WITH_R2_ACCESS_KEY
STORAGE_AWS_SECRET_ACCESS_KEY=REPLACE_WITH_R2_SECRET
```

## Frontend Service

Set these in the Railway frontend service:

```env
PORT=${{PORT}}
VITE_API_BASE_URL=/api
API_PROXY_TARGET=https://api.deanspondcommunity.com
```
