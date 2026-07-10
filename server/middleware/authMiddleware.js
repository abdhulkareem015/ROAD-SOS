const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'roadsos-secret-key-2024';

/**
 * Verifies JWT token from Authorization header.
 * Attaches decoded user payload to req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided. Please login.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please login again.' });
  }
};

/**
 * Restricts route to hospital role only.
 * Must be used after authenticate middleware.
 */
const requireHospital = (req, res, next) => {
  if (!req.user || req.user.role !== 'hospital') {
    return res.status(403).json({ success: false, message: 'Access denied. Hospital accounts only.' });
  }
  next();
};

/**
 * Restricts route to user role only.
 * Must be used after authenticate middleware.
 */
const requireUser = (req, res, next) => {
  if (!req.user || req.user.role !== 'user') {
    return res.status(403).json({ success: false, message: 'Access denied. User accounts only.' });
  }
  next();
};

module.exports = { authenticate, requireHospital, requireUser };
