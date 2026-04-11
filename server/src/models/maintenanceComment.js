const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class MaintenanceComment extends Model {}

MaintenanceComment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  maintenanceRequestId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  comment: { type: DataTypes.TEXT, allowNull: false }
}, {
  sequelize,
  modelName: 'MaintenanceComment',
  tableName: 'maintenance_comments',
  timestamps: true
});

module.exports = MaintenanceComment;
