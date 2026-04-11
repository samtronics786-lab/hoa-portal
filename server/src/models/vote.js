const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Vote extends Model {}

Vote.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  electionId: { type: DataTypes.UUID, allowNull: false },
  ballotOptionId: { type: DataTypes.UUID, allowNull: false },
  homeownerId: { type: DataTypes.UUID, allowNull: false },
  propertyLotId: { type: DataTypes.UUID, allowNull: false },
  submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  sequelize,
  modelName: 'Vote',
  tableName: 'votes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['electionId', 'propertyLotId']
    }
  ]
});

module.exports = Vote;
