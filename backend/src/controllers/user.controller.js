const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');

exports.getAll = async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: users });
};

exports.create = async (req, res) => {
  const { username, password, name, email, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: 'username, password, name diperlukan' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash: hash, name, email: email || null, role: role || 'inspektur' },
    select: { id: true, username: true, name: true, role: true, email: true, createdAt: true },
  });
  res.status(201).json({ success: true, data: user });
};

exports.update = async (req, res) => {
  const { name, email, role, isActive, password } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updates,
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });
  res.json({ success: true, data: user });
};
