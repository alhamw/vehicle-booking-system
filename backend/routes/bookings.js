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
  exportBookings,
  getBookingActivities,
  exportBookingActivities,
  createBookingValidation,
  updateBookingValidation,
  getBookingsValidation
} = require('../controllers/bookingController');

// All routes require authentication
router.use(authenticateToken);

// Get all bookings (with filters)
router.get('/', getBookingsValidation, getBookings);

// Export bookings to Excel
router.get('/export', getBookingsValidation, exportBookings);

// Create new booking
router.post('/', 
  createBookingValidation,
  auditLogger('CREATE', 'booking'),
  createBooking
);

// Get booking by ID
router.get('/:id', getBookingById);

// Get booking activities (admin only)
router.get('/:id/activities', isAdmin, getBookingActivities);

// Export booking activities (admin only)
router.get('/:id/activities/export', isAdmin, exportBookingActivities);

// Update booking
router.put('/:id',
  updateBookingValidation,
  updateBooking
);

// Cancel booking
router.patch('/:id/cancel',
  auditLogger('CANCEL', 'booking'),
  cancelBooking
);

module.exports = router;



