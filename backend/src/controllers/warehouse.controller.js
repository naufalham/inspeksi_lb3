const prisma = require('../prismaClient');

exports.getAll = async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { address: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.warehouse.count({ where }),
  ]);

  const parsed = items.map(w => ({ ...w, wasteTypes: JSON.parse(w.wasteTypes || '[]') }));
  res.json({ success: true, data: parsed, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
};

exports.getById = async (req, res) => {
  const wh = await prisma.warehouse.findUnique({
    where: { id: req.params.id },
    include: {
      inspections: {
        orderBy: { scheduledDate: 'desc' },
        take: 5,
        include: { inspector: { select: { name: true } } },
      },
    },
  });
  if (!wh) return res.status(404).json({ success: false, message: 'Gudang tidak ditemukan' });
  res.json({ success: true, data: { ...wh, wasteTypes: JSON.parse(wh.wasteTypes || '[]') } });
};

exports.create = async (req, res) => {
  const { name, address, latitude, longitude, geoFenceRadius, capacity, capacityUnit, status, pic, picPhone, wasteTypes } = req.body;
  const wh = await prisma.warehouse.create({
    data: {
      name,
      address,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      geoFenceRadius: parseFloat(geoFenceRadius) || 100,
      capacity: capacity ? parseFloat(capacity) : null,
      capacityUnit: capacityUnit || null,
      status: status || 'aktif',
      pic: pic || null,
      picPhone: picPhone || null,
      wasteTypes: JSON.stringify(wasteTypes || []),
    },
  });
  res.status(201).json({ success: true, data: { ...wh, wasteTypes: JSON.parse(wh.wasteTypes) } });
};

exports.update = async (req, res) => {
  const { name, address, latitude, longitude, geoFenceRadius, capacity, capacityUnit, status, pic, picPhone, wasteTypes } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (address !== undefined) updates.address = address;
  if (latitude !== undefined) updates.latitude = parseFloat(latitude);
  if (longitude !== undefined) updates.longitude = parseFloat(longitude);
  if (geoFenceRadius !== undefined) updates.geoFenceRadius = parseFloat(geoFenceRadius);
  if (capacity !== undefined) updates.capacity = capacity ? parseFloat(capacity) : null;
  if (capacityUnit !== undefined) updates.capacityUnit = capacityUnit;
  if (status !== undefined) updates.status = status;
  if (pic !== undefined) updates.pic = pic;
  if (picPhone !== undefined) updates.picPhone = picPhone;
  if (wasteTypes !== undefined) updates.wasteTypes = JSON.stringify(wasteTypes);

  const wh = await prisma.warehouse.update({ where: { id: req.params.id }, data: updates });
  res.json({ success: true, data: { ...wh, wasteTypes: JSON.parse(wh.wasteTypes) } });
};

exports.remove = async (req, res) => {
  await prisma.warehouse.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Gudang berhasil dihapus' });
};
