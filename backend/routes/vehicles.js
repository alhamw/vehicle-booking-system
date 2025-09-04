const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');
const { Vehicle } = require('../models');

router.use(authenticateToken);

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (type) {
      whereClause.type = type;
    }
    
    const vehicles = await Vehicle.findAll({
      where: whereClause,
      order: [['plate_number', 'ASC']]
    });
    
    res.json({ vehicles });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Get vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json({ vehicle });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

// Create new vehicle (Admin only)
router.post('/', isAdmin, auditLogger('CREATE', 'vehicle'), async (req, res) => {
  try {
    const {
      plate_number,
      type,
      model,
      year,
      fuel_type,
      capacity,
      status = 'available'
    } = req.body;

    // Validate required fields
    if (!plate_number || !type || !model) {
      return res.status(400).json({ 
        error: 'Plate number, type, and model are required' 
      });
    }

    // Check if plate number already exists
    const existingVehicle = await Vehicle.findOne({ 
      where: { plate_number } 
    });
    
    if (existingVehicle) {
      return res.status(400).json({ 
        error: 'Vehicle with this plate number already exists' 
      });
    }

    const vehicle = await Vehicle.create({
      plate_number,
      type,
      model,
      year,
      fuel_type,
      capacity,
      status
    });

    res.status(201).json({ 
      message: 'Vehicle created successfully',
      vehicle 
    });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

// Update vehicle (Admin only)
router.put('/:id', isAdmin, auditLogger('UPDATE', 'vehicle'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      plate_number,
      type,
      model,
      year,
      fuel_type,
      capacity,
      status
    } = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if plate number already exists (if changed)
    if (plate_number && plate_number !== vehicle.plate_number) {
      const existingVehicle = await Vehicle.findOne({ 
        where: { plate_number } 
      });
      
      if (existingVehicle) {
        return res.status(400).json({ 
          error: 'Vehicle with this plate number already exists' 
        });
      }
    }

    await vehicle.update({
      plate_number,
      type,
      model,
      year,
      fuel_type,
      capacity,
      status
    });

    res.json({ 
      message: 'Vehicle updated successfully',
      vehicle 
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Delete vehicle (Admin only)
router.delete('/:id', isAdmin, auditLogger('DELETE', 'vehicle'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if vehicle has active bookings
    const activeBookings = await vehicle.countBookings({
      where: { status: ['pending', 'approved'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vehicle with active bookings' 
      });
    }

    await vehicle.destroy();
    
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

module.exports = router;
