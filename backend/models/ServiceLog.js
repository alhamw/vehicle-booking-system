const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ServiceLog = sequelize.define('ServiceLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vehicle_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'vehicles',
      key: 'id'
    }
  },
  service_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  service_type: {
    type: DataTypes.ENUM('routine', 'repair', 'inspection', 'emergency'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  service_provider: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mileage_at_service: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  next_service_due: {
    type: DataTypes.DATE,
    allowNull: true
  },
  parts_replaced: {
    type: DataTypes.JSON,
    allowNull: true
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
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
  tableName: 'service_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ServiceLog;



