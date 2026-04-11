const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Election extends Model {}

Election.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  hoaCommunityId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  type: {
    type: DataTypes.ENUM('board_member', 'member_vote', 'community_resolution'),
    allowNull: false,
    defaultValue: 'board_member'
  },
  eligibilityRule: {
    type: DataTypes.ENUM('per_property_lot'),
    allowNull: false,
    defaultValue: 'per_property_lot'
  },
  status: {
    type: DataTypes.ENUM('draft', 'open', 'closed', 'published'),
    allowNull: false,
    defaultValue: 'draft'
  },
  startAt: { type: DataTypes.DATE, allowNull: false },
  endAt: { type: DataTypes.DATE, allowNull: false },
  resultsPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  sequelize,
  modelName: 'Election',
  tableName: 'elections',
  timestamps: true
});

module.exports = Election;
