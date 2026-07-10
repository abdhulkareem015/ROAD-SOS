/**
 * Reusable Logging Utility for RoadSOS Server
 * Provides formatted console prints with timestamps and categories
 */

const logger = {
  info: (message, meta = '') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ℹ️ [INFO]: ${message}`, meta ? JSON.stringify(meta) : '');
  },

  warn: (message, meta = '') => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ⚠️ [WARN]: ${message}`, meta ? JSON.stringify(meta) : '');
  },

  error: (message, error = '') => {
    const timestamp = new Date().toISOString();
    console.error(
      `[${timestamp}] ❌ [ERROR]: ${message}`,
      error instanceof Error ? error.stack : error
    );
  },

  sos: (message, details = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`\n=================================================`);
    console.log(`🚨🚨🚨 SOS ALARM DETECTED [${timestamp}] 🚨🚨🚨`);
    console.log(`📍 Message: ${message}`);
    if (details.location) {
      console.log(`🌐 Coordinates: Latitude ${details.location.latitude}, Longitude ${details.location.longitude}`);
    }
    if (details.address) {
      console.log(`🏡 Resolved Address: ${details.address}`);
    }
    if (details.contacts && details.contacts.length > 0) {
      console.log(`📲 Contacts to Broadcast: ${details.contacts.length}`);
    }
    console.log(`=================================================\n`);
  }
};

module.exports = logger;
