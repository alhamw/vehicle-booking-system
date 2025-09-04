const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

const isAdmin = authorizeRoles('admin');
const isApprover = authorizeRoles('approver_l1', 'approver_l2', 'admin');
const isApproverOnly = authorizeRoles('approver_l1', 'approver_l2'); // Excludes admin
const isAdminOrApprover = authorizeRoles('admin', 'approver_l1', 'approver_l2');

module.exports = {
  authenticateToken,
  authorizeRoles,
  isAdmin,
  isApprover,
  isApproverOnly,
  isAdminOrApprover
};



