const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Approval = sequelize.define('Approval', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  booking_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  approver_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow null when approval is not yet assigned
    references: {
      model: 'users',
      key: 'id'
    }
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false, // 1 for first level, 2 for second level, etc.
    validate: {
      min: 1,
      max: 3
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'approvals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['booking_id', 'level']
    }
  ]
});

module.exports = Approval;


