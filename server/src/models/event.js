const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Event extends Model {}

Event.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  hoaCommunityId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  summary: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  location: { type: DataTypes.STRING },
  startAt: { type: DataTypes.DATE, allowNull: false },
  endAt: { type: DataTypes.DATE },
  eventType: {
    type: DataTypes.ENUM('social', 'governance', 'maintenance', 'seasonal', 'volunteer', 'general'),
    allowNull: false,
    defaultValue: 'general'
  },
  status: {
    type: DataTypes.ENUM('upcoming', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'upcoming'
  },
  visibility: {
    type: DataTypes.ENUM('all', 'board'),
    allowNull: false,
    defaultValue: 'all'
  },
  postedById: { type: DataTypes.UUID, allowNull: false }
}, {
  sequelize,
  modelName: 'Event',
  tableName: 'events',
  timestamps: true
});

module.exports = Event;
