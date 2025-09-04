const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');
const { Driver } = require('../models');

router.use(authenticateToken);

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    
    const drivers = await Driver.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    res.json({ drivers });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Get driver by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    res.json({ driver });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

// Create new driver (Admin only)
router.post('/', isAdmin, auditLogger('CREATE', 'driver'), async (req, res) => {
  try {
    const {
      name,
      license_number,
      phone,
      email,
      status = 'available',
      license_expiry = null
    } = req.body;

    // Validate required fields
    if (!name || !license_number) {
      return res.status(400).json({ 
        error: 'Name and license number are required' 
      });
    }

    // Check if license number already exists
    const existingDriver = await Driver.findOne({ 
      where: { license_number } 
    });
    
    if (existingDriver) {
      return res.status(400).json({ 
        error: 'Driver with this license number already exists' 
      });
    }

    const driver = await Driver.create({
      name,
      license_number,
      phone,
      email,
      status,
      license_expiry
    });

    res.status(201).json({ 
      message: 'Driver created successfully',
      driver 
    });
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// Update driver (Admin only)
router.put('/:id', isAdmin, auditLogger('UPDATE', 'driver'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      license_number,
      phone,
      email,
      status,
      license_expiry
    } = req.body;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check if license number already exists (if changed)
    if (license_number && license_number !== driver.license_number) {
      const existingDriver = await Driver.findOne({ 
        where: { license_number } 
      });
      
      if (existingDriver) {
        return res.status(400).json({ 
          error: 'Driver with this license number already exists' 
        });
      }
    }

    await driver.update({
      name,
      license_number,
      phone,
      email,
      status,
      license_expiry
    });

    res.json({ 
      message: 'Driver updated successfully',
      driver 
    });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

// Delete driver (Admin only)
router.delete('/:id', isAdmin, auditLogger('DELETE', 'driver'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check if driver has active bookings
    const activeBookings = await driver.countBookings({
      where: { status: ['pending', 'approved'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete driver with active bookings' 
      });
    }

    await driver.destroy();
    
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

module.exports = router;
