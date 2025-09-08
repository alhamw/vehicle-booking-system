const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Vehicle = require('./Vehicle');
const Driver = require('./Driver');
const Booking = require('./Booking');
const Approval = require('./Approval');
const AuditLog = require('./AuditLog');

// Define associations
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Booking, { foreignKey: 'created_by', as: 'createdBookings' });
Booking.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

Vehicle.hasMany(Booking, { foreignKey: 'vehicle_id', as: 'bookings' });
Booking.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

Driver.hasMany(Booking, { foreignKey: 'driver_id', as: 'bookings' });
Booking.belongsTo(Driver, { foreignKey: 'driver_id', as: 'driver' });

Booking.hasMany(Approval, { foreignKey: 'booking_id', as: 'approvals' });
Approval.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

User.hasMany(Approval, { foreignKey: 'approver_id', as: 'approvals' });
Approval.belongsTo(User, { foreignKey: 'approver_id', as: 'approver' });

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Vehicle,
  Driver,
  Booking,
  Approval,
  AuditLog
};



