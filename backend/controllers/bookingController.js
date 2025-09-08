const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Booking, Vehicle, Driver, User, Approval, AuditLog } = require('../models');
const { logActivity } = require('../middleware/audit');
const ExcelJS = require('exceljs');

const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Only admins can create bookings
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only administrators can create bookings. Please contact your admin to request a booking.'
      });
    }

    const {
      vehicle_id,
      driver_id,
      approver_l1_id,
      approver_l2_id,
      employee_id,
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
      user_id: employee_id || req.user.id, // Employee who requested the booking
      created_by: req.user.role === 'admin' ? req.user.id : null, // Admin who created the booking
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
      priority,
      employee_id,
      approver_id
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
    
    if (employee_id && req.user.role !== 'employee') {
      whereClause.user_id = employee_id;
    }
    
    if (start_date && end_date) {
      whereClause.start_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    // First, get the total count of distinct bookings
    const totalCount = await Booking.count({
      where: whereClause,
      distinct: true,
      include: approver_id && req.user.role !== 'employee' ? [
        {
          model: Approval,
          as: 'approvals',
          where: { approver_id },
          attributes: []
        }
      ] : []
    });

    // Then get the bookings with pagination
    const { rows: bookings } = await Booking.findAndCountAll({
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
          where: approver_id && req.user.role !== 'employee' ? { approver_id } : undefined,
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
      offset: parseInt(offset),
      distinct: true
    });

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
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
          model: User,
          as: 'createdBy',
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
      approver_l1_id,
      approver_l2_id,
      employee_id,
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

    // Prepare update data and track changes
    const updateData = {};
    const oldValues = {};
    const newValues = {};
    let hasChanges = false;

    // Helper function to check if a field has actually changed
    const checkFieldChange = (fieldName, newValue, oldValue) => {
      if (newValue !== undefined && newValue !== null && newValue !== oldValue) {
        updateData[fieldName] = newValue;
        oldValues[fieldName] = oldValue;
        newValues[fieldName] = newValue;
        hasChanges = true;
        return true;
      }
      return false;
    };

    // Check each field for changes
    checkFieldChange('user_id', employee_id, booking.user_id);
    checkFieldChange('vehicle_id', vehicle_id, booking.vehicle_id);
    checkFieldChange('driver_id', driver_id, booking.driver_id);
    checkFieldChange('purpose', purpose, booking.purpose);
    checkFieldChange('destination', destination, booking.destination);
    checkFieldChange('start_date', start_date, booking.start_date);
    checkFieldChange('end_date', end_date, booking.end_date);
    checkFieldChange('priority', priority, booking.priority);
    checkFieldChange('status', status, booking.status);
    checkFieldChange('notes', notes, booking.notes);
    checkFieldChange('start_mileage', start_mileage, booking.start_mileage);
    checkFieldChange('end_mileage', end_mileage, booking.end_mileage);

    // Only update if there are actual changes
    if (hasChanges) {
      await booking.update(updateData);

      // Log activity only if there were actual changes
      await logActivity(
        req.user.id,
        'UPDATE',
        'booking',
        booking.id,
        oldValues,
        newValues,
        'Booking updated'
      );
    }

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
            'CANCEL',
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

    // Note: Audit logging is handled by the auditLogger middleware in routes

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

const exportBookings = async (req, res) => {
  try {
    console.log('Export bookings request received:', req.query);
    
    const {
      status,
      vehicle_id,
      start_date,
      end_date,
      department
    } = req.query;

    // Build where clause (same as getBookings but without pagination)
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
    
    if (department && req.user.role !== 'employee') {
      whereClause.department = department;
    }
    
    if (start_date && end_date) {
      whereClause.start_date = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    console.log('Where clause:', whereClause);

    const bookings = await Booking.findAll({
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
      order: [['created_at', 'DESC']]
    });

    console.log(`Found ${bookings.length} bookings to export`);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings');

    // Define columns
    worksheet.columns = [
      { header: 'Booking ID', key: 'id', width: 10 },
      { header: 'Requester', key: 'requester', width: 20 },
      { header: 'Department', key: 'department', width: 15 },
      { header: 'Vehicle', key: 'vehicle', width: 25 },
      { header: 'Driver', key: 'driver', width: 20 },
      { header: 'Start Date', key: 'start_date', width: 20 },
      { header: 'End Date', key: 'end_date', width: 20 },
      { header: 'Duration', key: 'duration', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Level 1 Approver', key: 'l1_approver', width: 20 },
      { header: 'Level 2 Approver', key: 'l2_approver', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Created At', key: 'created_at', width: 20 }
    ];

    // Add data rows
    bookings.forEach(booking => {
      const l1Approval = booking.approvals?.find(a => a.level === 1);
      const l2Approval = booking.approvals?.find(a => a.level === 2);
      
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      const durationMs = endDate - startDate;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      const duration = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;

      worksheet.addRow({
        id: booking.id,
        requester: booking.user?.name || 'N/A',
        department: booking.user?.department || 'N/A',
        vehicle: booking.vehicle ? `${booking.vehicle.plate_number} - ${booking.vehicle.make} ${booking.vehicle.model}` : 'N/A',
        driver: booking.driver?.name || 'N/A',
                       start_date: startDate.toLocaleDateString('en-GB'),
               end_date: endDate.toLocaleDateString('en-GB'),
        duration: duration,
        status: booking.status.toUpperCase(),
        l1_approver: l1Approval?.approver?.name || 'Not Assigned',
        l2_approver: l2Approval?.approver?.name || 'Not Assigned',
        notes: booking.notes || '',
                         created_at: new Date(booking.created_at).toLocaleDateString('en-GB')
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    console.log('Excel file generated successfully');

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bookings_${new Date().toISOString().split('T')[0]}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json({
      error: 'Failed to export bookings',
      details: error.message
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

const getBookingActivities = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if booking exists
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Check authorization - only admin can view activities
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only administrators can view booking activities'
      });
    }

    // Get all audit logs related to this booking
    const activities = await AuditLog.findAll({
      where: {
        entity_type: 'booking',
        entity_id: id
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
        if (activity.old_values.employee_id) userIds.add(activity.old_values.employee_id);
        if (activity.old_values.approver_l1_id) userIds.add(activity.old_values.approver_l1_id);
        if (activity.old_values.approver_l2_id) userIds.add(activity.old_values.approver_l2_id);
      }
      if (activity.new_values) {
        if (activity.new_values.vehicle_id) vehicleIds.add(activity.new_values.vehicle_id);
        if (activity.new_values.driver_id) driverIds.add(activity.new_values.driver_id);
        if (activity.new_values.user_id) userIds.add(activity.new_values.user_id);
        if (activity.new_values.employee_id) userIds.add(activity.new_values.employee_id);
        if (activity.new_values.approver_l1_id) userIds.add(activity.new_values.approver_l1_id);
        if (activity.new_values.approver_l2_id) userIds.add(activity.new_values.approver_l2_id);
      }
    });

    // Fetch vehicles, drivers, and users in parallel
    const [vehicles, drivers, users] = await Promise.all([
      vehicleIds.size > 0 ? Vehicle.findAll({
        where: { id: Array.from(vehicleIds) },
        attributes: ['id', 'plate_number', 'make', 'model']
      }) : [],
      driverIds.size > 0 ? Driver.findAll({
        where: { id: Array.from(driverIds) },
        attributes: ['id', 'name', 'license_number']
      }) : [],
      userIds.size > 0 ? User.findAll({
        where: { id: Array.from(userIds) },
        attributes: ['id', 'name', 'email', 'role']
      }) : []
    ]);

    // Populate lookup maps
    vehicles.forEach(vehicle => vehicleMap.set(vehicle.id, vehicle));
    drivers.forEach(driver => driverMap.set(driver.id, driver));
    users.forEach(user => userMap.set(user.id, user));

    // Format activities for display
    const formattedActivities = activities.map(activity => {
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
            const formatFieldValue = (field, value) => {
              if (!value) return 'None';
              
              if (field.includes('_date')) {
                return new Date(value).toLocaleDateString('en-GB');
              }
              
              if (field === 'vehicle_id' && typeof value === 'number') {
                const vehicle = vehicleMap.get(value);
                return vehicle ? `${vehicle.plate_number} (${vehicle.make} ${vehicle.model})` : `Vehicle ID: ${value}`;
              }
              
              if (field === 'driver_id' && typeof value === 'number') {
                const driver = driverMap.get(value);
                return driver ? `${driver.name} (${driver.license_number})` : `Driver ID: ${value}`;
              }
              
              if (field.includes('_id') && typeof value === 'number' && !['vehicle_id', 'driver_id'].includes(field)) {
                const user = userMap.get(value);
                return user ? `${user.name} (${user.role.replace('_', ' ').toUpperCase()})` : `User ID: ${value}`;
              }
              
              if (field === 'user_id' && typeof value === 'number') {
                const user = userMap.get(value);
                return user ? `${user.name} (${user.role.replace('_', ' ').toUpperCase()})` : `User ID: ${value}`;
              }
              
              if (field === 'status') {
                return value.replace('_', ' ').toUpperCase();
              }
              
              return value;
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

    res.json({ activities: formattedActivities });
  } catch (error) {
    console.error('Get booking activities error:', error);
    res.status(500).json({ error: 'Failed to fetch booking activities' });
  }
};

const exportBookingActivities = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if booking exists
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Check authorization - only admin can export activities
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only administrators can export booking activities'
      });
    }

    // Get all audit logs related to this booking
    const activities = await AuditLog.findAll({
      where: {
        entity_type: 'booking',
        entity_id: id
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
        if (activity.old_values.employee_id) userIds.add(activity.old_values.employee_id);
        if (activity.old_values.approver_l1_id) userIds.add(activity.old_values.approver_l1_id);
        if (activity.old_values.approver_l2_id) userIds.add(activity.old_values.approver_l2_id);
      }
      if (activity.new_values) {
        if (activity.new_values.vehicle_id) vehicleIds.add(activity.new_values.vehicle_id);
        if (activity.new_values.driver_id) driverIds.add(activity.new_values.driver_id);
        if (activity.new_values.user_id) userIds.add(activity.new_values.user_id);
        if (activity.new_values.employee_id) userIds.add(activity.new_values.employee_id);
        if (activity.new_values.approver_l1_id) userIds.add(activity.new_values.approver_l1_id);
        if (activity.new_values.approver_l2_id) userIds.add(activity.new_values.approver_l2_id);
      }
    });

    // Fetch vehicles, drivers, and users in parallel
    const [vehicles, drivers, users] = await Promise.all([
      vehicleIds.size > 0 ? Vehicle.findAll({
        where: { id: Array.from(vehicleIds) },
        attributes: ['id', 'plate_number', 'make', 'model']
      }) : [],
      driverIds.size > 0 ? Driver.findAll({
        where: { id: Array.from(driverIds) },
        attributes: ['id', 'name', 'license_number']
      }) : [],
      userIds.size > 0 ? User.findAll({
        where: { id: Array.from(userIds) },
        attributes: ['id', 'name', 'email', 'role']
      }) : []
    ]);

    // Populate lookup maps
    vehicles.forEach(vehicle => vehicleMap.set(vehicle.id, vehicle));
    drivers.forEach(driver => driverMap.set(driver.id, driver));
    users.forEach(user => userMap.set(user.id, user));

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Booking Activities');

    // Define columns
    worksheet.columns = [
      { header: 'Activity ID', key: 'id', width: 10 },
      { header: 'Action', key: 'action', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'User', key: 'user', width: 25 },
      { header: 'User Role', key: 'user_role', width: 15 },
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'IP Address', key: 'ip_address', width: 15 },
      { header: 'Old Values', key: 'old_values', width: 30 },
      { header: 'New Values', key: 'new_values', width: 30 }
    ];

    // Add data rows
    activities.forEach(activity => {
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
            const formatFieldValue = (field, value) => {
              if (!value) return 'None';
              
              if (field.includes('_date')) {
                return new Date(value).toLocaleDateString('en-GB');
              }
              
              if (field === 'vehicle_id' && typeof value === 'number') {
                const vehicle = vehicleMap.get(value);
                return vehicle ? `${vehicle.plate_number} (${vehicle.make} ${vehicle.model})` : `Vehicle ID: ${value}`;
              }
              
              if (field === 'driver_id' && typeof value === 'number') {
                const driver = driverMap.get(value);
                return driver ? `${driver.name} (${driver.license_number})` : `Driver ID: ${value}`;
              }
              
              if (field.includes('_id') && typeof value === 'number' && !['vehicle_id', 'driver_id'].includes(field)) {
                const user = userMap.get(value);
                return user ? `${user.name} (${user.role.replace('_', ' ').toUpperCase()})` : `User ID: ${value}`;
              }
              
              if (field === 'user_id' && typeof value === 'number') {
                const user = userMap.get(value);
                return user ? `${user.name} (${user.role.replace('_', ' ').toUpperCase()})` : `User ID: ${value}`;
              }
              
              if (field === 'status') {
                return value.replace('_', ' ').toUpperCase();
              }
              
              return value;
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

      worksheet.addRow({
        id: activity.id,
        action: activity.action,
        description: description,
        user: activity.user ? activity.user.name : 'System',
        user_role: activity.user ? activity.user.role.replace('_', ' ').toUpperCase() : 'SYSTEM',
        timestamp: new Date(activity.created_at).toLocaleString('en-GB'),
        ip_address: activity.ip_address || 'N/A',
        old_values: activity.old_values ? JSON.stringify(activity.old_values) : 'N/A',
        new_values: activity.new_values ? JSON.stringify(activity.new_values) : 'N/A'
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=booking_${id}_activities_${new Date().toISOString().split('T')[0]}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export booking activities error:', error);
    res.status(500).json({
      error: 'Failed to export booking activities',
      details: error.message
    });
  }
};

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
  exportBookings,
  getBookingActivities,
  exportBookingActivities,
  createBookingValidation,
  updateBookingValidation,
  getBookingsValidation
};


