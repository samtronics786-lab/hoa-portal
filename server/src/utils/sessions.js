const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { UserSession } = require('../models');

function getSessionIdleTimeoutMs() {
  return parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '30', 10) * 60 * 1000;
}

function getSessionMaxAgeMs() {
  return parseInt(process.env.SESSION_MAX_AGE_DAYS || '7', 10) * 24 * 60 * 60 * 1000;
}

async function createUserSession({ req, user }) {
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + getSessionMaxAgeMs());
  const lastActivityAt = new Date();

  await UserSession.create({
    userId: user.id,
    tokenId,
    userAgent: req.headers['user-agent'] || null,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
    expiresAt,
    lastActivityAt
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, tokenId },
    process.env.JWT_SECRET,
    { expiresIn: `${parseInt(process.env.SESSION_MAX_AGE_DAYS || '7', 10)}d` }
  );

  return { token, tokenId, expiresAt };
}

module.exports = {
  createUserSession,
  getSessionIdleTimeoutMs,
  getSessionMaxAgeMs
};
