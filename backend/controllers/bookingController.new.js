const { body, validationResult, query } = require('express-validator');
const BookingService = require('../services/BookingService');

/**
 * Booking Controller
 * Follows Single Responsibility Principle - only handles HTTP request/response logic
 * Uses dependency injection for better testability
 */
class BookingController {
  constructor(bookingService = null) {
    this.bookingService = bookingService || new BookingService();
  }

  /**
   * Create a new booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createBooking(req, res) {
    try {
      // Validate request
      const validationError = this.validateRequest(req);
      if (validationError) {
        return res.status(400).json(validationError);
      }

      // Extract booking data
      const bookingData = this.extractBookingData(req.body);
      
      // Create booking using service
      const booking = await this.bookingService.createBooking(bookingData, req.user);

      res.status(201).json({
        message: 'Booking created successfully',
        booking
      });

    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get all bookings with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBookings(req, res) {
    try {
      // Extract query parameters
      const filters = this.extractQueryFilters(req.query);
      
      // Get bookings using service
      const result = await this.bookingService.getBookings(filters, req.user);

      res.json({
        message: 'Bookings retrieved successfully',
        ...result
      });

    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get booking by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      
      // Get booking using service
      const booking = await this.bookingService.getBookingById(id, req.user);

      res.json({
        message: 'Booking retrieved successfully',
        booking
      });

    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Update booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateBooking(req, res) {
    try {
      // Validate request
      const validationError = this.validateRequest(req);
      if (validationError) {
        return res.status(400).json(validationError);
      }

      const { id } = req.params;
      const updateData = this.extractBookingData(req.body);
      
      // Update booking using service
      const booking = await this.bookingService.updateBooking(id, updateData, req.user);

      res.json({
        message: 'Booking updated successfully',
        booking
      });

    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Cancel booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      // Cancel booking using service
      const booking = await this.bookingService.cancelBooking(id, reason, req.user);

      res.json({
        message: 'Booking cancelled successfully',
        booking
      });

    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get booking activities
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBookingActivities(req, res) {
    try {
      const { id } = req.params;
      
      // Get activities using service
      const activities = await this.bookingService.getBookingActivities(id, req.user);

      res.json({
        message: 'Booking activities retrieved successfully',
        activities
      });

    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Export booking activities
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportBookingActivities(req, res) {
    try {
      const { id } = req.params;
      
      // Export activities using service
      const buffer = await this.bookingService.exportBookingActivities(id, req.user);

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=booking_${id}_activities_${new Date().toISOString().split('T')[0]}.xlsx`);

      // Send file
      res.send(buffer);

    } catch (error) {
      this.handleError(res, error);
    }
  }

  // Helper methods

  /**
   * Validate request data
   * @param {Object} req - Express request object
   * @returns {Object|null} Validation error or null
   */
  validateRequest(req) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return {
        error: 'Validation failed',
        details: errors.array()
      };
    }
    return null;
  }

  /**
   * Extract booking data from request body
   * @param {Object} body - Request body
   * @returns {Object} Extracted booking data
   */
  extractBookingData(body) {
    return {
      vehicle_id: body.vehicle_id,
      driver_id: body.driver_id,
      approver_l1_id: body.approver_l1_id,
      approver_l2_id: body.approver_l2_id,
      employee_id: body.employee_id,
      start_date: body.start_date,
      end_date: body.end_date,
      notes: body.notes
    };
  }

  /**
   * Extract query filters from request
   * @param {Object} query - Request query object
   * @returns {Object} Extracted filters
   */
  extractQueryFilters(query) {
    return {
      page: query.page,
      limit: query.limit,
      status: query.status,
      vehicle_id: query.vehicle_id,
      user_id: query.user_id,
      start_date: query.start_date,
      end_date: query.end_date
    };
  }

  /**
   * Handle errors and send appropriate response
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   */
  handleError(res, error) {
    console.error('Booking controller error:', error);

    // Handle specific error types
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: error.message
      });
    }

    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'Access denied',
        message: error.message
      });
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return res.status(400).json({
        error: 'Bad request',
        message: error.message
      });
    }

    // Default error response
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
}

// Create controller instance
const bookingController = new BookingController();

// Export individual methods for backward compatibility
module.exports = {
  createBooking: bookingController.createBooking.bind(bookingController),
  getBookings: bookingController.getBookings.bind(bookingController),
  getBookingById: bookingController.getBookingById.bind(bookingController),
  updateBooking: bookingController.updateBooking.bind(bookingController),
  cancelBooking: bookingController.cancelBooking.bind(bookingController),
  getBookingActivities: bookingController.getBookingActivities.bind(bookingController),
  exportBookingActivities: bookingController.exportBookingActivities.bind(bookingController),
  
  // Export controller class for testing
  BookingController,
  
  // Validation rules
  createBookingValidation: [
    body('vehicle_id').isInt().withMessage('Vehicle ID must be a number'),
    body('driver_id').isInt().withMessage('Driver ID must be a number'),
    body('approver_l1_id').isInt().withMessage('First approver ID must be a number'),
    body('approver_l2_id').isInt().withMessage('Second approver ID must be a number'),
    body('employee_id').isInt().withMessage('Employee ID must be a number'),
    body('start_date').isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').isISO8601().withMessage('End date must be a valid date'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],

  updateBookingValidation: [
    body('vehicle_id').optional().isInt().withMessage('Vehicle ID must be a number'),
    body('driver_id').optional().isInt().withMessage('Driver ID must be a number'),
    body('approver_l1_id').optional().isInt().withMessage('First approver ID must be a number'),
    body('approver_l2_id').optional().isInt().withMessage('Second approver ID must be a number'),
    body('employee_id').optional().isInt().withMessage('Employee ID must be a number'),
    body('start_date').optional().isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').optional().isISO8601().withMessage('End date must be a valid date'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],

  getBookingsValidation: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
    query('vehicle_id').optional().isInt().withMessage('Vehicle ID must be a number')
  ]
};

