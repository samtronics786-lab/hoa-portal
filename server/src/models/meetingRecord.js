const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class MeetingRecord extends Model {}

MeetingRecord.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  hoaCommunityId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  meetingDate: { type: DataTypes.DATE, allowNull: false },
  agenda: { type: DataTypes.TEXT },
  minutes: { type: DataTypes.TEXT },
  visibility: {
    type: DataTypes.ENUM('board', 'all'),
    allowNull: false,
    defaultValue: 'board'
  },
  postedById: { type: DataTypes.UUID, allowNull: false }
}, {
  sequelize,
  modelName: 'MeetingRecord',
  tableName: 'meeting_records',
  timestamps: true
});

module.exports = MeetingRecord;
