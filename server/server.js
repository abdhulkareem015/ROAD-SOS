const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const fileDatabase = require('./utils/fileDatabase');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const sosRoutes = require('./routes/sosRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());

// Initialize file database
fileDatabase.init()
  .then(() => {
    logger.info('Local JSON database loaded successfully');
  })
  .catch((err) => {
    logger.error('Failed to initialize local JSON database:', err);
  });

// Mount Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/reports', incidentRoutes); // alias for mobile compatibility
app.use('/api/sos', sosRoutes);
app.use('/api/hospital', hospitalRoutes);

// Centralized error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 RoadSOS server running on http://localhost:${PORT}`);
  console.log(`📁 Local JSON database loaded successfully`);
  console.log(`🔐 Auth endpoints: POST /api/auth/register, POST /api/auth/login`);
  console.log(`🏥 Hospital endpoints: GET /api/hospital/alerts, PATCH /api/hospital/alerts/:id/dispatch`);
});

module.exports = app;
