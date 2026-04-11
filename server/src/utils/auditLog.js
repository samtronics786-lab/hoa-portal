const { AuditLog } = require('../models');

async function logAudit({
  req = null,
  userId = null,
  action,
  entityType,
  entityId = null,
  status = 'success',
  details = {}
}) {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      status,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      details
    });
  } catch (error) {
    console.error('Failed to write audit log', error);
  }
}

module.exports = {
  logAudit
};
