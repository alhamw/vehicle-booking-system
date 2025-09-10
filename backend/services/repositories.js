const { Booking, Vehicle, Driver, User, Approval, AuditLog } = require('../models');

/**
 * Repository pattern for booking-related database operations
 * Follows Single Responsibility Principle - only handles data access
 */
class BookingRepository {
  /**
   * Find booking by ID
   * @param {string|number} id - Booking ID
   * @returns {Promise<Object|null>} Booking object or null
   */
  async findById(id) {
    return await Booking.findByPk(id);
  }

  /**
   * Find booking by ID with related data
   * @param {string|number} id - Booking ID
   * @returns {Promise<Object|null>} Booking object with relations or null
   */
  async findByIdWithRelations(id) {
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'plate_number', 'make', 'model', 'year', 'type', 'fuel_type', 'status']
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'name', 'license_number', 'status']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: Approval,
          as: 'approvals',
          include: [
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'name', 'email', 'role']
            }
          ],
          order: [['level', 'ASC']]
        }
      ]
    });
    
    return booking;
  }

  /**
   * Get all bookings with pagination and filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated bookings result
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      vehicle_id,
      user_id,
      start_date,
      end_date
    } = options;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (user_id) where.user_id = user_id;
    if (start_date) where.start_date = { [Op.gte]: start_date };
    if (end_date) where.end_date = { [Op.lte]: end_date };

    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'plate_number', 'make', 'model', 'year', 'type', 'fuel_type', 'status']
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'name', 'license_number']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return {
      bookings: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Created booking
   */
  async create(bookingData) {
    return await Booking.create(bookingData);
  }

  /**
   * Update booking by ID
   * @param {string|number} id - Booking ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated booking
   */
  async update(id, updateData) {
    const booking = await Booking.findByPk(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    await booking.update(updateData);
    
    // Return updated booking with relations
    return await this.findByIdWithRelations(id);
  }

  /**
   * Delete booking by ID
   * @param {string|number} id - Booking ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const booking = await Booking.findByPk(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    await booking.destroy();
    return true;
  }

  /**
   * Get booking activities
   * @param {string|number} bookingId - Booking ID
   * @returns {Promise<Array>} Array of activities
   */
  async getActivities(bookingId) {
    const activities = await AuditLog.findAll({
      where: {
        entity_type: 'booking',
        entity_id: bookingId
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Create lookup maps for better performance
    const vehicleMap = new Map();
    const driverMap = new Map();
    const userMap = new Map();

    // Collect all unique IDs from activities
    const vehicleIds = new Set();
    const driverIds = new Set();
    const userIds = new Set();

    activities.forEach(activity => {
      if (activity.old_values) {
        if (activity.old_values.vehicle_id) vehicleIds.add(activity.old_values.vehicle_id);
        if (activity.old_values.driver_id) driverIds.add(activity.old_values.driver_id);
        if (activity.old_values.user_id) userIds.add(activity.old_values.user_id);
      }
      if (activity.new_values) {
        if (activity.new_values.vehicle_id) vehicleIds.add(activity.new_values.vehicle_id);
        if (activity.new_values.driver_id) driverIds.add(activity.new_values.driver_id);
        if (activity.new_values.user_id) userIds.add(activity.new_values.user_id);
      }
    });

    // Fetch related entities if we have IDs
    if (vehicleIds.size > 0) {
      const vehicles = await Vehicle.findAll({
        where: { id: Array.from(vehicleIds) },
        attributes: ['id', 'plate_number', 'make', 'model']
      });
      vehicles.forEach(vehicle => vehicleMap.set(vehicle.id, vehicle));
    }

    if (driverIds.size > 0) {
      const drivers = await Driver.findAll({
        where: { id: Array.from(driverIds) },
        attributes: ['id', 'name']
      });
      drivers.forEach(driver => driverMap.set(driver.id, driver));
    }

    if (userIds.size > 0) {
      const users = await User.findAll({
        where: { id: Array.from(userIds) },
        attributes: ['id', 'name', 'email']
      });
      users.forEach(user => userMap.set(user.id, user));
    }

    // Format activities for display
    return activities.map(activity => {
      let description = activity.description || '';
      
      // Add more context based on action type
      switch (activity.action) {
        case 'CREATE':
          description = 'Booking created';
          break;
        case 'UPDATE':
          description = 'Booking updated';
          if (activity.old_values && activity.new_values) {
            const changes = [];
            
            // Helper function to format field names
            const formatFieldName = (field) => {
              const fieldMap = {
                'vehicle_id': 'Vehicle',
                'driver_id': 'Driver',
                'user_id': 'Employee',
                'employee_id': 'Employee',
                'start_date': 'Start Date',
                'end_date': 'End Date',
                'notes': 'Notes',
                'status': 'Status',
                'approver_l1_id': 'First Approver',
                'approver_l2_id': 'Second Approver'
              };
              return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            };

            // Helper function to format field values with names
            const formatFieldValue = (key, value) => {
              if (value === null || value === undefined) return 'None';
              
              switch (key) {
                case 'vehicle_id':
                  const vehicle = vehicleMap.get(parseInt(value));
                  return vehicle ? `${vehicle.plate_number} (${vehicle.make} ${vehicle.model})` : value;
                case 'driver_id':
                  const driver = driverMap.get(parseInt(value));
                  return driver ? driver.name : value;
                case 'user_id':
                case 'employee_id':
                  const user = userMap.get(parseInt(value));
                  return user ? user.name : value;
                case 'start_date':
                case 'end_date':
                  return new Date(value).toLocaleString();
                default:
                  return value;
              }
            };

            Object.keys(activity.new_values).forEach(key => {
              if (activity.old_values[key] !== activity.new_values[key]) {
                const fieldName = formatFieldName(key);
                const oldValue = formatFieldValue(key, activity.old_values[key]);
                const newValue = formatFieldValue(key, activity.new_values[key]);
                changes.push(`${fieldName}: ${oldValue} → ${newValue}`);
              }
            });
            
            if (changes.length > 0) {
              description += ` (${changes.join(', ')})`;
            }
          }
          break;
        case 'CANCEL':
          description = 'Booking cancelled';
          break;
        case 'APPROVE':
          description = 'Booking approved';
          break;
        case 'REJECT':
          description = 'Booking rejected';
          break;
        default:
          description = activity.description || activity.action;
      }

      return {
        id: activity.id,
        action: activity.action,
        description: description,
        user: activity.user ? {
          id: activity.user.id,
          name: activity.user.name,
          email: activity.user.email,
          role: activity.user.role
        } : null,
        timestamp: activity.created_at,
        ip_address: activity.ip_address,
        old_values: activity.old_values,
        new_values: activity.new_values
      };
    });
  }
}

/**
 * Repository pattern for vehicle-related database operations
 */
class VehicleRepository {
  /**
   * Find vehicle by ID
   * @param {string|number} id - Vehicle ID
   * @returns {Promise<Object|null>} Vehicle object or null
   */
  async findById(id) {
    return await Vehicle.findByPk(id);
  }

  /**
   * Find available vehicles
   * @returns {Promise<Array>} Array of available vehicles
   */
  async findAvailable() {
    return await Vehicle.findAll({
      where: { status: 'available' },
      attributes: ['id', 'plate_number', 'make', 'model', 'status']
    });
  }

  /**
   * Update vehicle status
   * @param {string|number} id - Vehicle ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated vehicle
   */
  async updateStatus(id, status) {
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }
    
    await vehicle.update({ status });
    return vehicle;
  }
}

/**
 * Repository pattern for user-related database operations
 */
class UserRepository {
  /**
   * Find user by ID
   * @param {string|number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(id) {
    return await User.findByPk(id);
  }

  /**
   * Find users by role
   * @param {string} role - User role
   * @returns {Promise<Array>} Array of users
   */
  async findByRole(role) {
    return await User.findAll({
      where: { role },
      attributes: ['id', 'name', 'email', 'role']
    });
  }

  /**
   * Find approvers
   * @returns {Promise<Array>} Array of approvers
   */
  async findApprovers() {
    return await User.findAll({
      where: {
        role: {
          [Op.in]: ['approver_l1', 'approver_l2']
        }
      },
      attributes: ['id', 'name', 'email', 'role']
    });
  }
}

module.exports = {
  BookingRepository,
  VehicleRepository,
  UserRepository
};
