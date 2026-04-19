# Local Environment Template

Use this for local development in:

`C:\Users\samtr\OneDrive\Documents\Visual Studio 18\hoa-portal\.env`

```env
# Core app
NODE_ENV=development
PORT=5000
JWT_SECRET=replace_with_your_secret
BCRYPT_SALT_ROUNDS=10
SESSION_IDLE_TIMEOUT_MINUTES=30
SESSION_MAX_AGE_DAYS=7

# Database - local Docker
DATABASE_URL=
PGHOST=postgres
PGPORT=5432
PGUSER=postgres
PGPASSWORD=hoa_password
PGDATABASE=hoa_portal
PGSSLMODE=
DB_SSL=false

# Local app URLs / CORS
CLIENT_APP_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
REACT_APP_API_URL=/api

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email via SES
EMAIL_PROVIDER=ses
EMAIL_FROM=notifications@deanspondcommunity.com
SES_AWS_REGION=us-east-1
SES_AWS_ACCESS_KEY_ID=REPLACE_WITH_SES_ACCESS_KEY
SES_AWS_SECRET_ACCESS_KEY=REPLACE_WITH_SES_SECRET

# SMS via Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Local file storage
STORAGE_PROVIDER=local
STORAGE_BUCKET=
STORAGE_PUBLIC_BASE_URL=
STORAGE_S3_ENDPOINT=
STORAGE_AWS_REGION=
STORAGE_AWS_ACCESS_KEY_ID=
STORAGE_AWS_SECRET_ACCESS_KEY=
```
