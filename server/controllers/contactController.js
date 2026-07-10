const fileDatabase = require('../utils/fileDatabase');
const logger = require('../utils/logger');

/**
 * Contact Controller
 * Manages emergency contact CRUD operations and synchronizations
 */

// Fetch all contacts
const getContacts = async (req, res, next) => {
  try {
    const db = await fileDatabase.read();
    res.status(200).json(db.contacts || []);
  } catch (error) {
    next(error);
  }
};

// Create a new contact OR bulk synchronize contact list (backwards compatibility)
const saveContact = async (req, res, next) => {
  try {
    const db = await fileDatabase.read();
    const payload = req.body;

    // SCENARIO 1: Bulk synchronization (Array sent from React Native app)
    if (Array.isArray(payload)) {
      db.contacts = payload;
      await fileDatabase.write(db);
      logger.info(`Synced emergency contact list. Count: ${payload.length}`);
      return res.status(200).json({ success: true, count: payload.length });
    }

    // SCENARIO 2: Create a single contact
    const { name, phone, relation } = payload;
    if (!name || !phone) {
      const err = new Error('Missing required fields: name and phone are mandatory');
      err.statusCode = 400;
      throw err;
    }

    const newContact = {
      id: `c-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      relation: (relation || 'Friend').trim()
    };

    db.contacts = db.contacts || [];
    db.contacts.push(newContact);

    await fileDatabase.write(db);
    logger.info(`Added new contact: ${newContact.name} (${newContact.phone})`);
    res.status(201).json(newContact);
  } catch (error) {
    next(error);
  }
};

// Update an existing contact
const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, relation } = req.body;

    if (!name || !phone) {
      const err = new Error('Missing required fields: name and phone are mandatory');
      err.statusCode = 400;
      throw err;
    }

    const db = await fileDatabase.read();
    db.contacts = db.contacts || [];

    const index = db.contacts.findIndex(c => c.id === id);
    if (index === -1) {
      const err = new Error(`Contact with ID ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    // Update fields
    db.contacts[index] = {
      id,
      name: name.trim(),
      phone: phone.trim(),
      relation: (relation || db.contacts[index].relation || 'Friend').trim()
    };

    await fileDatabase.write(db);
    logger.info(`Updated contact ID ${id}: ${db.contacts[index].name}`);
    res.status(200).json(db.contacts[index]);
  } catch (error) {
    next(error);
  }
};

// Delete a contact
const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await fileDatabase.read();
    db.contacts = db.contacts || [];

    const initialLength = db.contacts.length;
    db.contacts = db.contacts.filter(c => c.id !== id);

    if (db.contacts.length === initialLength) {
      const err = new Error(`Contact with ID ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    await fileDatabase.write(db);
    logger.info(`Deleted contact ID ${id}`);
    res.status(200).json({ success: true, message: `Contact with ID ${id} deleted successfully` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContacts,
  saveContact,
  updateContact,
  deleteContact
};
