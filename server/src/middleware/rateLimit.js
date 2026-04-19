const rateLimit = require('express-rate-limit');

function buildLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    validate: {
      xForwardedForHeader: false
    }
  });
}

const staffLoginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many staff login attempts. Please try again in 15 minutes.'
});

const homeownerCodeRequestLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login code requests. Please wait before requesting another code.'
});

const homeownerCodeVerifyLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many code verification attempts. Please request a new code and try again.'
});

const mfaVerifyLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many MFA verification attempts. Please try again in 15 minutes.'
});

const passwordResetRequestLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please try again later.'
});

const passwordResetConfirmLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many password reset attempts. Please try again later.'
});

module.exports = {
  staffLoginLimiter,
  homeownerCodeRequestLimiter,
  homeownerCodeVerifyLimiter,
  mfaVerifyLimiter,
  passwordResetRequestLimiter,
  passwordResetConfirmLimiter
};
