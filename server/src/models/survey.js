const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Survey extends Model {}

Survey.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  hoaCommunityId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  question: { type: DataTypes.TEXT, allowNull: false },
  startAt: { type: DataTypes.DATE, allowNull: false },
  endAt: { type: DataTypes.DATE, allowNull: false },
  status: {
    type: DataTypes.ENUM('draft', 'open', 'closed', 'published'),
    allowNull: false,
    defaultValue: 'draft'
  },
  postedById: { type: DataTypes.UUID, allowNull: false }
}, {
  sequelize,
  modelName: 'Survey',
  tableName: 'surveys',
  timestamps: true
});

module.exports = Survey;
