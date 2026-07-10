const fileDatabase = require('../utils/fileDatabase');
const logger = require('../utils/logger');

/**
 * Calculate distance between two coordinates in km (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * SOS Controller
 * Logs SOS, notifies nearby registered hospitals, simulates SMS/FCM broadcasts.
 */
const logSos = async (req, res, next) => {
  try {
    const payload = req.body;

    // Resolve location fields (handle both nested and flat formats)
    let latitude, longitude, address, contacts, timestamp, source, userId, userName;

    if (payload.location) {
      latitude = payload.location.latitude;
      longitude = payload.location.longitude;
      address = payload.address || 'Unknown Highway Location';
      contacts = payload.contacts || [];
      timestamp = payload.timestamp || new Date().toISOString();
      source = payload.source || 'SOS Monitor Trigger';
    } else {
      latitude = payload.latitude;
      longitude = payload.longitude;
      address = payload.address || `Coordinates locked at [${latitude}, ${longitude}]`;
      contacts = payload.contacts || [];
      timestamp = payload.timestamp || new Date().toISOString();
      source = payload.source || 'User Absolute Trigger';
    }

    // Extract user identity if provided (from logged-in session)
    userId = payload.userId || null;
    userName = payload.userName || 'Anonymous';

    if (latitude === undefined || longitude === undefined) {
      const err = new Error('Coordinates (latitude, longitude) are required');
      err.statusCode = 400;
      throw err;
    }

    const db = await fileDatabase.read();
    db.sosLogs = db.sosLogs || [];
    db.hospitalAlerts = db.hospitalAlerts || [];
    db.hospitals = db.hospitals || [];

    const sosId = `sos-${Date.now()}`;

    // --- Find registered hospitals within 10 km ---
    const ALERT_RADIUS_KM = 10;
    const nearbyRegisteredHospitals = db.hospitals.filter((hospital) => {
      if (!hospital.latitude || !hospital.longitude) return false;
      const dist = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        hospital.latitude,
        hospital.longitude
      );
      hospital._distanceKm = dist; // temp field for logging
      return dist <= ALERT_RADIUS_KM;
    });

    // Sort by distance
    nearbyRegisteredHospitals.sort((a, b) => a._distanceKm - b._distanceKm);

    // Create an alert record for each nearby registered hospital
    const alertsCreated = [];
    for (const hospital of nearbyRegisteredHospitals) {
      const alertRecord = {
        id: `alert-${Date.now()}-${hospital.id}`,
        sosId,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        userId,
        userName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address,
        distanceKm: parseFloat(hospital._distanceKm.toFixed(2)),
        timestamp,
        status: 'pending',
      };
      db.hospitalAlerts.push(alertRecord);
      alertsCreated.push({
        hospitalName: hospital.name,
        distanceKm: alertRecord.distanceKm,
        phone: hospital.phone,
      });
    }

    // Save SOS log
    const newLog = {
      id: sosId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address,
      timestamp,
      source,
      userId,
      userName,
      contactsNotifiedCount: contacts.length,
      nearbyFacilitiesCount: (payload.nearbyFacilities || []).length,
      nearbyFacilities: payload.nearbyFacilities || [],
      registeredHospitalsAlerted: alertsCreated.length,
      autoCalledFacility: payload.autoCalledFacility || null,
    };
    db.sosLogs.unshift(newLog);

    await fileDatabase.write(db);

    // Console output
    console.log('\n=================================================');
    console.log('🚨🚨🚨 SOS ALARM TRIGGERED 🚨🚨🚨');
    console.log(`Source: ${source}`);
    console.log(`User: ${userName} (${userId || 'not logged in'})`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Coordinates: ${latitude}, ${longitude}`);
    console.log(`Maps: https://maps.google.com/?q=${latitude},${longitude}`);
    console.log(`Address: ${address}`);

    if (alertsCreated.length > 0) {
      console.log(`\n✅ Alerted ${alertsCreated.length} registered hospital(s) within ${ALERT_RADIUS_KM}km:`);
      alertsCreated.forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.hospitalName} — ${h.distanceKm}km — 📞 ${h.phone}`);
      });
    } else {
      console.log(`\n⚠️ No registered hospitals found within ${ALERT_RADIUS_KM}km.`);
    }

    if (contacts && contacts.length > 0) {
      console.log('\nSimulated SMS to emergency contacts:');
      contacts.forEach((c) => {
        console.log(`  -> ${c.name} (${c.phone}): "SOS at https://maps.google.com/?q=${latitude},${longitude}"`);
      });
    }

    if (payload.autoCalledFacility) {
      console.log(`\n📞 AUTO-CALLED: ${payload.autoCalledFacility.name} — ${payload.autoCalledFacility.phone}`);
    }

    console.log('=================================================\n');

    return res.status(200).json({
      success: true,
      message: 'SOS alert dispatched successfully',
      registeredHospitalsAlerted: alertsCreated.length,
      hospitalsNotified: alertsCreated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { logSos };
