const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { User, UserSession, Homeowner } = require('../models');
const { logAudit } = require('../utils/auditLog');
const { sendEmail, isEmailConfigured, EmailDeliveryError } = require('../utils/email');
const { createUserSession } = require('../utils/sessions');
const { normalizePhoneNumber, maskPhoneNumber } = require('../utils/phone');
const { sendSms, isSmsConfigured, SmsDeliveryError } = require('../utils/sms');
const {
  staffLoginLimiter,
  homeownerCodeRequestLimiter,
  homeownerCodeVerifyLimiter,
  mfaVerifyLimiter,
  passwordResetRequestLimiter,
  passwordResetConfirmLimiter
} = require('../middleware/rateLimit');

const router = express.Router();

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    mobileNumber: user.mobileNumber,
    role: user.role
  };
}

function legacyPhoneFormat(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

async function findHomeownerByMobile(mobileNumber) {
  const normalizedPhone = normalizePhoneNumber(mobileNumber);
  const legacyPhone = legacyPhoneFormat(normalizedPhone);
  const homeowner = await Homeowner.findOne({
    where: {
      [Op.or]: [
        { phone: normalizedPhone },
        { phone: mobileNumber },
        { phone: legacyPhone }
      ]
    },
    include: [{ model: User, as: 'user' }]
  });

  return { homeowner, normalizedPhone };
}

router.post('/register', async (req, res) => {
  try {
    const { email, username, password, role = 'homeowner', mobileNumber } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          ...(username ? [{ username }] : []),
          ...(mobileNumber ? [{ mobileNumber: normalizePhoneNumber(mobileNumber) }] : [])
        ]
      }
    });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await User.create({
      email,
      username,
      mobileNumber: mobileNumber ? normalizePhoneNumber(mobileNumber) : null,
      passwordHash,
      role
    });
    await logAudit({
      req,
      userId: user.id,
      action: 'auth.register',
      entityType: 'user',
      entityId: user.id,
      details: { role: user.role }
    });

    res.status(201).json(serializeUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', staffLoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }]
      }
    });
    if (!user || user.role === 'homeowner') {
      await logAudit({
        req,
        action: 'auth.login',
        entityType: 'user',
        status: 'failure',
        details: { username }
      });
      return res.status(401).json({ message: 'Invalid staff credentials' });
    }

    if (user.status !== 'active') {
      await logAudit({
        req,
        userId: user.id,
        action: 'auth.login',
        entityType: 'user',
        entityId: user.id,
        status: 'failure',
        details: { status: user.status }
      });
      return res.status(403).json({ message: 'User account is not active' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await logAudit({
        req,
        userId: user.id,
        action: 'auth.login',
        entityType: 'user',
        entityId: user.id,
        status: 'failure'
      });
      return res.status(401).json({ message: 'Invalid staff credentials' });
    }

    if (user.mfaEnabled) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      user.mfaCode = code;
      user.mfaCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 10);
      await user.save();

      if (!isEmailConfigured()) {
        return res.status(503).json({ message: 'MFA email delivery is not configured' });
      }

      try {
        await sendEmail({
          to: user.email,
          subject: 'Your HOA Portal verification code',
          text: `Your verification code is ${code}. It expires in 10 minutes.`
        });
      } catch (error) {
        if (error instanceof EmailDeliveryError) {
          return res.status(503).json({ message: `MFA email delivery failed: ${error.message}` });
        }
        throw error;
      }

      const tempToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, purpose: 'mfa' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      await logAudit({
        req,
        userId: user.id,
        action: 'auth.mfa_challenge_sent',
        entityType: 'user',
        entityId: user.id
      });

      return res.json({ mfaRequired: true, tempToken, user: serializeUser(user) });
    }

    const { token } = await createUserSession({ req, user });
    await logAudit({
      req,
      userId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id
    });
    res.json({ token, user: serializeUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/homeowner/request-code', homeownerCodeRequestLimiter, async (req, res) => {
  try {
    const { homeowner, normalizedPhone } = await findHomeownerByMobile(req.body.mobileNumber);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'A registered mobile number is required' });
    }

    if (!homeowner?.user || homeowner.user.status !== 'active') {
      return res.status(404).json({ message: 'No active homeowner account was found for that mobile number' });
    }

    const code = String(Math.floor(10000 + Math.random() * 90000));
    homeowner.user.mobileLoginCode = code;
    homeowner.user.mobileLoginCodeExpiresAt = new Date(Date.now() + 1000 * 60 * 10);
    homeowner.user.mobileNumber = normalizedPhone;
    await homeowner.user.save();

    let delivery = 'sms';
    try {
      await sendSms({
        to: normalizedPhone,
        body: `Your Deans Pond HOA login code is ${code}. It expires in 10 minutes.`
      });
    } catch (error) {
      if (!(error instanceof SmsDeliveryError)) throw error;
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ message: `SMS delivery failed: ${error.message}` });
      }
      delivery = 'development';
    }

    await logAudit({
      req,
      userId: homeowner.user.id,
      action: 'auth.homeowner_code_requested',
      entityType: 'user',
      entityId: homeowner.user.id,
      details: { delivery }
    });

    const response = {
      message: `A login code was sent to ${maskPhoneNumber(normalizedPhone)}.`,
      maskedMobile: maskPhoneNumber(normalizedPhone)
    };

    if (delivery === 'development') {
      response.developmentCode = code;
      response.message = 'SMS is not configured in this environment. Use the development code shown below.';
    }

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to send homeowner login code' });
  }
});

router.post('/homeowner/verify-code', homeownerCodeVerifyLimiter, async (req, res) => {
  try {
    const { homeowner, normalizedPhone } = await findHomeownerByMobile(req.body.mobileNumber);
    const { code } = req.body;
    if (!normalizedPhone || !code) {
      return res.status(400).json({ message: 'Mobile number and login code are required' });
    }

    if (!homeowner?.user || homeowner.user.role !== 'homeowner') {
      return res.status(404).json({ message: 'Homeowner account not found' });
    }

    if (
      !homeowner.user.mobileLoginCode ||
      homeowner.user.mobileLoginCode !== code ||
      !homeowner.user.mobileLoginCodeExpiresAt ||
      new Date(homeowner.user.mobileLoginCodeExpiresAt) < new Date()
    ) {
      await logAudit({
        req,
        userId: homeowner.user.id,
        action: 'auth.homeowner_verify_code',
        entityType: 'user',
        entityId: homeowner.user.id,
        status: 'failure'
      });
      return res.status(401).json({ message: 'The login code is invalid or expired' });
    }

    homeowner.user.mobileLoginCode = null;
    homeowner.user.mobileLoginCodeExpiresAt = null;
    await homeowner.user.save();

    const { token } = await createUserSession({ req, user: homeowner.user });
    await logAudit({
      req,
      userId: homeowner.user.id,
      action: 'auth.homeowner_verify_code',
      entityType: 'user',
      entityId: homeowner.user.id
    });

    res.json({ token, user: serializeUser(homeowner.user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to verify homeowner code' });
  }
});

router.post('/verify-mfa', mfaVerifyLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ message: 'Verification token and code are required' });
    }

    const payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (payload.purpose !== 'mfa') {
      return res.status(400).json({ message: 'Invalid MFA token' });
    }

    const user = await User.findByPk(payload.id);
    if (!user || !user.mfaEnabled) {
      return res.status(404).json({ message: 'User not found for MFA verification' });
    }

    if (!user.mfaCode || !user.mfaCodeExpiresAt || new Date(user.mfaCodeExpiresAt) < new Date() || user.mfaCode !== code) {
      await logAudit({
        req,
        userId: user.id,
        action: 'auth.verify_mfa',
        entityType: 'user',
        entityId: user.id,
        status: 'failure'
      });
      return res.status(401).json({ message: 'Verification code is invalid or expired' });
    }

    user.mfaCode = null;
    user.mfaCodeExpiresAt = null;
    await user.save();

    const { token } = await createUserSession({ req, user });

    await logAudit({
      req,
      userId: user.id,
      action: 'auth.verify_mfa',
      entityType: 'user',
      entityId: user.id
    });

    res.json({ token, user: serializeUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'MFA verification failed' });
  }
});

router.post('/request-password-reset', passwordResetRequestLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || user.role === 'homeowner') {
      return res.json({ message: 'If the staff account exists, a password reset token has been generated.' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Password reset email delivery is not configured' });
    }

    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your HOA Portal password',
        text: `Use this reset token to update your HOA Portal password: ${resetToken}`
      });
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        return res.status(503).json({ message: `Password reset email delivery failed: ${error.message}` });
      }
      throw error;
    }

    await logAudit({
      req,
      userId: user.id,
      action: 'auth.request_password_reset',
      entityType: 'user',
      entityId: user.id
    });

    res.json({ message: 'Password reset email sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to request password reset' });
  }
});

router.post('/reset-password', passwordResetConfirmLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }

    const user = await User.findOne({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiresAt || new Date(user.resetTokenExpiresAt) < new Date()) {
      return res.status(400).json({ message: 'Reset token is invalid or expired' });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
    user.passwordHash = await bcrypt.hash(password, saltRounds);
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    await user.save();

    await logAudit({
      req,
      userId: user.id,
      action: 'auth.reset_password',
      entityType: 'user',
      entityId: user.id
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'mobileNumber', 'role', 'status', 'mfaEnabled', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load current user' });
  }
});

router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await UserSession.findAll({
      where: { userId: req.user.id, revokedAt: null },
      order: [['createdAt', 'DESC']]
    });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load sessions' });
  }
});

router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const session = await UserSession.findOne({ where: { id: req.params.sessionId, userId: req.user.id } });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    session.revokedAt = new Date();
    await session.save();
    await logAudit({ req, userId: req.user.id, action: 'auth.revoke_session', entityType: 'session', entityId: session.id });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to revoke session' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    if (req.session) {
      req.session.revokedAt = new Date();
      await req.session.save();
    }
    await logAudit({ req, userId: req.user.id, action: 'auth.logout', entityType: 'session', entityId: req.session?.id || null });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to log out' });
  }
});

router.post('/mfa/settings', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'homeowner') {
      return res.status(403).json({ message: 'Homeowner accounts use mobile-code sign-in' });
    }
    user.mfaEnabled = Boolean(req.body.enabled);
    if (!user.mfaEnabled) {
      user.mfaCode = null;
      user.mfaCodeExpiresAt = null;
    }
    await user.save();
    await logAudit({ req, userId: user.id, action: 'auth.update_mfa_settings', entityType: 'user', entityId: user.id, details: { enabled: user.mfaEnabled } });
    res.json({ success: true, mfaEnabled: user.mfaEnabled });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update MFA settings' });
  }
});

module.exports = router;
