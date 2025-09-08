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
    return await Booking.findByPk(id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'plate_number', 'make', 'model', 'status']
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'name', 'license_number', 'status']
        },
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'approverL1',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: User,
          as: 'approverL2',
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
          attributes: ['id', 'plate_number', 'make', 'model']
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'name', 'license_number']
        },
        {
          model: User,
          as: 'employee',
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
    return booking;
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
    return await AuditLog.findAll({
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
