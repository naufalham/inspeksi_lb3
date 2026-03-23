const prisma = require('../prismaClient');

exports.getTemplates = async (req, res) => {
  const { type } = req.query;
  const templates = await prisma.checklistTemplate.findMany({
    where: { isActive: true, ...(type ? { inspectionType: type } : {}) },
    orderBy: { order: 'asc' },
  });

  // Group by category
  const grouped = {};
  for (const t of templates) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  res.json({ success: true, data: { templates, grouped } });
};

exports.getResults = async (req, res) => {
  const results = await prisma.checklistResult.findMany({
    where: { inspectionId: req.params.id },
    include: { template: true },
    orderBy: { template: { order: 'asc' } },
  });
  res.json({ success: true, data: results });
};

exports.saveResults = async (req, res) => {
  const { results } = req.body;
  if (!Array.isArray(results)) {
    return res.status(400).json({ success: false, message: 'results harus berupa array' });
  }

  const insp = await prisma.inspection.findUnique({ where: { id: req.params.id } });
  if (!insp) return res.status(404).json({ success: false, message: 'Inspeksi tidak ditemukan' });

  // Upsert all results
  const ops = results.map(r =>
    prisma.checklistResult.upsert({
      where: { inspectionId_templateId: { inspectionId: req.params.id, templateId: r.templateId } },
      update: { status: r.status, comment: r.comment || null },
      create: { inspectionId: req.params.id, templateId: r.templateId, status: r.status, comment: r.comment || null },
    })
  );

  const saved = await prisma.$transaction(ops);
  res.json({ success: true, data: saved, updatedCount: saved.length });
};
