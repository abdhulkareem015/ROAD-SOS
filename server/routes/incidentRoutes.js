const express = require('express');
const incidentController = require('../controllers/incidentController');

const router = express.Router();

// Mount incident routes (base router will handle '/api/incidents' and '/api/reports' prefixes)
router.get('/', incidentController.getIncidents);
router.post('/', incidentController.createIncident);

module.exports = router;
