const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { AuditLog, User, sequelize } = require('../models');
const { Op } = require('sequelize');

router.use(authenticateToken);

// Get all audit logs (Admin only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const { 
      action, 
      entity, 
      userId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    let whereClause = {};
    
    // Filter by action
    if (action) {
      whereClause.action = action;
    }
    
    // Filter by entity
    if (entity) {
      whereClause.entity_type = entity;
    }
    
    // Filter by user
    if (userId) {
      whereClause.user_id = userId;
    }
    
    // Filter by date range
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'email', 'role']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit log by ID
router.get('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const auditLog = await AuditLog.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'email', 'role']
      }]
    });
    
    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    
    res.json({ auditLog });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Get audit log statistics
router.get('/stats/summary', isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Get total audit logs
    const totalLogs = await AuditLog.count({ where: whereClause });
    
    // Get logs by action
    const logsByAction = await AuditLog.findAll({
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('AuditLog.id')), 'count']
      ],
      where: whereClause,
      group: ['action'],
      order: [[sequelize.fn('COUNT', sequelize.col('AuditLog.id')), 'DESC']]
    });
    
    // Get logs by entity
    const logsByEntity = await AuditLog.findAll({
      attributes: [
        'entity_type',
        [sequelize.fn('COUNT', sequelize.col('AuditLog.id')), 'count']
      ],
      where: whereClause,
      group: ['entity_type'],
      order: [[sequelize.fn('COUNT', sequelize.col('AuditLog.id')), 'DESC']]
    });
    
    // Get logs by user
    const logsByUser = await AuditLog.findAll({
      attributes: [
        'user_id',
        [sequelize.fn('COUNT', sequelize.col('AuditLog.id')), 'count']
      ],
      where: whereClause,
      group: ['user_id'],
      order: [[sequelize.fn('COUNT', sequelize.col('AuditLog.id')), 'DESC']],
      limit: 10
    });

    // Get user details for the top users
    const userIds = logsByUser.map(log => log.user_id).filter(id => id !== null);
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'name', 'email']
    });

    // Combine the data
    const logsByUserWithDetails = logsByUser.map(log => {
      const user = users.find(u => u.id === log.user_id);
      return {
        user_id: log.user_id,
        count: log.get('count'),
        user: user ? { name: user.name, email: user.email } : null
      };
    });
    
    // Get recent activity (last 24 hours)
    const recentActivity = await AuditLog.count({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    
    res.json({
      summary: {
        total: totalLogs,
        recent24h: recentActivity
      },
      byAction: logsByAction,
      byEntity: logsByEntity,
      byUser: logsByUserWithDetails
    });
  } catch (error) {
    console.error('Audit log stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log statistics' });
  }
});

// Get user activity timeline
router.get('/user/:userId', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;
    
    let whereClause = { user_id: userId };
    
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const auditLogs = await AuditLog.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'email', 'role']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json({ auditLogs });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// Export audit logs
router.get('/export/data', isAdmin, async (req, res) => {
  try {
    const { 
      action, 
      entity, 
      userId, 
      startDate, 
      endDate, 
      format = 'json' 
    } = req.query;
    
    let whereClause = {};
    
    if (action) whereClause.action = action;
    if (entity) whereClause.entity_type = entity;
    if (userId) whereClause.user_id = userId;
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const auditLogs = await AuditLog.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'email', 'role']
      }],
      order: [['created_at', 'DESC']]
    });
    
    // Transform data for export
    const exportData = auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      user_name: log.user?.name,
      user_email: log.user?.email,
      user_role: log.user?.role,
      details: log.details,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at
    }));
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = Object.keys(exportData[0] || {}).join(',');
      const csvRows = exportData.map(row => 
        Object.values(row).map(value => `"${value}"`).join(',')
      );
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs_export.csv"');
      res.send(csvContent);
    } else {
      res.json({
        message: 'Audit logs exported successfully',
        count: exportData.length,
        data: exportData
      });
    }
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

module.exports = router;
