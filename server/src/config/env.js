function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function validateEnv() {
  const missing = [];

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
  }

  if (isProduction()) {
    if (!process.env.CLIENT_APP_URL) {
      missing.push('CLIENT_APP_URL');
    }

    if (!process.env.DATABASE_URL && !process.env.PGHOST) {
      missing.push('DATABASE_URL or PGHOST');
    }
  }

  if (missing.length) {
    const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
    error.code = 'ENV_VALIDATION_FAILED';
    throw error;
  }
}

module.exports = {
  isProduction,
  validateEnv
};
