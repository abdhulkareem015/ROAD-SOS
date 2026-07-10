const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fileDatabase = require('../utils/fileDatabase');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'roadsos-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

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
 * POST /api/auth/register
 * Registers a new user or hospital account.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, address, latitude, longitude } = req.body;

    if (!name || !email || !password || !phone || !role) {
      const err = new Error('name, email, password, phone, and role are required');
      err.statusCode = 400;
      throw err;
    }

    if (!['user', 'hospital'].includes(role)) {
      const err = new Error('role must be either "user" or "hospital"');
      err.statusCode = 400;
      throw err;
    }

    if (role === 'hospital' && (latitude === undefined || longitude === undefined)) {
      const err = new Error('Hospital registration requires latitude and longitude');
      err.statusCode = 400;
      throw err;
    }

    const db = await fileDatabase.read();
    db.users = db.users || [];
    db.hospitals = db.hospitals || [];

    // Check for duplicate email across both collections
    const allAccounts = [...db.users, ...db.hospitals];
    const existing = allAccounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `${role}-${Date.now()}`;
    const createdAt = new Date().toISOString();

    if (role === 'hospital') {
      const hospital = {
        id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone.trim(),
        address: (address || '').trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        role: 'hospital',
        createdAt,
      };
      db.hospitals.push(hospital);
      await fileDatabase.write(db);
      logger.info(`[Auth] Hospital registered: ${hospital.name} (${hospital.email})`);

      const token = jwt.sign(
        { id: hospital.id, name: hospital.name, email: hospital.email, role: 'hospital' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(201).json({
        success: true,
        token,
        user: { id: hospital.id, name: hospital.name, email: hospital.email, role: 'hospital' },
      });
    } else {
      const user = {
        id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone.trim(),
        role: 'user',
        createdAt,
      };
      db.users.push(user);
      await fileDatabase.write(db);
      logger.info(`[Auth] User registered: ${user.name} (${user.email})`);

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: 'user' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(201).json({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: 'user' },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticates user or hospital, returns JWT.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.statusCode = 400;
      throw err;
    }

    const db = await fileDatabase.read();
    db.users = db.users || [];
    db.hospitals = db.hospitals || [];

    // Search both collections
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const hospital = db.hospitals.find((h) => h.email.toLowerCase() === email.toLowerCase());
    const account = user || hospital;

    if (!account) {
      const err = new Error('No account found with this email');
      err.statusCode = 401;
      throw err;
    }

    const passwordMatch = await bcrypt.compare(password, account.passwordHash);
    if (!passwordMatch) {
      const err = new Error('Incorrect password');
      err.statusCode = 401;
      throw err;
    }

    const token = jwt.sign(
      { id: account.id, name: account.name, email: account.email, role: account.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info(`[Auth] Login: ${account.email} (${account.role})`);

    return res.status(200).json({
      success: true,
      token,
      user: { id: account.id, name: account.name, email: account.email, role: account.role },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, calculateDistance };
