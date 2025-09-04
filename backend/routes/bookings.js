const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { auditLogger } = require('../middleware/audit');
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  createBookingValidation,
  updateBookingValidation,
  getBookingsValidation
} = require('../controllers/bookingController');

// All routes require authentication
router.use(authenticateToken);

// Get all bookings (with filters)
router.get('/', getBookingsValidation, getBookings);

// Create new booking
router.post('/', 
  createBookingValidation,
  auditLogger('CREATE', 'booking'),
  createBooking
);

// Get booking by ID
router.get('/:id', getBookingById);

// Update booking
router.put('/:id',
  updateBookingValidation,
  auditLogger('UPDATE', 'booking'),
  updateBooking
);

// Cancel booking
router.patch('/:id/cancel',
  auditLogger('CANCEL', 'booking'),
  cancelBooking
);

module.exports = router;



