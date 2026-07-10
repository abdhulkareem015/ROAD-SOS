const express = require('express');
const sosController = require('../controllers/sosController');

const router = express.Router();

// Mount SOS trigger (base router will handle '/api/sos' prefix)
router.post('/', sosController.logSos);

module.exports = router;
