const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { 
  Booking, 
  Vehicle, 
  Driver, 
  User, 
  FuelLog, 
  ServiceLog,
  sequelize 
} = require('../models');
const { Op } = require('sequelize');

router.use(authenticateToken);

// Get booking analytics
router.get('/bookings', isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    let whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Get booking statistics
    const totalBookings = await Booking.count({ where: whereClause });
    const pendingBookings = await Booking.count({ 
      where: { ...whereClause, status: 'pending' } 
    });
    const approvedBookings = await Booking.count({ 
      where: { ...whereClause, status: 'approved' } 
    });
    const completedBookings = await Booking.count({ 
      where: { ...whereClause, status: 'completed' } 
    });
    const cancelledBookings = await Booking.count({ 
      where: { ...whereClause, status: 'cancelled' } 
    });

    // Get bookings by status over time
    const bookingsByStatus = await Booking.findAll({
      attributes: [
        'status',
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['status', sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
    });

    // Get top 5 most used vehicles
    const topVehicles = await Booking.findAll({
      attributes: [
        'vehicle_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'booking_count']
      ],
      where: whereClause,
      include: [{
        model: Vehicle,
        as: 'vehicle',
        attributes: ['plate_number', 'type', 'model']
      }],
      group: ['vehicle_id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5
    });

    // Get bookings by department
    const bookingsByDepartment = await Booking.findAll({
      attributes: [
        'cost_center',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['cost_center'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    res.json({
      summary: {
        total: totalBookings,
        pending: pendingBookings,
        approved: approvedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings
      },
      byStatus: bookingsByStatus,
      topVehicles,
      byDepartment: bookingsByDepartment
    });
  } catch (error) {
    console.error('Booking analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch booking analytics' });
  }
});

// Get vehicle utilization analytics
router.get('/vehicles', isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get vehicle utilization statistics
    const totalVehicles = await Vehicle.count();
    const availableVehicles = await Vehicle.count({ where: { status: 'available' } });
    const inUseVehicles = await Vehicle.count({ where: { status: 'in_use' } });
    const maintenanceVehicles = await Vehicle.count({ where: { status: 'maintenance' } });

    // Get vehicle utilization percentage
    const vehicleUtilization = await Booking.findAll({
      attributes: [
        'vehicle_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'booking_count'],
        [sequelize.fn('SUM', sequelize.fn('EXTRACT', 'EPOCH', 
          sequelize.literal('end_date - start_date'))), 'total_hours']
      ],
      where: { ...whereClause, status: 'completed' },
      include: [{
        model: Vehicle,
        as: 'vehicle',
        attributes: ['plate_number', 'type', 'model']
      }],
      group: ['vehicle_id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    // Get fuel consumption analytics
    const fuelConsumption = await FuelLog.findAll({
      attributes: [
        'vehicle_id',
        [sequelize.fn('SUM', sequelize.col('liters')), 'total_liters'],
        [sequelize.fn('SUM', sequelize.col('cost')), 'total_cost'],
        [sequelize.fn('AVG', sequelize.col('cost_per_liter')), 'avg_cost_per_liter']
      ],
      where: startDate && endDate ? {
        date: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      } : {},
      include: [{
        model: Vehicle,
        as: 'vehicle',
        attributes: ['plate_number', 'type']
      }],
      group: ['vehicle_id'],
      order: [[sequelize.fn('SUM', sequelize.col('cost')), 'DESC']]
    });

    res.json({
      summary: {
        total: totalVehicles,
        available: availableVehicles,
        inUse: inUseVehicles,
        maintenance: maintenanceVehicles,
        utilizationRate: ((inUseVehicles / totalVehicles) * 100).toFixed(2)
      },
      utilization: vehicleUtilization,
      fuelConsumption
    });
  } catch (error) {
    console.error('Vehicle analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle analytics' });
  }
});

// Get driver analytics
router.get('/drivers', isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get driver statistics
    const totalDrivers = await Driver.count();
    const availableDrivers = await Driver.count({ where: { status: 'available' } });
    const assignedDrivers = await Driver.count({ where: { status: 'assigned' } });

    // Get driver performance
    const driverPerformance = await Booking.findAll({
      attributes: [
        'driver_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'booking_count'],
        [sequelize.fn('SUM', sequelize.fn('EXTRACT', 'EPOCH', 
          sequelize.literal('end_date - start_date'))), 'total_hours']
      ],
      where: { ...whereClause, status: 'completed' },
      include: [{
        model: Driver,
        as: 'driver',
        attributes: ['name', 'license_number']
      }],
      group: ['driver_id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    res.json({
      summary: {
        total: totalDrivers,
        available: availableDrivers,
        assigned: assignedDrivers
      },
      performance: driverPerformance
    });
  } catch (error) {
    console.error('Driver analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch driver analytics' });
  }
});

// Export booking data to Excel (simplified - returns JSON)
router.get('/export/bookings', isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    let whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const bookings = await Booking.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email', 'department']
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plate_number', 'type', 'model']
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['name', 'license_number']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Transform data for export
    const exportData = bookings.map(booking => ({
      id: booking.id,
      user_name: booking.user?.name,
      user_email: booking.user?.email,
      department: booking.user?.department,
      vehicle_plate: booking.vehicle?.plate_number,
      vehicle_type: booking.vehicle?.type,
      vehicle_model: booking.vehicle?.model,
      driver_name: booking.driver?.name,
      driver_license: booking.driver?.license_number,
      purpose: booking.purpose,
      destination: booking.destination,
      start_date: booking.start_date,
      end_date: booking.end_date,
      status: booking.status,
      priority: booking.priority,
      cost_center: booking.cost_center,
      created_at: booking.created_at
    }));

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = Object.keys(exportData[0] || {}).join(',');
      const csvRows = exportData.map(row => 
        Object.values(row).map(value => `"${value}"`).join(',')
      );
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bookings_export.csv"');
      res.send(csvContent);
    } else {
      res.json({
        message: 'Booking data exported successfully',
        count: exportData.length,
        data: exportData
      });
    }
  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json({ error: 'Failed to export booking data' });
  }
});

module.exports = router;
