const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class HOACommunity extends Model {}

HOACommunity.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  address: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' }
}, {
  sequelize,
  modelName: 'HOACommunity',
  tableName: 'hoa_communities',
  timestamps: true
});

module.exports = HOACommunity;