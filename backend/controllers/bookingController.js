const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Booking, Vehicle, Driver, User, Approval } = require('../models');
const { logActivity } = require('../middleware/audit');

const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      vehicle_id,
      driver_id,
      approver_l1_id,
      approver_l2_id,
      start_date,
      end_date,
      notes
    } = req.body;

    // Check if vehicle exists and is available
    const vehicle = await Vehicle.findByPk(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({
        error: 'Vehicle not found'
      });
    }

    if (vehicle.status !== 'available') {
      return res.status(400).json({
        error: 'Vehicle not available',
        message: `Vehicle is currently ${vehicle.status}`
      });
    }

    // Check for conflicting bookings
    const conflictingBooking = await Booking.findOne({
      where: {
        vehicle_id,
        status: {
          [Op.in]: ['approved', 'in_progress']
        },
        [Op.or]: [
          {
            start_date: {
              [Op.between]: [start_date, end_date]
            }
          },
          {
            end_date: {
              [Op.between]: [start_date, end_date]
            }
          },
          {
            [Op.and]: [
              {
                start_date: {
                  [Op.lte]: start_date
                }
              },
              {
                end_date: {
                  [Op.gte]: end_date
                }
              }
            ]
          }
        ]
      }
    });

    if (conflictingBooking) {
      return res.status(409).json({
        error: 'Booking conflict',
        message: 'Vehicle is already booked for the selected time period',
        conflicting_booking: {
          id: conflictingBooking.id,
          start_date: conflictingBooking.start_date,
          end_date: conflictingBooking.end_date,
          status: conflictingBooking.status
        }
      });
    }

    // Create booking
    const booking = await Booking.create({
      user_id: req.user.id,
      vehicle_id,
      driver_id: driver_id || null,
      start_date,
      end_date,
      department: req.user.department,
      notes,
      status: 'pending'
    });

    // Create approval records based on admin input or default
    if (req.user.role === 'admin' && approver_l1_id && approver_l2_id) {
      // Admin specified approvers
      await Approval.create({
        booking_id: booking.id,
        approver_id: approver_l1_id,
        level: 1,
        status: 'pending'
      });

      await Approval.create({
        booking_id: booking.id,
        approver_id: approver_l2_id,
        level: 2,
        status: 'pending'
      });
    } else {
      // Default approval process (for employees)
      await Approval.create({
        booking_id: booking.id,
        approver_id: null, // Will be assigned by admin
        level: 1,
        status: 'pending'
      });

      await Approval.create({
        booking_id: booking.id,
        approver_id: null, // Will be assigned by admin
        level: 2,
        status: 'pending'
      });
    }

    // Log activity
    await logActivity(
      req.user.id,
      'CREATE',
      'booking',
      booking.id,
      null,
      {
        vehicle_id,
        start_date,
        end_date,
        notes
      },
      'Booking created'
    );

    // Fetch complete booking data
    let completeBooking;
    try {
      completeBooking = await Booking.findByPk(booking.id, {
        include: [
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'plate_number', 'type', 'make', 'model']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'department']
          },
          {
            model: Approval,
            as: 'approvals',
            required: false, // Use LEFT JOIN to avoid issues with missing approvals
            include: [
              {
                model: User,
                as: 'approver',
                attributes: ['id', 'name', 'email'],
                required: false
              }
            ]
          }
        ]
      });
    } catch (includeError) {
      console.error('Error fetching complete booking data:', includeError);
      // If the include fails, just return the basic booking
      completeBooking = booking;
    }

    res.status(201).json({
      message: 'Booking created successfully',
      booking: completeBooking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      error: 'Failed to create booking'
    });
  }
};

const getBookings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 10,
      status,
      vehicle_id,
      start_date,
      end_date,
      department,
      priority
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build where clause
    let whereClause = {};
    
    // Regular employees can only see their own bookings
    if (req.user.role === 'employee') {
      whereClause.user_id = req.user.id;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (vehicle_id) {
      whereClause.vehicle_id = vehicle_id;
    }
    
    if (priority) {
      whereClause.priority = priority;
    }
    
    if (department && req.user.role !== 'employee') {
      whereClause.department = department;
    }
    
    if (start_date && end_date) {
      whereClause.start_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const { rows: bookings, count } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'plate_number', 'type', 'make', 'model', 'status']
        },
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'name', 'license_number', 'status']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: Approval,
          as: 'approvals',
          include: [
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      error: 'Failed to fetch bookings'
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle'
        },
        {
          model: Driver,
          as: 'driver'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: Approval,
          as: 'approvals',
          include: [
            {
              model: User,
              as: 'approver',
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Check authorization
    if (req.user.role === 'employee' && booking.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own bookings'
      });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      error: 'Failed to fetch booking'
    });
  }
};

const updateBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const {
      vehicle_id,
      driver_id,
      purpose,
      destination,
      start_date,
      end_date,
      priority,
      status,
      notes,
      start_mileage,
      end_mileage
    } = req.body;

    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Authorization check
    const canEdit = req.user.role === 'admin' || 
                   (req.user.role === 'employee' && booking.user_id === req.user.id && booking.status === 'pending');

    if (!canEdit) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You cannot edit this booking'
      });
    }

    const oldValues = {
      vehicle_id: booking.vehicle_id,
      driver_id: booking.driver_id,
      purpose: booking.purpose,
      destination: booking.destination,
      start_date: booking.start_date,
      end_date: booking.end_date,
      priority: booking.priority,
      status: booking.status
    };

    // Update booking
    await booking.update({
      vehicle_id: vehicle_id || booking.vehicle_id,
      driver_id: driver_id || booking.driver_id,
      purpose: purpose || booking.purpose,
      destination: destination || booking.destination,
      start_date: start_date || booking.start_date,
      end_date: end_date || booking.end_date,
      priority: priority || booking.priority,
      status: status || booking.status,
      notes: notes || booking.notes,
      start_mileage: start_mileage || booking.start_mileage,
      end_mileage: end_mileage || booking.end_mileage
    });

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE',
      'booking',
      booking.id,
      oldValues,
      {
        vehicle_id: booking.vehicle_id,
        driver_id: booking.driver_id,
        status: booking.status
      },
      'Booking updated'
    );

    // Fetch updated booking
    const updatedBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle'
        },
        {
          model: Driver,
          as: 'driver'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'department']
        }
      ]
    });

    res.json({
      message: 'Booking updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      error: 'Failed to update booking'
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Authorization check
    const canCancel = req.user.role === 'admin' || 
                     (booking.user_id === req.user.id && ['pending', 'approved'].includes(booking.status));

    if (!canCancel) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You cannot cancel this booking'
      });
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        error: 'Booking cannot be cancelled',
        message: `Booking is already ${booking.status}`
      });
    }

    // Update booking status
    await booking.update({
      status: 'cancelled',
      rejection_reason: reason
    });

    // If admin cancels and approval status is pending, update approval status to cancelled
    if (req.user.role === 'admin') {
      const { Approval } = require('../models');
      
      // Find all pending approvals for this booking
      const pendingApprovals = await Approval.findAll({
        where: {
          booking_id: booking.id,
          status: 'pending'
        }
      });

      // Update all pending approvals to cancelled
      if (pendingApprovals.length > 0) {
        await Approval.update(
          {
            status: 'cancelled',
            comments: 'Cancelled by admin'
          },
          {
            where: {
              booking_id: booking.id,
              status: 'pending'
            }
          }
        );

        // Log approval status changes
        for (const approval of pendingApprovals) {
          await logActivity(
            req.user.id,
            'UPDATE',
            'approval',
            approval.id,
            { status: 'pending' },
            { status: 'cancelled', comments: 'Cancelled by admin' },
            'Approval cancelled by admin'
          );
        }
      }
    }

    // Update vehicle status if it was in use
    if (booking.status === 'in_progress') {
      const vehicle = await Vehicle.findByPk(booking.vehicle_id);
      if (vehicle && vehicle.status === 'in_use') {
        await vehicle.update({ status: 'available' });
      }
    }

    // Log activity
    await logActivity(
      req.user.id,
      'UPDATE',
      'booking',
      booking.id,
      { status: 'cancelled' },
      { status: 'cancelled', reason },
      'Booking cancelled'
    );

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      error: 'Failed to cancel booking'
    });
  }
};

// Validation rules
const createBookingValidation = [
  body('vehicle_id').isInt().withMessage('Valid vehicle ID is required'),
  body('driver_id').optional().isInt().withMessage('Valid driver ID is required'),
  body('approver_l1_id').optional().isInt().withMessage('Valid first approver ID is required'),
  body('approver_l2_id').optional().isInt().withMessage('Valid second approver ID is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long')
];

const updateBookingValidation = [
  body('vehicle_id').optional().isInt().withMessage('Valid vehicle ID is required'),
  body('driver_id').optional().isInt().withMessage('Valid driver ID is required'),
  body('start_date').optional().isISO8601().withMessage('Valid start date is required'),
  body('end_date').optional().isISO8601().withMessage('Valid end date is required'),
  body('status').optional().isIn(['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('start_mileage').optional().isInt().withMessage('Start mileage must be a number'),
  body('end_mileage').optional().isInt().withMessage('End mileage must be a number')
];

const getBookingsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('vehicle_id').optional().isInt().withMessage('Vehicle ID must be a number')
];

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  createBookingValidation,
  updateBookingValidation,
  getBookingsValidation
};


