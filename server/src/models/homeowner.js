const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Homeowner extends Model {}

Homeowner.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phone: { type: DataTypes.STRING },
  propertyLotId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID }
}, {
  sequelize,
  modelName: 'Homeowner',
  tableName: 'homeowners',
  timestamps: true
});

module.exports = Homeowner;