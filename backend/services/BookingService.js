const { Op } = require('sequelize');
const { BookingRepository, VehicleRepository, UserRepository } = require('./repositories');
const BookingActivityExportService = require('./BookingActivityExportService');

/**
 * Service layer for booking business logic
 * Follows Single Responsibility Principle - handles booking business logic
 */
class BookingService {
  constructor() {
    this.bookingRepository = new BookingRepository();
    this.vehicleRepository = new VehicleRepository();
    this.userRepository = new UserRepository();
    this.exportService = new BookingActivityExportService();
  }

  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Created booking
   */
  async createBooking(bookingData, user) {
    // Validate user permissions
    this.validateAdminAccess(user);

    // Validate vehicle availability
    await this.validateVehicleAvailability(bookingData.vehicle_id);

    // Validate approvers exist
    await this.validateApprovers(bookingData.approver_l1_id, bookingData.approver_l2_id);

    // Validate employee exists
    await this.validateEmployee(bookingData.employee_id);

    // Validate driver exists
    await this.validateDriver(bookingData.driver_id);

    // Validate date range
    this.validateDateRange(bookingData.start_date, bookingData.end_date);

    // Create booking with user_id
    const bookingDataWithUser = {
      ...bookingData,
      user_id: bookingData.employee_id, // Use employee_id as user_id
      created_by: user.id // Track who created the booking
    };
    
    const booking = await this.bookingRepository.create(bookingDataWithUser);

    // Create approval records
    await this.createApprovalRecords(booking.id, bookingData.approver_l1_id, bookingData.approver_l2_id);

    // Update vehicle status
    await this.vehicleRepository.updateStatus(bookingData.vehicle_id, 'in_use');

    return booking;
  }

  /**
   * Create approval records for a booking
   * @param {string|number} bookingId - Booking ID
   * @param {string|number} approverL1Id - First approver ID
   * @param {string|number} approverL2Id - Second approver ID
   */
  async createApprovalRecords(bookingId, approverL1Id, approverL2Id) {
    const { Approval } = require('../models');
    
    // Create Level 1 approval
    await Approval.create({
      booking_id: bookingId,
      approver_id: approverL1Id,
      level: 1,
      status: 'pending'
    });

    // Create Level 2 approval
    await Approval.create({
      booking_id: bookingId,
      approver_id: approverL2Id,
      level: 2,
      status: 'pending'
    });
  }

  /**
   * Get booking by ID
   * @param {string|number} id - Booking ID
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Booking object
   */
  async getBookingById(id, user) {
    const booking = await this.bookingRepository.findByIdWithRelations(id);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if user has access to this booking
    await this.validateBookingAccess(booking, user);

    return booking;
  }

  /**
   * Get all bookings with filters
   * @param {Object} filters - Filter options
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Paginated bookings
   */
  async getBookings(filters, user) {
    // Apply user-specific filters
    const filteredOptions = this.applyUserFilters(filters, user);
    
    return await this.bookingRepository.findAll(filteredOptions);
  }

  /**
   * Update booking
   * @param {string|number} id - Booking ID
   * @param {Object} updateData - Update data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Updated booking
   */
  async updateBooking(id, updateData, user) {
    const booking = await this.bookingRepository.findById(id);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Validate user permissions
    this.validateBookingUpdateAccess(booking, user);

    // Validate vehicle availability if changing vehicle
    if (updateData.vehicle_id && updateData.vehicle_id !== booking.vehicle_id) {
      await this.validateVehicleAvailability(updateData.vehicle_id);
    }

    // Capture old values for audit
    const oldValues = {
      user_id: booking.user_id,
      vehicle_id: booking.vehicle_id,
      driver_id: booking.driver_id,
      start_date: booking.start_date,
      end_date: booking.end_date,
      notes: booking.notes,
      status: booking.status
    };

    // Update booking
    const updatedBooking = await this.bookingRepository.update(id, updateData);

    // Create audit log entry with proper old and new values
    const { logActivity } = require('../middleware/audit');
    const changedFields = {};
    const newValues = {};
    
    // Only log fields that actually changed
    Object.keys(updateData).forEach(key => {
      if (oldValues.hasOwnProperty(key) && oldValues[key] !== updateData[key]) {
        changedFields[key] = oldValues[key];
        newValues[key] = updateData[key];
      }
    });

    if (Object.keys(changedFields).length > 0) {
      await logActivity(
        user.id,
        'UPDATE',
        'booking',
        id,
        changedFields,
        newValues,
        'Booking updated'
      );
    }

    // Update vehicle status if needed
    if (updateData.vehicle_id && updateData.vehicle_id !== booking.vehicle_id) {
      await this.vehicleRepository.updateStatus(booking.vehicle_id, 'available');
      await this.vehicleRepository.updateStatus(updateData.vehicle_id, 'in_use');
    }

    return updatedBooking;
  }

  /**
   * Cancel booking
   * @param {string|number} id - Booking ID
   * @param {string} reason - Cancellation reason
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Cancelled booking
   */
  async cancelBooking(id, reason, user) {
    const booking = await this.bookingRepository.findById(id);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Validate cancellation permissions
    this.validateCancellationAccess(booking, user);

    // Update booking status
    const updatedBooking = await this.bookingRepository.update(id, {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date(),
      cancelled_by: user.id
    });

    // Update pending approvals to cancelled
    await this.updatePendingApprovalsToCancelled(id, 'Booking cancelled');

    // Update vehicle status
    await this.vehicleRepository.updateStatus(booking.vehicle_id, 'available');

    return updatedBooking;
  }

  /**
   * Update pending approvals to cancelled status
   * @param {string|number} bookingId - Booking ID
   * @param {string} reason - Cancellation reason
   */
  async updatePendingApprovalsToCancelled(bookingId, reason) {
    const { Approval } = require('../models');
    
    await Approval.update(
      { 
        status: 'cancelled',
        comments: reason
      },
      { 
        where: { 
          booking_id: bookingId,
          status: 'pending'
        }
      }
    );
  }

  /**
   * Get booking activities
   * @param {string|number} bookingId - Booking ID
   * @param {Object} user - Current user
   * @returns {Promise<Array>} Array of activities
   */
  async getBookingActivities(bookingId, user) {
    // Validate admin access
    this.validateAdminAccess(user);

    return await this.bookingRepository.getActivities(bookingId);
  }

  /**
   * Export booking activities
   * @param {string|number} bookingId - Booking ID
   * @param {Object} user - Current user
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async exportBookingActivities(bookingId, user) {
    // Validate admin access
    this.validateAdminAccess(user);

    // Check if booking exists
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    return await this.exportService.exportActivities(bookingId);
  }

  // Validation methods

  /**
   * Validate admin access
   * @param {Object} user - Current user
   * @throws {Error} If user is not admin
   */
  validateAdminAccess(user) {
    if (user.role !== 'admin') {
      throw new Error('Access denied. Admin privileges required.');
    }
  }

  /**
   * Validate vehicle availability
   * @param {string|number} vehicleId - Vehicle ID
   * @throws {Error} If vehicle is not available
   */
  async validateVehicleAvailability(vehicleId) {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    if (vehicle.status !== 'available') {
      throw new Error(`Vehicle is currently ${vehicle.status}`);
    }
  }

  /**
   * Validate approvers exist
   * @param {string|number} approverL1Id - First approver ID
   * @param {string|number} approverL2Id - Second approver ID
   * @throws {Error} If approvers don't exist
   */
  async validateApprovers(approverL1Id, approverL2Id) {
    const [approverL1, approverL2] = await Promise.all([
      this.userRepository.findById(approverL1Id),
      this.userRepository.findById(approverL2Id)
    ]);

    if (!approverL1) {
      throw new Error('First approver not found');
    }

    if (!approverL2) {
      throw new Error('Second approver not found');
    }
  }

  /**
   * Validate employee exists
   * @param {string|number} employeeId - Employee ID
   * @throws {Error} If employee doesn't exist
   */
  async validateEmployee(employeeId) {
    const employee = await this.userRepository.findById(employeeId);
    
    if (!employee) {
      throw new Error('Employee not found');
    }
  }

  /**
   * Validate driver exists
   * @param {string|number} driverId - Driver ID
   * @throws {Error} If driver doesn't exist
   */
  async validateDriver(driverId) {
    const { Driver } = require('../models');
    const driver = await Driver.findByPk(driverId);
    
    if (!driver) {
      throw new Error('Driver not found');
    }
  }

  /**
   * Validate date range
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date
   * @throws {Error} If date range is invalid
   */
  validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      throw new Error('Start date cannot be in the past');
    }

    if (end <= start) {
      throw new Error('End date must be after start date');
    }
  }

  /**
   * Validate booking access
   * @param {Object} booking - Booking object
   * @param {Object} user - Current user
   * @throws {Error} If user doesn't have access
   */
  async validateBookingAccess(booking, user) {
    if (user.role === 'admin') return;
    if (booking.user_id === user.id) return;
    
    // Check if user is an approver for this booking
    if (['approver_l1', 'approver_l2'].includes(user.role)) {
      const { Approval } = require('../models');
      const approval = await Approval.findOne({
        where: {
          booking_id: booking.id,
          approver_id: user.id
        }
      });
      
      if (approval) return; // User is an approver for this booking
    }
    
    throw new Error('Access denied. You can only view your own bookings or bookings you need to approve.');
  }

  /**
   * Validate booking update access
   * @param {Object} booking - Booking object
   * @param {Object} user - Current user
   * @throws {Error} If user doesn't have update access
   */
  validateBookingUpdateAccess(booking, user) {
    if (user.role === 'admin') return;
    if (booking.user_id === user.id && booking.status === 'pending') return;
    
    throw new Error('Access denied. You can only update your own pending bookings.');
  }

  /**
   * Validate cancellation access
   * @param {Object} booking - Booking object
   * @param {Object} user - Current user
   * @throws {Error} If user doesn't have cancellation access
   */
  validateCancellationAccess(booking, user) {
    // Only admins can cancel bookings
    if (user.role !== 'admin') {
      throw new Error('Access denied. Only administrators can cancel bookings.');
    }
    
    // Check if booking can be cancelled
    if (!['pending', 'approved'].includes(booking.status)) {
      throw new Error('Access denied. Only pending or approved bookings can be cancelled.');
    }
  }

  /**
   * Apply user-specific filters
   * @param {Object} filters - Original filters
   * @param {Object} user - Current user
   * @returns {Object} Filtered options
   */
  applyUserFilters(filters, user) {
    const filteredOptions = { ...filters };
    
    // Non-admin users can only see their own bookings
    if (user.role !== 'admin') {
      filteredOptions.user_id = user.id;
    }
    
    return filteredOptions;
  }
}

module.exports = BookingService;
