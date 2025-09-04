const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getDashboardStats, getVehicleUtilization } = require('../controllers/dashboardController');

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/vehicle-utilization', getVehicleUtilization);

module.exports = router;



