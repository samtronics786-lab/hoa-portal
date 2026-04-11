const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class UserSession extends Model {}

UserSession.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  tokenId: { type: DataTypes.STRING, allowNull: false, unique: true },
  userAgent: { type: DataTypes.STRING },
  ipAddress: { type: DataTypes.STRING },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  lastActivityAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE }
}, {
  sequelize,
  modelName: 'UserSession',
  tableName: 'user_sessions',
  timestamps: true
});

module.exports = UserSession;
