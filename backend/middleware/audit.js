const { AuditLog } = require('../models');

const auditLogger = (action, entityType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    let auditLogged = false; // Flag to prevent duplicate logging

    // Store original data for comparison
    const originalData = req.body;
    
    // Override response methods to capture successful operations
    res.send = function(data) {
      if (!auditLogged && res.statusCode >= 200 && res.statusCode < 300) {
        logAuditTrail(req, action, entityType, originalData, data);
        auditLogged = true;
      }
      originalSend.call(this, data);
    };

    res.json = function(data) {
      if (!auditLogged && res.statusCode >= 200 && res.statusCode < 300) {
        logAuditTrail(req, action, entityType, originalData, data);
        auditLogged = true;
      }
      originalJson.call(this, data);
    };

    next();
  };
};

const logAuditTrail = async (req, action, entityType, oldValues = null, newValues = null) => {
  try {
    const logData = {
      user_id: req.user ? req.user.id : null,
      action,
      entity_type: entityType,
      entity_id: null,
      old_values: oldValues,
      new_values: newValues,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      description: `${action} operation on ${entityType}`
    };

    // Extract entity ID from response or request
    if (newValues && typeof newValues === 'object') {
      if (newValues.id) logData.entity_id = newValues.id;
      if (newValues.data && newValues.data.id) logData.entity_id = newValues.data.id;
    }
    
    if (req.params && req.params.id) {
      logData.entity_id = parseInt(req.params.id);
    }

    await AuditLog.create(logData);
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't fail the request if audit logging fails
  }
};

// Direct logging function for manual use
const logActivity = async (userId, action, entityType, entityId, oldValues, newValues, description) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      description
    });
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

module.exports = {
  auditLogger,
  logActivity
};



