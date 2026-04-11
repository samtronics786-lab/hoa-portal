const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class MaintenanceRequest extends Model {}

MaintenanceRequest.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  homeownerId: { type: DataTypes.UUID, allowNull: false },
  propertyLotId: { type: DataTypes.UUID, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  priority: { type: DataTypes.ENUM('low','medium','high','urgent'), defaultValue: 'medium' },
  status: { type: DataTypes.ENUM('submitted','in_review','assigned','in_progress','completed','closed'), defaultValue: 'submitted' },
  internalNotes: { type: DataTypes.TEXT },
  vendorAssignment: { type: DataTypes.STRING },
  completionNotes: { type: DataTypes.TEXT }
}, {
  sequelize,
  modelName: 'MaintenanceRequest',
  tableName: 'maintenance_requests',
  timestamps: true
});

module.exports = MaintenanceRequest;