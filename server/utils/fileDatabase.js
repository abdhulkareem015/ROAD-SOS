const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

const DB_FILE = path.join(__dirname, '../db.json');

const INITIAL_DATA = {
  contacts: [],
  incidents: [],
  sosLogs: []
};

// Queue to serialize all write operations and prevent file corruption/concurrency issues
let writeQueue = Promise.resolve();

/**
 * Enqueues a file write operation to execute sequentially
 * @param {Function} writeOperationFn - Async function performing the write
 * @returns {Promise} Resolves when the write is completed
 */
function serializeWrite(writeOperationFn) {
  writeQueue = writeQueue.then(writeOperationFn).catch((err) => {
    logger.error('Error during serialized write operation:', err);
    throw err;
  });
  return writeQueue;
}

const fileDatabase = {
  /**
   * Initializes the database JSON file if it does not exist or is corrupt
   */
  init: async () => {
    try {
      await fs.access(DB_FILE);
      // Check if it's empty or invalid JSON
      const content = await fs.readFile(DB_FILE, 'utf8');
      if (!content.trim()) {
        await fs.writeFile(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
        logger.info('Initialized empty db.json with default schema');
      } else {
        JSON.parse(content); // Try parsing to validate structure
      }
    } catch (error) {
      logger.info('db.json not found or corrupt, creating new file database...');
      await fs.writeFile(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
    }
  },

  /**
   * Reads all data from the database safely
   * @returns {Object} Parse database contents
   */
  read: async () => {
    await fileDatabase.init();
    try {
      const content = await fs.readFile(DB_FILE, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to read database, returning default fallback schema', error);
      return { ...INITIAL_DATA };
    }
  },

  /**
   * Writes data object back to db.json safely with serialization
   * @param {Object} data - Whole data schema to save
   */
  write: async (data) => {
    // We wrap the write in serializeWrite to avoid race conditions
    return serializeWrite(async () => {
      try {
        const jsonContent = JSON.stringify(data, null, 2);
        await fs.writeFile(DB_FILE, jsonContent, 'utf8');
        return true;
      } catch (error) {
        logger.error('Failed writing data to db.json', error);
        throw error;
      }
    });
  }
};

module.exports = fileDatabase;
