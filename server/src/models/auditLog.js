const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class AuditLog extends Model {}

AuditLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID },
  action: { type: DataTypes.STRING, allowNull: false },
  entityType: { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.STRING },
  status: {
    type: DataTypes.ENUM('success', 'failure'),
    allowNull: false,
    defaultValue: 'success'
  },
  ipAddress: { type: DataTypes.STRING },
  details: { type: DataTypes.JSONB }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: true
});

module.exports = AuditLog;
