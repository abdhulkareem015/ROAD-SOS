const express = require('express');
const { getAlerts, dispatchAlert } = require('../controllers/hospitalController');
const { authenticate, requireHospital } = require('../middleware/authMiddleware');

const router = express.Router();

// All hospital routes require authentication + hospital role
router.get('/alerts', authenticate, requireHospital, getAlerts);
router.patch('/alerts/:id/dispatch', authenticate, requireHospital, dispatchAlert);

module.exports = router;
