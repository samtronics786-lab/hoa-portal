const jwt = require('jsonwebtoken');
const { User, UserSession } = require('../models');
const { getSessionIdleTimeoutMs } = require('../utils/sessions');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose && payload.purpose !== 'access') {
      return res.status(401).json({ message: 'Invalid token purpose' });
    }
    if (payload.tokenId) {
      const session = await UserSession.findOne({
        where: {
          tokenId: payload.tokenId,
          userId: payload.id,
          revokedAt: null
        }
      });

      if (!session) {
        return res.status(401).json({ message: 'Session not found or revoked' });
      }

      if (new Date(session.expiresAt) < new Date()) {
        return res.status(401).json({ message: 'Session has expired' });
      }

      if (new Date(session.lastActivityAt).getTime() + getSessionIdleTimeoutMs() < Date.now()) {
        session.revokedAt = new Date();
        await session.save();
        return res.status(401).json({ message: 'Session timed out due to inactivity' });
      }

      session.lastActivityAt = new Date();
      await session.save();
      req.session = session;
    }
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize
};
