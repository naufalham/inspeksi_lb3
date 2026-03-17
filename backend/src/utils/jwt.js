const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

function getRefreshExpiresAt() {
  const ms = 30 * 24 * 60 * 60 * 1000; // 30 days
  return new Date(Date.now() + ms);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, getRefreshExpiresAt };
