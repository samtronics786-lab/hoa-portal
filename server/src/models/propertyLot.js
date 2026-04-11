const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class PropertyLot extends Model {}

PropertyLot.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  lotNumber: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  hoaCommunityId: { type: DataTypes.UUID, allowNull: false }
}, {
  sequelize,
  modelName: 'PropertyLot',
  tableName: 'property_lots',
  timestamps: true
});

module.exports = PropertyLot;