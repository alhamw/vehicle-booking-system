const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Vehicle = require('./Vehicle');
const Driver = require('./Driver');
const Booking = require('./Booking');
const Approval = require('./Approval');
const FuelLog = require('./FuelLog');
const ServiceLog = require('./ServiceLog');
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

Vehicle.hasMany(FuelLog, { foreignKey: 'vehicle_id', as: 'fuel_logs' });
FuelLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

Booking.hasMany(FuelLog, { foreignKey: 'booking_id', as: 'fuel_logs' });
FuelLog.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

User.hasMany(FuelLog, { foreignKey: 'created_by', as: 'fuel_logs' });
FuelLog.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Vehicle.hasMany(ServiceLog, { foreignKey: 'vehicle_id', as: 'service_logs' });
ServiceLog.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

User.hasMany(ServiceLog, { foreignKey: 'created_by', as: 'service_logs' });
ServiceLog.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Vehicle,
  Driver,
  Booking,
  Approval,
  FuelLog,
  ServiceLog,
  AuditLog
};



