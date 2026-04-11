const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class User extends Model {}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: { type: DataTypes.STRING, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  mobileNumber: { type: DataTypes.STRING, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('super_admin', 'management_admin', 'community_manager', 'admin_staff', 'board_member', 'homeowner'),
    allowNull: false,
    defaultValue: 'homeowner'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  mfaEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mfaCode: { type: DataTypes.STRING },
  mfaCodeExpiresAt: { type: DataTypes.DATE },
  mobileLoginCode: { type: DataTypes.STRING },
  mobileLoginCodeExpiresAt: { type: DataTypes.DATE },
  resetToken: { type: DataTypes.STRING },
  resetTokenExpiresAt: { type: DataTypes.DATE }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true
});

module.exports = User;
