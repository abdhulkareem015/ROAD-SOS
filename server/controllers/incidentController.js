const fileDatabase = require('../utils/fileDatabase');
const logger = require('../utils/logger');

/**
 * Incident Controller
 * Manages crash/breakdown witness reporting and logs
 */

// Fetch all incident reports sorted by latest timestamp first
const getIncidents = async (req, res, next) => {
  try {
    const db = await fileDatabase.read();
    const incidents = db.incidents || [];

    // Sort by ISO timestamp descending (latest first)
    const sortedIncidents = [...incidents].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    res.status(200).json(sortedIncidents);
  } catch (error) {
    next(error);
  }
};

// Create a new incident report
const createIncident = async (req, res, next) => {
  try {
    const { category, description, severity, latitude, longitude } = req.body;

    // Validate fields
    if (!category || !description || !severity || latitude === undefined || longitude === undefined) {
      const err = new Error('Missing required incident details (category, description, severity, latitude, longitude)');
      err.statusCode = 400;
      throw err;
    }

    const db = await fileDatabase.read();
    db.incidents = db.incidents || [];

    const newIncident = {
      id: `rep-${Date.now()}`, // rep- prefix for frontend compatibility
      category: category.trim(),
      description: description.trim(),
      severity: severity.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date().toISOString()
    };

    db.incidents.unshift(newIncident); // Add to the front of the array

    await fileDatabase.write(db);
    logger.info(`[Incident Logged] Category: ${newIncident.category}, Severity: ${newIncident.severity} at [${newIncident.latitude}, ${newIncident.longitude}]`);
    res.status(201).json(newIncident);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIncidents,
  createIncident
};
