const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class SurveyOption extends Model {}

SurveyOption.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  surveyId: { type: DataTypes.UUID, allowNull: false },
  label: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  sequelize,
  modelName: 'SurveyOption',
  tableName: 'survey_options',
  timestamps: true
});

module.exports = SurveyOption;
