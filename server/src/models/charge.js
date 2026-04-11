const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Charge extends Model {}

Charge.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  homeownerId: { type: DataTypes.UUID, allowNull: false },
  communityId: { type: DataTypes.UUID, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  dueDate: { type: DataTypes.DATE },
  status: { type: DataTypes.ENUM('pending','paid','overdue'), defaultValue: 'pending' },
  delinquencyStage: {
    type: DataTypes.ENUM('current', 'reminder_sent', 'late_notice', 'final_notice', 'payment_plan', 'collections'),
    defaultValue: 'current'
  },
  paymentPlanStatus: {
    type: DataTypes.ENUM('none', 'proposed', 'active', 'broken', 'completed'),
    defaultValue: 'none'
  },
  paymentPlanNotes: { type: DataTypes.TEXT },
  lastReminderAt: { type: DataTypes.DATE }
}, {
  sequelize,
  modelName: 'Charge',
  tableName: 'charges',
  timestamps: true
});

module.exports = Charge;
