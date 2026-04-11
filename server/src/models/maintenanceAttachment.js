const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class MaintenanceAttachment extends Model {}

MaintenanceAttachment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  maintenanceRequestId: { type: DataTypes.UUID, allowNull: false },
  fileName: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  uploadedById: { type: DataTypes.UUID, allowNull: false }
}, {
  sequelize,
  modelName: 'MaintenanceAttachment',
  tableName: 'maintenance_attachments',
  timestamps: true
});

module.exports = MaintenanceAttachment;
