const prisma = require('../prismaClient');
const { checkGeofence } = require('../utils/geofence');

const INCLUDE_FULL = {
  warehouse: true,
  inspector: { select: { id: true, name: true, username: true } },
  scheduledBy: { select: { id: true, name: true } },
  findings: { orderBy: { createdAt: 'desc' } },
  photos: { orderBy: { createdAt: 'asc' } },
  checklistResults: {
    include: { template: true },
    orderBy: { template: { order: 'asc' } },
  },
};

exports.getAll = async (req, res) => {
  const { status, type, warehouseId, inspectorId, from, to, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (warehouseId) where.warehouseId = warehouseId;

  // Non-admin can see their own + unassigned inspections (task pool)
  if (req.user.role !== 'admin') {
    where.OR = [
      { inspectorId: req.user.userId },
      { inspectorId: null },
    ];
  } else if (inspectorId) {
    where.inspectorId = inspectorId;
  }

  if (from || to) {
    where.scheduledDate = {};
    if (from) where.scheduledDate.gte = new Date(from);
    if (to) where.scheduledDate.lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { scheduledDate: 'desc' },
      include: {
        warehouse: { select: { id: true, name: true, address: true } },
        inspector: { select: { id: true, name: true } },
        _count: { select: { findings: true, photos: true } },
      },
    }),
    prisma.inspection.count({ where }),
  ]);

  res.json({ success: true, data: items, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
};

exports.getById = async (req, res) => {
  const insp = await prisma.inspection.findUnique({
    where: { id: req.params.id },
    include: INCLUDE_FULL,
  });
  if (!insp) return res.status(404).json({ success: false, message: 'Inspeksi tidak ditemukan' });

  // Non-admin can only see their own or unassigned
  if (req.user.role !== 'admin' && insp.inspectorId && insp.inspectorId !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'Akses ditolak' });
  }

  res.json({ success: true, data: { ...insp, warehouse: { ...insp.warehouse, wasteTypes: JSON.parse(insp.warehouse.wasteTypes || '[]') } } });
};

exports.create = async (req, res) => {
  const { warehouseId, inspectorId, scheduledDate, notes, type } = req.body;
  if (!warehouseId || !scheduledDate) {
    return res.status(400).json({ success: false, message: 'warehouseId, scheduledDate diperlukan' });
  }

  const insp = await prisma.inspection.create({
    data: {
      warehouseId,
      inspectorId: inspectorId || null,
      scheduledById: req.user.userId,
      scheduledDate: new Date(scheduledDate),
      type: type || 'tps_lb3',
      notes: notes || null,
    },
    include: {
      warehouse: { select: { id: true, name: true } },
      inspector: { select: { id: true, name: true } },
    },
  });
  res.status(201).json({ success: true, data: insp });
};

exports.update = async (req, res) => {
  const { notes, status } = req.body;
  const updates = {};
  if (notes !== undefined) updates.notes = notes;
  if (status !== undefined) updates.status = status;

  const insp = await prisma.inspection.update({ where: { id: req.params.id }, data: updates });
  res.json({ success: true, data: insp });
};

exports.remove = async (req, res) => {
  await prisma.inspection.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Inspeksi berhasil dihapus' });
};

exports.start = async (req, res) => {
  const { gpsLat, gpsLng, gpsAccuracy } = req.body;
  const insp = await prisma.inspection.findUnique({
    where: { id: req.params.id },
    include: { warehouse: true, inspector: { select: { id: true, name: true } } },
  });
  if (!insp) return res.status(404).json({ success: false, message: 'Inspeksi tidak ditemukan' });
  if (insp.status !== 'dijadwalkan') {
    return res.status(400).json({ success: false, message: `Inspeksi sudah dalam status: ${insp.status}` });
  }

  // Task pool: check if already claimed by someone else
  if (insp.inspectorId && insp.inspectorId !== req.user.userId && req.user.role !== 'admin') {
    return res.status(409).json({
      success: false,
      message: `Inspeksi sudah diambil oleh ${insp.inspector?.name ?? 'inspektur lain'}`,
    });
  }

  let geofenceResult = null;
  if (gpsLat && gpsLng) {
    geofenceResult = checkGeofence(
      parseFloat(gpsLat), parseFloat(gpsLng),
      insp.warehouse.latitude, insp.warehouse.longitude,
      insp.warehouse.geoFenceRadius
    );

    const enforceGeofence = process.env.ENFORCE_GEOFENCE === 'true';
    if (enforceGeofence && !geofenceResult.withinFence) {
      return res.status(422).json({
        success: false,
        message: `Anda berada ${geofenceResult.distance}m dari gudang. Harus berada dalam radius ${geofenceResult.radius}m.`,
        data: { geofenceResult },
      });
    }
  }

  const updated = await prisma.inspection.update({
    where: { id: req.params.id },
    data: {
      status: 'berlangsung',
      startedAt: new Date(),
      // Auto-claim: assign inspector if unassigned (task pool)
      ...(insp.inspectorId ? {} : { inspectorId: req.user.userId }),
      gpsLat: gpsLat ? parseFloat(gpsLat) : null,
      gpsLng: gpsLng ? parseFloat(gpsLng) : null,
      gpsAccuracy: gpsAccuracy ? parseFloat(gpsAccuracy) : null,
    },
  });

  res.json({ success: true, data: updated, geofenceResult });
};

exports.complete = async (req, res) => {
  const { notes, overallStatus } = req.body;
  const insp = await prisma.inspection.findUnique({
    where: { id: req.params.id },
    include: { checklistResults: { include: { template: true } } },
  });
  if (!insp) return res.status(404).json({ success: false, message: 'Inspeksi tidak ditemukan' });

  // Calculate compliance score based on answerOptions weights
  const results = insp.checklistResults;
  let totalMaxScore = 0;
  let totalScore = 0;
  for (const r of results) {
    const opts = JSON.parse(r.template.answerOptions || '[]');
    if (opts.length === 0) continue;
    const maxScore = Math.max(...opts.map(o => o.score));
    const selected = opts.find(o => o.label === r.status);
    totalMaxScore += maxScore;
    totalScore += selected ? selected.score : 0;
  }
  const score = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  const updated = await prisma.inspection.update({
    where: { id: req.params.id },
    data: {
      status: 'selesai',
      completedAt: new Date(),
      complianceScore: score,
      overallStatus: overallStatus || null,
      notes: notes || insp.notes,
    },
  });

  res.json({ success: true, data: updated, scoreBreakdown: { totalScore, totalMaxScore, score } });
};

exports.uploadPhoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  const photo = await prisma.photo.create({
    data: {
      inspectionId: req.params.id,
      filename: req.file.filename,
      url,
      caption: req.body.caption || null,
      label: req.body.label || '',
    },
  });
  res.status(201).json({ success: true, data: photo });
};

exports.deletePhoto = async (req, res) => {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.photoId } });
  if (!photo) return res.status(404).json({ success: false, message: 'Foto tidak ditemukan' });

  const fs = require('fs');
  const path = require('path');
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const filePath = path.join(uploadDir, photo.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await prisma.photo.delete({ where: { id: req.params.photoId } });
  res.json({ success: true, message: 'Foto berhasil dihapus' });
};
