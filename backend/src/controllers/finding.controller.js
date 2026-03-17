const prisma = require('../prismaClient');

exports.getByInspection = async (req, res) => {
  const findings = await prisma.finding.findMany({
    where: { inspectionId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: findings });
};

exports.create = async (req, res) => {
  const { severity, description, recommendation } = req.body;
  if (!severity || !description) {
    return res.status(400).json({ success: false, message: 'severity dan description diperlukan' });
  }
  const finding = await prisma.finding.create({
    data: {
      inspectionId: req.params.id,
      severity,
      description,
      recommendation: recommendation || null,
    },
  });
  res.status(201).json({ success: true, data: finding });
};

exports.update = async (req, res) => {
  const { severity, description, recommendation, followUpStatus } = req.body;
  const updates = {};
  if (severity !== undefined) updates.severity = severity;
  if (description !== undefined) updates.description = description;
  if (recommendation !== undefined) updates.recommendation = recommendation;
  if (followUpStatus !== undefined) updates.followUpStatus = followUpStatus;

  const finding = await prisma.finding.update({ where: { id: req.params.findingId }, data: updates });
  res.json({ success: true, data: finding });
};

exports.remove = async (req, res) => {
  await prisma.finding.delete({ where: { id: req.params.findingId } });
  res.json({ success: true, message: 'Temuan berhasil dihapus' });
};
