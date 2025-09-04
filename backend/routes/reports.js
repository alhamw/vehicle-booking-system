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

// Get periodic vehicle booking report
router.get('/vehicle-bookings', isAdmin, async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    
    let whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get all bookings for the period
    const allBookings = await Booking.findAll({
      where: whereClause,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plate_number', 'type', 'make', 'model']
        },
        {
          model: User,
          as: 'user',
          attributes: ['name', 'department']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    // Group bookings by period manually
    const bookingsByPeriod = {};
    const vehicleUtilizationByPeriod = {};
    const topVehiclesByPeriod = {};
    const departmentUsageByPeriod = {};

    allBookings.forEach(booking => {
      const date = new Date(booking.created_at);
      let periodKey;
      
      switch (period) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periodKey = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'yearly':
          periodKey = date.getFullYear().toString();
          break;
      }

      // Initialize period data if not exists
      if (!bookingsByPeriod[periodKey]) {
        bookingsByPeriod[periodKey] = {
          period: periodKey,
          totalBookings: 0,
          approvedBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          totalHours: 0
        };
      }

      if (!vehicleUtilizationByPeriod[periodKey]) {
        vehicleUtilizationByPeriod[periodKey] = {
          period: periodKey,
          uniqueVehicles: new Set(),
          totalDuration: 0,
          bookingCount: 0
        };
      }

      if (!topVehiclesByPeriod[periodKey]) {
        topVehiclesByPeriod[periodKey] = {};
      }

      if (!departmentUsageByPeriod[periodKey]) {
        departmentUsageByPeriod[periodKey] = {};
      }

      // Update booking counts
      bookingsByPeriod[periodKey].totalBookings++;
      if (booking.status === 'approved') bookingsByPeriod[periodKey].approvedBookings++;
      if (booking.status === 'completed') bookingsByPeriod[periodKey].completedBookings++;
      if (booking.status === 'cancelled') bookingsByPeriod[periodKey].cancelledBookings++;

      // Calculate hours
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      const hours = (endDate - startDate) / (1000 * 60 * 60);
      bookingsByPeriod[periodKey].totalHours += hours;

      // Update vehicle utilization
      if (booking.vehicle) {
        vehicleUtilizationByPeriod[periodKey].uniqueVehicles.add(booking.vehicle.id);
        vehicleUtilizationByPeriod[periodKey].totalDuration += hours;
        vehicleUtilizationByPeriod[periodKey].bookingCount++;

        // Track top vehicles
        const vehicleId = booking.vehicle.id;
        if (!topVehiclesByPeriod[periodKey][vehicleId]) {
          topVehiclesByPeriod[periodKey][vehicleId] = {
            vehicleId,
            plateNumber: booking.vehicle.plate_number,
            type: booking.vehicle.type,
            make: booking.vehicle.make,
            model: booking.vehicle.model,
            bookingCount: 0,
            totalHours: 0
          };
        }
        topVehiclesByPeriod[periodKey][vehicleId].bookingCount++;
        topVehiclesByPeriod[periodKey][vehicleId].totalHours += hours;
      }

      // Update department usage
      const dept = booking.user?.department || 'Unknown';
      if (!departmentUsageByPeriod[periodKey][dept]) {
        departmentUsageByPeriod[periodKey][dept] = {
          department: dept,
          bookingCount: 0,
          totalHours: 0
        };
      }
      departmentUsageByPeriod[periodKey][dept].bookingCount++;
      departmentUsageByPeriod[periodKey][dept].totalHours += hours;
    });

    // Convert to arrays and format data
    const bookingsByPeriodArray = Object.values(bookingsByPeriod).map(item => ({
      ...item,
      totalHours: Math.round(item.totalHours * 100) / 100
    }));

    const vehicleUtilizationByPeriodArray = Object.values(vehicleUtilizationByPeriod).map(item => ({
      period: item.period,
      uniqueVehicles: item.uniqueVehicles.size,
      avgBookingDuration: item.bookingCount > 0 ? Math.round((item.totalDuration / item.bookingCount) * 100) / 100 : 0
    }));

    const topVehiclesByPeriodArray = Object.values(topVehiclesByPeriod)
      .flatMap(periodVehicles => 
        Object.values(periodVehicles)
          .map(vehicle => ({
            period: Object.keys(topVehiclesByPeriod).find(key => topVehiclesByPeriod[key][vehicle.vehicleId]),
            ...vehicle,
            totalHours: Math.round(vehicle.totalHours * 100) / 100
          }))
      )
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 50);

    const departmentUsageByPeriodArray = Object.values(departmentUsageByPeriod)
      .flatMap(periodDepts => 
        Object.values(periodDepts)
          .map(dept => ({
            period: Object.keys(departmentUsageByPeriod).find(key => departmentUsageByPeriod[key][dept.department]),
            ...dept,
            totalHours: Math.round(dept.totalHours * 100) / 100
          }))
      );

    res.json({
      period,
      dateFormat: period === 'daily' ? 'YYYY-MM-DD' : period === 'weekly' ? 'YYYY-MM-DD' : period === 'monthly' ? 'YYYY-MM' : period === 'quarterly' ? 'YYYY-Q' : 'YYYY',
      summary: {
        totalPeriods: bookingsByPeriodArray.length,
        totalBookings: bookingsByPeriodArray.reduce((sum, item) => sum + item.totalBookings, 0),
        totalHours: bookingsByPeriodArray.reduce((sum, item) => sum + item.totalHours, 0)
      },
      bookingsByPeriod: bookingsByPeriodArray,
      vehicleUtilizationByPeriod: vehicleUtilizationByPeriodArray,
      topVehiclesByPeriod: topVehiclesByPeriodArray,
      departmentUsageByPeriod: departmentUsageByPeriodArray
    });
  } catch (error) {
    console.error('Vehicle booking report error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle booking report' });
  }
});

module.exports = router;
