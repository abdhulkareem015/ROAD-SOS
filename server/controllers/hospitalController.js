const fileDatabase = require('../utils/fileDatabase');
const logger = require('../utils/logger');

/**
 * GET /api/hospital/alerts
 * Returns all SOS alerts sent to this hospital, sorted newest first.
 * Requires: authenticate + requireHospital middleware
 */
const getAlerts = async (req, res, next) => {
  try {
    const hospitalId = req.user.id;
    const db = await fileDatabase.read();
    db.hospitalAlerts = db.hospitalAlerts || [];

    const myAlerts = db.hospitalAlerts
      .filter((a) => a.hospitalId === hospitalId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json(myAlerts);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/hospital/alerts/:id/dispatch
 * Marks an alert as dispatched.
 * Requires: authenticate + requireHospital middleware
 */
const dispatchAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.id;

    const db = await fileDatabase.read();
    db.hospitalAlerts = db.hospitalAlerts || [];

    const alertIndex = db.hospitalAlerts.findIndex(
      (a) => a.id === id && a.hospitalId === hospitalId
    );

    if (alertIndex === -1) {
      const err = new Error('Alert not found or does not belong to this hospital');
      err.statusCode = 404;
      throw err;
    }

    db.hospitalAlerts[alertIndex].status = 'dispatched';
    db.hospitalAlerts[alertIndex].dispatchedAt = new Date().toISOString();

    await fileDatabase.write(db);
    logger.info(`[Hospital] Alert ${id} marked as dispatched by hospital ${hospitalId}`);

    return res.status(200).json({ success: true, alert: db.hospitalAlerts[alertIndex] });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAlerts, dispatchAlert };
