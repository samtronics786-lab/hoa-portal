const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class BallotOption extends Model {}

BallotOption.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  electionId: { type: DataTypes.UUID, allowNull: false },
  label: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  sequelize,
  modelName: 'BallotOption',
  tableName: 'ballot_options',
  timestamps: true
});

module.exports = BallotOption;
