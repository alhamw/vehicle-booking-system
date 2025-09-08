const { body, validationResult } = require('express-validator');
const { Approval, Booking, User, Vehicle } = require('../models');
const { Op } = require('sequelize');
const { logActivity } = require('../middleware/audit');

const updateApproval = async (req, res) => {
  try {
    // Admin users should not have access to approval features
    if (req.user.role === 'admin') {
      return res.status(403).json({
        error: 'Admin users do not have access to approval features'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { status, comments } = req.body;

    const approval = await Approval.findByPk(id, {
      include: [
        {
          model: Booking,
          as: 'booking',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            },
            {
              model: Vehicle,
              as: 'vehicle',
              attributes: ['id', 'plate_number', 'make', 'model']
            }
          ]
        }
      ]
    });

    if (!approval) {
      return res.status(404).json({
        error: 'Approval not found'
      });
    }

    // Check if user has permission to approve at this level
    const userLevel = req.user.role === 'approver_l1' ? 1 : req.user.role === 'approver_l2' ? 2 : null;
    
    if (!userLevel || approval.level !== userLevel) {
      return res.status(403).json({
        error: 'You do not have permission to approve at this level'
      });
    }

    // Check if the user was the originally specified approver for this level
    if (approval.approver_id && approval.approver_id !== req.user.id) {
      return res.status(403).json({
        error: 'You are not the originally specified approver for this booking'
      });
    }

    // Check if approval is still pending
    if (approval.status !== 'pending') {
      return res.status(400).json({
        error: 'This approval has already been processed'
      });
    }

    const oldValues = {
      status: approval.status,
      comments: approval.comments,
      approved_at: approval.approved_at
    };

    // Update approval
    await approval.update({
      status,
      comments,
      approver_id: req.user.id,
      approved_at: status === 'approved' ? new Date() : null
    });

    // Check if we need to update the booking status
    if (status === 'approved') {
      // Get all approvals for this booking
      const allApprovals = await Approval.findAll({
        where: { booking_id: approval.booking_id },
        order: [['level', 'ASC']]
      });

      // Check if this is Level 1 approval
      if (approval.level === 1) {
        // Level 1 approval: set booking status to in_progress
        await approval.booking.update({ status: 'in_progress' });
        
        // Log booking status change
        await logActivity(
          req.user.id,
          'UPDATE',
          'booking',
          approval.booking_id,
          { status: 'pending' },
          { status: 'in_progress' },
          'Booking approved at Level 1 - status set to in_progress'
        );
      } else if (approval.level === 2) {
        // Level 2 approval: check if all approvals are complete
        const allApproved = allApprovals.every(a => a.status === 'approved');
        
        if (allApproved) {
          // All approvals complete - mark booking as approved
          await approval.booking.update({ status: 'approved' });
          
          // Log booking status change
          await logActivity(
            req.user.id,
            'UPDATE',
            'booking',
            approval.booking_id,
            { status: 'in_progress' },
            { status: 'approved' },
            'Booking fully approved - all approval levels complete'
          );
        }
      }
    } else if (status === 'rejected') {
      // Check if this is a Level 2 rejection
      if (approval.level === 2) {
        // Level 2 rejection: cancel Level 1 approval and reject the booking
        await approval.booking.update({ 
          status: 'rejected',
          rejection_reason: comments || 'Rejected during approval process'
        });
        
        // Update Level 1 approval to cancelled (if it exists and is pending)
        await Approval.update(
          { 
            status: 'cancelled',
            comments: 'Cancelled due to Level 2 rejection'
          },
          { 
            where: { 
              booking_id: approval.booking_id,
              level: 1,
              status: 'pending'
            }
          }
        );
        
        // Log booking status change
        await logActivity(
          req.user.id,
          'UPDATE',
          'booking',
          approval.booking_id,
          { status: 'pending' },
          { status: 'rejected' },
          `Booking rejected at Level 2 approval`
        );
      } else {
        // Level 1 rejection: reject the booking and cancel Level 2 approval
        await approval.booking.update({ 
          status: 'rejected',
          rejection_reason: comments || 'Rejected during approval process'
        });
        
        // Update Level 2 approval to cancelled (if it exists and is pending)
        await Approval.update(
          { 
            status: 'cancelled',
            comments: 'Cancelled due to Level 1 rejection'
          },
          { 
            where: { 
              booking_id: approval.booking_id,
              level: 2,
              status: 'pending'
            }
          }
        );
        
        // Log booking status change
        await logActivity(
          req.user.id,
          'UPDATE',
          'booking',
          approval.booking_id,
          { status: 'pending' },
          { status: 'rejected' },
          `Booking rejected at Level 1 approval`
        );
      }
    }

    // Log approval activity
    await logActivity(
      req.user.id,
      'UPDATE',
      'approval',
      approval.id,
      oldValues,
      {
        status,
        comments,
        approver_id: req.user.id
      },
      `Approval ${status} at level ${approval.level}`
    );

    // Fetch updated approval with relations
    const updatedApproval = await Approval.findByPk(approval.id, {
      include: [
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Booking,
          as: 'booking',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            },
            {
              model: Vehicle,
              as: 'vehicle',
              attributes: ['id', 'plate_number', 'make', 'model']
            }
          ]
        }
      ]
    });

    res.json({
      message: `Approval ${status} successfully`,
      approval: updatedApproval
    });

  } catch (error) {
    console.error('Update approval error:', error);
    res.status(500).json({
      error: 'Failed to update approval'
    });
  }
};

const getApprovals = async (req, res) => {
  try {
    // Admin users should not have access to approval features
    if (req.user.role === 'admin') {
      return res.status(403).json({
        error: 'Admin users do not have access to approval features'
      });
    }

    const {
      page = 1,
      limit = 10,
      status,
      level,
      booking_id,
      show_all = false
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build where clause
    let whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (level) {
      whereClause.level = level;
    }
    
    if (booking_id) {
      whereClause.booking_id = booking_id;
    }

    // Filter by user's approval level
    const userLevel = req.user.role === 'approver_l1' ? 1 : 2;
    
    // If show_all is true, don't filter by level (show all approvals)
    if (show_all === 'true') {
      // Don't set level filter - show all approvals
    } else {
      whereClause.level = userLevel;
    }

    // For Approver Level 2, check if they want to see all bookings or only approved by Level 1
    let includeClause = [
      {
        model: User,
        as: 'approver',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Booking,
        as: 'booking',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'department']
          },
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'plate_number', 'type', 'make', 'model']
          }
        ]
      }
    ];

    // If Approver Level 2 and show_all is false, only show Level 2 approvals (not filtered by Level 1 status)
    if (req.user.role === 'approver_l2' && show_all !== 'true') {
      // For Level 2 approvers, just show their Level 2 approvals
      whereClause.level = 2;
    }

    const { rows: approvals, count } = await Approval.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      approvals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({
      error: 'Failed to fetch approvals'
    });
  }
};

const getApprovalById = async (req, res) => {
  try {
    // Admin users should not have access to approval features
    if (req.user.role === 'admin') {
      return res.status(403).json({
        error: 'Admin users do not have access to approval features'
      });
    }

    const { id } = req.params;
    
    const approval = await Approval.findByPk(id, {
      include: [
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Booking,
          as: 'booking',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'department']
            },
            {
              model: Vehicle,
              as: 'vehicle'
            }
          ]
        }
      ]
    });

    if (!approval) {
      return res.status(404).json({
        error: 'Approval not found'
      });
    }

    res.json({ approval });
  } catch (error) {
    console.error('Get approval error:', error);
    res.status(500).json({
      error: 'Failed to fetch approval'
    });
  }
};

// Validation rules
const updateApprovalValidation = [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('comments').optional().trim().isLength({ max: 1000 }).withMessage('Comments too long')
];

const getApprovalsValidation = [
  body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  body('level').optional().isInt({ min: 1, max: 3 }).withMessage('Level must be between 1 and 3')
];

module.exports = {
  updateApproval,
  getApprovals,
  getApprovalById,
  updateApprovalValidation,
  getApprovalsValidation
};

