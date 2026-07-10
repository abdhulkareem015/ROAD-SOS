const express = require('express');
const contactController = require('../controllers/contactController');

const router = express.Router();

// Mount CRUD operations (base router will handle '/api/contacts' prefix)
router.get('/', contactController.getContacts);
router.post('/', contactController.saveContact);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
