const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class SurveyResponse extends Model {}

SurveyResponse.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  surveyId: { type: DataTypes.UUID, allowNull: false },
  surveyOptionId: { type: DataTypes.UUID, allowNull: false },
  homeownerId: { type: DataTypes.UUID, allowNull: false },
  propertyLotId: { type: DataTypes.UUID, allowNull: false },
  submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  modelName: 'SurveyResponse',
  tableName: 'survey_responses',
  timestamps: true
});

module.exports = SurveyResponse;
