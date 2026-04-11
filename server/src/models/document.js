const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Document extends Model {}

Document.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.ENUM('governing','rules','forms','notices','minutes','financials','board'), defaultValue: 'notices' },
  hoaCommunityId: { type: DataTypes.UUID, allowNull: false },
  uploaderId: { type: DataTypes.UUID, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  visibility: { type: DataTypes.ENUM('all','board','management','homeowner'), defaultValue: 'all' }
}, {
  sequelize,
  modelName: 'Document',
  tableName: 'documents',
  timestamps: true
});

module.exports = Document;