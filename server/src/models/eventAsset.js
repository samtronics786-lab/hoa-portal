const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class EventAsset extends Model {}

EventAsset.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  eventId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  assetType: {
    type: DataTypes.ENUM('photo', 'flyer'),
    allowNull: false,
    defaultValue: 'photo'
  },
  url: { type: DataTypes.STRING, allowNull: false },
  uploaderId: { type: DataTypes.UUID, allowNull: false }
}, {
  sequelize,
  modelName: 'EventAsset',
  tableName: 'event_assets',
  timestamps: true
});

module.exports = EventAsset;
