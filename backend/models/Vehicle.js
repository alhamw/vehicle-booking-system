const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  plate_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('truck', 'van', 'car', 'bus', 'excavator', 'bulldozer', 'crane', 'other'),
    allowNull: false
  },
  make: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  model: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  capacity: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  fuel_type: {
    type: DataTypes.ENUM('petrol', 'diesel', 'electric', 'hybrid'),
    allowNull: false,
    defaultValue: 'diesel'
  },
  status: {
    type: DataTypes.ENUM('available', 'in_use', 'maintenance', 'out_of_service'),
    allowNull: false,
    defaultValue: 'available'
  },
  last_service_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  next_service_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  mileage: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  location: {
    type: DataTypes.STRING(100),
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
  tableName: 'vehicles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Vehicle;



