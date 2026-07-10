const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

// Mount checkHealth on root since base router handles '/api/health' prefix
router.get('/', healthController.checkHealth);

module.exports = router;
