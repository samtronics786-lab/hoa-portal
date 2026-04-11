const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class BoardMemberAssignment extends Model {}

BoardMemberAssignment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  homeownerId: { type: DataTypes.UUID, allowNull: false },
  hoaCommunityId: { type: DataTypes.UUID, allowNull: false },
  termStart: { type: DataTypes.DATE, allowNull: false },
  termEnd: { type: DataTypes.DATE },
  role: { type: DataTypes.STRING, allowNull: false }
}, {
  sequelize,
  modelName: 'BoardMemberAssignment',
  tableName: 'board_member_assignments',
  timestamps: true
});

module.exports = BoardMemberAssignment;