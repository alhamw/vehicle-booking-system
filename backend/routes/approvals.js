const express = require('express');
const router = express.Router();
const { authenticateToken, isApproverOnly } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');
const {
  updateApproval,
  getApprovals,
  getApprovalById,
  updateApprovalValidation,
  getApprovalsValidation
} = require('../controllers/approvalController');

// All routes require authentication
router.use(authenticateToken);

// Get all approvals (filtered by user's level if not admin)
router.get('/', isApproverOnly, getApprovalsValidation, getApprovals);

// Get approval by ID
router.get('/:id', isApproverOnly, getApprovalById);

// Update approval status (approve/reject) - requires approver role (excludes admin)
router.put('/:id',
  isApproverOnly,
  updateApprovalValidation,
  auditLogger('UPDATE', 'approval'),
  updateApproval
);

module.exports = router;


