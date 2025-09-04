const { Booking, Vehicle, User, Approval } = require('../models');
const { Op } = require('sequelize');

const getDashboardStats = async (req, res) => {
  try {
    // Get basic statistics
    const totalBookings = await Booking.count();
    const pendingBookings = await Booking.count({ where: { status: 'pending' } });
    const approvedBookings = await Booking.count({ where: { status: 'approved' } });
    const totalVehicles = await Vehicle.count();
    const availableVehicles = await Vehicle.count({ where: { status: 'available' } });

    // Get recent activity
    const recentBookings = await Booking.findAll({
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['plate_number', 'make', 'model']
        },
        {
          model: User,
          as: 'user',
          attributes: ['name', 'department']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    res.json({
      stats: {
        totalBookings,
        pendingBookings,
        approvedBookings,
        totalVehicles,
        availableVehicles
      },
      recentBookings
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

const getVehicleUtilization = async (req, res) => {
  try {
    const { period = '30' } = req.query; // Default to last 30 days
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get all vehicles with their booking counts and total hours
    const vehicles = await Vehicle.findAll({
      include: [
        {
          model: Booking,
          as: 'bookings',
          where: {
            start_date: {
              [Op.gte]: startDate,
              [Op.lte]: endDate
            },
            status: {
              [Op.in]: ['approved', 'in_progress', 'completed']
            }
          },
          required: false,
          attributes: ['id', 'start_date', 'end_date', 'status']
        }
      ],
      attributes: ['id', 'plate_number', 'make', 'model', 'type', 'status']
    });

    // Calculate utilization metrics for each vehicle
    const utilizationData = vehicles.map(vehicle => {
      const bookings = vehicle.bookings || [];
      
      // Calculate total hours booked
      let totalHours = 0;
      bookings.forEach(booking => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const hours = (end - start) / (1000 * 60 * 60);
        totalHours += hours;
      });

      // Calculate utilization percentage (assuming 24 hours per day)
      const totalDays = parseInt(period);
      const totalAvailableHours = totalDays * 24;
      const utilizationPercentage = totalAvailableHours > 0 ? (totalHours / totalAvailableHours) * 100 : 0;

      return {
        id: vehicle.id,
        plateNumber: vehicle.plate_number,
        make: vehicle.make,
        model: vehicle.model,
        type: vehicle.type,
        status: vehicle.status,
        bookingCount: bookings.length,
        totalHours: Math.round(totalHours * 100) / 100,
        utilizationPercentage: Math.round(utilizationPercentage * 100) / 100
      };
    });

    // Sort by utilization percentage (highest first)
    utilizationData.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

    // Get top 10 most utilized vehicles
    const topUtilizedVehicles = utilizationData.slice(0, 10);

    // Calculate overall fleet utilization
    const totalFleetHours = utilizationData.reduce((sum, vehicle) => sum + vehicle.totalHours, 0);
    const totalFleetAvailableHours = vehicles.length * parseInt(period) * 24;
    const fleetUtilizationPercentage = totalFleetAvailableHours > 0 ? 
      (totalFleetHours / totalFleetAvailableHours) * 100 : 0;

    // Prepare chart data
    const chartData = {
      labels: topUtilizedVehicles.map(v => v.plateNumber),
      datasets: [
        {
          label: 'Utilization %',
          data: topUtilizedVehicles.map(v => v.utilizationPercentage),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };

    res.json({
      period,
      fleetUtilization: Math.round(fleetUtilizationPercentage * 100) / 100,
      totalFleetHours: Math.round(totalFleetHours * 100) / 100,
      vehicleCount: vehicles.length,
      topUtilizedVehicles,
      chartData,
      allVehicles: utilizationData
    });

  } catch (error) {
    console.error('Vehicle utilization error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle utilization data' });
  }
};

module.exports = {
  getDashboardStats,
  getVehicleUtilization
};
