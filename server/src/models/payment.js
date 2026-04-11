const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Payment extends Model {}

Payment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  homeownerId: { type: DataTypes.UUID, allowNull: false },
  chargeId: { type: DataTypes.UUID },
  amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  transactionId: { type: DataTypes.STRING },
  provider: { type: DataTypes.ENUM('stripe'), allowNull: false, defaultValue: 'stripe' },
  receiptUrl: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('success','failed','pending'), defaultValue: 'pending' },
  paidAt: { type: DataTypes.DATE }
}, {
  sequelize,
  modelName: 'Payment',
  tableName: 'payments',
  timestamps: true
});

module.exports = Payment;
