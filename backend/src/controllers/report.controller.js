const prisma = require('../prismaClient');

exports.getDashboard = async (req, res) => {
  const { from, to } = req.query;

  const dateFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const inspWhere = Object.keys(dateFilter).length > 0 ? { scheduledDate: dateFilter } : {};
  if (req.user.role !== 'admin') inspWhere.inspectorId = req.user.userId;

  const [
    totalInspections,
    selesai,
    berlangsung,
    dijadwalkan,
    dibatalkan,
    completedInspections,
    criticalFindings,
    pendingFindings,
    totalWarehouses,
  ] = await Promise.all([
    prisma.inspection.count({ where: inspWhere }),
    prisma.inspection.count({ where: { ...inspWhere, status: 'selesai' } }),
    prisma.inspection.count({ where: { ...inspWhere, status: 'berlangsung' } }),
    prisma.inspection.count({ where: { ...inspWhere, status: 'dijadwalkan' } }),
    prisma.inspection.count({ where: { ...inspWhere, status: 'dibatalkan' } }),
    prisma.inspection.findMany({
      where: { ...inspWhere, status: 'selesai', complianceScore: { not: null } },
      select: { complianceScore: true, scheduledDate: true, warehouseId: true, warehouse: { select: { name: true } } },
    }),
    prisma.finding.count({ where: { severity: 'kritis', inspection: inspWhere } }),
    prisma.finding.count({ where: { followUpStatus: 'pending', inspection: inspWhere } }),
    prisma.warehouse.count(),
  ]);

  const avgScore = completedInspections.length > 0
    ? Math.round(completedInspections.reduce((sum, i) => sum + i.complianceScore, 0) / completedInspections.length)
    : 0;

  // Monthly trend (last 6 months)
  const monthlyMap = {};
  completedInspections.forEach(i => {
    const key = new Date(i.scheduledDate).toISOString().slice(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { count: 0, scoreSum: 0 };
    monthlyMap[key].count++;
    monthlyMap[key].scoreSum += i.complianceScore;
  });
  const inspectionsByMonth = Object.entries(monthlyMap)
    .map(([month, v]) => ({ month, count: v.count, avgScore: Math.round(v.scoreSum / v.count) }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  // By warehouse
  const whMap = {};
  completedInspections.forEach(i => {
    if (!whMap[i.warehouseId]) whMap[i.warehouseId] = { name: i.warehouse.name, count: 0, scoreSum: 0 };
    whMap[i.warehouseId].count++;
    whMap[i.warehouseId].scoreSum += i.complianceScore;
  });
  const complianceByWarehouse = Object.entries(whMap)
    .map(([id, v]) => ({ warehouseId: id, name: v.name, count: v.count, avgScore: Math.round(v.scoreSum / v.count) }));

  // Findings by severity
  const [ringan, sedang, kritis] = await Promise.all([
    prisma.finding.count({ where: { severity: 'ringan', inspection: inspWhere } }),
    prisma.finding.count({ where: { severity: 'sedang', inspection: inspWhere } }),
    prisma.finding.count({ where: { severity: 'kritis', inspection: inspWhere } }),
  ]);

  res.json({
    success: true,
    data: {
      totalInspections,
      selesai,
      berlangsung,
      dijadwalkan,
      dibatalkan,
      averageComplianceScore: avgScore,
      criticalFindings,
      pendingFindings,
      totalWarehouses,
      inspectionsByMonth,
      complianceByWarehouse,
      findingsBySeverity: { ringan, sedang, kritis },
    },
  });
};

exports.getList = async (req, res) => {
  const { from, to, warehouseId, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { status: 'selesai' };
  if (req.user.role !== 'admin') where.inspectorId = req.user.userId;
  if (warehouseId) where.warehouseId = warehouseId;
  if (from || to) {
    where.completedAt = {};
    if (from) where.completedAt.gte = new Date(from);
    if (to) where.completedAt.lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { completedAt: 'desc' },
      include: {
        warehouse: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        _count: { select: { findings: true, photos: true } },
      },
    }),
    prisma.inspection.count({ where }),
  ]);

  res.json({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
};
