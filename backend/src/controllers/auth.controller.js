const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshExpiresAt } = require('../utils/jwt');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password diperlukan' });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Username atau password salah' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Username atau password salah' });
  }

  const payload = { userId: user.id, username: user.username, name: user.name, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshTokenStr = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenStr,
      userId: user.id,
      expiresAt: getRefreshExpiresAt(),
    },
  });

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken: refreshTokenStr,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email },
    },
  });
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token diperlukan' });
  }

  try {
    verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ success: false, message: 'Refresh token tidak valid' });
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ success: false, message: 'Refresh token expired atau tidak ditemukan' });
  }

  const user = stored.user;
  const payload = { userId: user.id, username: user.username, name: user.name, role: user.role };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: user.id, expiresAt: getRefreshExpiresAt() },
  });

  res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.json({ success: true, message: 'Logout berhasil' });
};

exports.me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, username: true, name: true, role: true, email: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
  res.json({ success: true, data: user });
};
