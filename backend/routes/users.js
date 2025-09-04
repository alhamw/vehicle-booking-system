const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');
const { User } = require('../models');

router.use(authenticateToken);

// Get all users (Admin only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const { role, department, status } = req.query;
    
    let whereClause = {};
    if (role) {
      whereClause.role = role;
    }
    if (department) {
      whereClause.department = department;
    }
    if (status) {
      whereClause.status = status;
    }
    
    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] }, // Don't return passwords
      order: [['name', 'ASC']]
    });
    
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (Admin only)
router.post('/', isAdmin, auditLogger('CREATE', 'user'), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      phone,
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        error: 'Name, email, password, and role are required' 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ 
      where: { email } 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email already exists' 
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department,
      phone,
      status
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.status(201).json({ 
      message: 'User created successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (Admin only)
router.put('/:id', isAdmin, auditLogger('UPDATE', 'user'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      password,
      role,
      department,
      phone,
      status
    } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email already exists (if changed)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { email } 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          error: 'User with this email already exists' 
        });
      }
    }

    const updateData = {
      name,
      email,
      role,
      department,
      phone,
      status
    };

    // Only update password if provided
    if (password) {
      updateData.password = password;
    }

    await user.update(updateData);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.json({ 
      message: 'User updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (Admin only)
router.delete('/:id', isAdmin, auditLogger('DELETE', 'user'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of admin users
    if (user.role === 'admin') {
      return res.status(400).json({ 
        error: 'Cannot delete admin users' 
      });
    }

    // Check if user has active bookings
    const activeBookings = await user.countBookings({
      where: { status: ['pending', 'approved'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with active bookings' 
      });
    }

    await user.destroy();
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
