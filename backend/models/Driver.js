const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  license_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  license_expiry: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: {
        args: true,
        msg: 'Please enter a valid email address',
        validator: function(value) {
          if (value && value.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              throw new Error('Please enter a valid email address');
            }
          }
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('available', 'assigned', 'on_leave', 'inactive'),
    allowNull: false,
    defaultValue: 'available'
  },
  experience_years: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  vehicle_types: {
    type: DataTypes.JSON, // Can drive multiple vehicle types
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
  tableName: 'drivers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Driver;


