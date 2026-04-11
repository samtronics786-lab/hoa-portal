const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Notice extends Model {}

Notice.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  hoaCommunityId: { type: DataTypes.UUID, allowNull: false },
  visibility: { type: DataTypes.ENUM('all','board','homeowner','individual'), defaultValue: 'all' },
  targetUserId: { type: DataTypes.UUID }
}, {
  sequelize,
  modelName: 'Notice',
  tableName: 'notices',
  timestamps: true
});

module.exports = Notice;