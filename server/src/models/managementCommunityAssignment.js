const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class ManagementCommunityAssignment extends Model {}

ManagementCommunityAssignment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  hoaCommunityId: { type: DataTypes.UUID, allowNull: false }
}, {
  sequelize,
  modelName: 'ManagementCommunityAssignment',
  tableName: 'management_community_assignments',
  timestamps: true
});

module.exports = ManagementCommunityAssignment;
