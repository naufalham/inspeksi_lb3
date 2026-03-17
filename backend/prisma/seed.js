const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up
  await prisma.checklistResult.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const adminHash = await bcrypt.hash('admin123', 10);
  const inspHash = await bcrypt.hash('inspektur123', 10);
  const andiHash = await bcrypt.hash('andi123', 10);

  const admin = await prisma.user.create({
    data: {
      id: 'user-admin-001',
      username: 'admin',
      passwordHash: adminHash,
      name: 'Budi Santoso',
      role: 'admin',
      email: 'budi@company.com',
    }
  });

  const siti = await prisma.user.create({
    data: {
      id: 'user-inspektur-001',
      username: 'inspektur',
      passwordHash: inspHash,
      name: 'Siti Rahayu',
      role: 'inspektur',
      email: 'siti@company.com',
    }
  });

  const andi = await prisma.user.create({
    data: {
      id: 'user-inspektur-002',
      username: 'andi',
      passwordHash: andiHash,
      name: 'Andi Wijaya',
      role: 'inspektur',
      email: 'andi@company.com',
    }
  });

  // Warehouses
  const wh1 = await prisma.warehouse.create({
    data: {
      id: 'wh-001',
      name: 'Gudang B3 - Pabrik Utama',
      address: 'Jl. Industri No. 12, Kawasan KIIC, Karawang',
      latitude: -6.3580,
      longitude: 107.2920,
      geoFenceRadius: 100,
      capacity: 500,
      capacityUnit: 'ton',
      status: 'aktif',
      pic: 'Hendra Gunawan',
      picPhone: '08123456789',
      wasteTypes: JSON.stringify(['B104d', 'B110d', 'A108d']),
    }
  });

  const wh2 = await prisma.warehouse.create({
    data: {
      id: 'wh-002',
      name: 'Gudang B3 - Site Bekasi',
      address: 'Jl. Raya Narogong KM 15, Bekasi',
      latitude: -6.3200,
      longitude: 107.0000,
      geoFenceRadius: 80,
      capacity: 300,
      capacityUnit: 'ton',
      status: 'aktif',
      pic: 'Dewi Sartika',
      picPhone: '08198765432',
      wasteTypes: JSON.stringify(['B104d', 'B107d']),
    }
  });

  const wh3 = await prisma.warehouse.create({
    data: {
      id: 'wh-003',
      name: 'Gudang B3 - Depo Cikarang',
      address: 'Jl. Jababeka V Blok E No.3, Cikarang',
      latitude: -6.3100,
      longitude: 107.1500,
      geoFenceRadius: 75,
      capacity: 200,
      capacityUnit: 'ton',
      status: 'perbaikan',
      pic: 'Rudi Hartono',
      picPhone: '08112233445',
      wasteTypes: JSON.stringify(['A108d']),
    }
  });

  // Checklist Templates
  const templates = [
    { id: 'ct-01', category: 'Bangunan Gudang', description: 'Atap gudang dalam kondisi baik dan tidak bocor', order: 1 },
    { id: 'ct-02', category: 'Bangunan Gudang', description: 'Lantai gudang kedap air dan tidak retak', order: 2 },
    { id: 'ct-03', category: 'Bangunan Gudang', description: 'Ventilasi udara memadai', order: 3 },
    { id: 'ct-04', category: 'Bangunan Gudang', description: 'Pencahayaan cukup untuk area kerja', order: 4 },
    { id: 'ct-05', category: 'Labeling & Simbol', description: 'Simbol B3 terpasang di pintu masuk gudang', order: 5 },
    { id: 'ct-06', category: 'Labeling & Simbol', description: 'Setiap kontainer/drum memiliki label yang jelas', order: 6 },
    { id: 'ct-07', category: 'Labeling & Simbol', description: 'Informasi jenis limbah tertera pada label', order: 7 },
    { id: 'ct-08', category: 'MSDS', description: 'MSDS tersedia untuk setiap jenis limbah B3', order: 8 },
    { id: 'ct-09', category: 'MSDS', description: 'MSDS mudah diakses oleh petugas', order: 9 },
    { id: 'ct-10', category: 'Kemasan & Kontainer', description: 'Drum/kontainer tidak berkarat atau rusak', order: 10 },
    { id: 'ct-11', category: 'Kemasan & Kontainer', description: 'Penutup kontainer dalam kondisi rapat', order: 11 },
    { id: 'ct-12', category: 'Kemasan & Kontainer', description: 'Tidak ada tanda-tanda kebocoran', order: 12 },
    { id: 'ct-13', category: 'Kemasan & Kontainer', description: 'Penyusunan kontainer rapi dan aman', order: 13 },
    { id: 'ct-14', category: 'Drainase & Penampungan', description: 'Sistem drainase berfungsi baik', order: 14 },
    { id: 'ct-15', category: 'Drainase & Penampungan', description: 'Bak penampung tumpahan tersedia dan memadai', order: 15 },
    { id: 'ct-16', category: 'Drainase & Penampungan', description: 'Tidak ada genangan limbah di area gudang', order: 16 },
    { id: 'ct-17', category: 'APD Petugas', description: 'Petugas menggunakan APD lengkap', order: 17 },
    { id: 'ct-18', category: 'APD Petugas', description: 'APD dalam kondisi layak pakai', order: 18 },
    { id: 'ct-19', category: 'Peralatan Darurat', description: 'APAR tersedia dan masih berlaku', order: 19 },
    { id: 'ct-20', category: 'Peralatan Darurat', description: 'Spill kit tersedia dan lengkap', order: 20 },
    { id: 'ct-21', category: 'Peralatan Darurat', description: 'Kotak P3K tersedia dan terisi', order: 21 },
    { id: 'ct-22', category: 'Peralatan Darurat', description: 'Jalur evakuasi ditandai dengan jelas', order: 22 },
  ];

  for (const t of templates) {
    await prisma.checklistTemplate.create({ data: t });
  }

  // Sample inspections (past dates)
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const inspections = [
    { id: 'insp-001', warehouseId: 'wh-001', inspectorId: 'user-inspektur-001', scheduledDate: daysAgo(5), startedAt: daysAgo(5), completedAt: daysAgo(5), gpsLat: -6.3582, gpsLng: 107.2918, status: 'selesai', complianceScore: 86 },
    { id: 'insp-002', warehouseId: 'wh-002', inspectorId: 'user-inspektur-001', scheduledDate: daysAgo(10), startedAt: daysAgo(10), completedAt: daysAgo(10), gpsLat: -6.3202, gpsLng: 107.0002, status: 'selesai', complianceScore: 72 },
    { id: 'insp-003', warehouseId: 'wh-001', inspectorId: 'user-inspektur-002', scheduledDate: daysAgo(15), startedAt: daysAgo(15), completedAt: daysAgo(15), gpsLat: -6.3581, gpsLng: 107.2921, status: 'selesai', complianceScore: 91 },
    { id: 'insp-004', warehouseId: 'wh-003', inspectorId: 'user-inspektur-001', scheduledDate: daysAgo(20), startedAt: daysAgo(20), completedAt: daysAgo(20), gpsLat: -6.3101, gpsLng: 107.1501, status: 'selesai', complianceScore: 65 },
    { id: 'insp-005', warehouseId: 'wh-002', inspectorId: 'user-inspektur-002', scheduledDate: daysAgo(25), startedAt: daysAgo(25), completedAt: daysAgo(25), gpsLat: -6.3201, gpsLng: 106.9999, status: 'selesai', complianceScore: 78 },
    { id: 'insp-006', warehouseId: 'wh-001', inspectorId: 'user-inspektur-001', scheduledDate: new Date(), status: 'dijadwalkan' },
    { id: 'insp-007', warehouseId: 'wh-002', inspectorId: 'user-inspektur-002', scheduledDate: daysAgo(-3), status: 'dijadwalkan' },
  ];

  for (const insp of inspections) {
    await prisma.inspection.create({
      data: {
        ...insp,
        scheduledById: 'user-admin-001',
      }
    });
  }

  // Sample findings
  const findings = [
    { id: 'find-001', inspectionId: 'insp-001', severity: 'sedang', description: 'Label pada 3 drum oli bekas sudah pudar dan tidak terbaca', recommendation: 'Segera ganti label pada drum yang rusak sesuai standar GHS', followUpStatus: 'resolved' },
    { id: 'find-002', inspectionId: 'insp-002', severity: 'kritis', description: 'Bak penampung tumpahan penuh dan belum dikosongkan', recommendation: 'Segera kosongkan bak penampung dan lakukan pembersihan area', followUpStatus: 'pending' },
    { id: 'find-003', inspectionId: 'insp-002', severity: 'ringan', description: '2 APAR mendekati masa berlaku habis (1 bulan lagi)', recommendation: 'Jadwalkan penggantian/isi ulang APAR sebelum masa berlaku habis', followUpStatus: 'pending' },
    { id: 'find-004', inspectionId: 'insp-004', severity: 'kritis', description: 'Petugas gudang tidak menggunakan APD saat memindahkan drum', recommendation: 'Berikan teguran dan ingatkan SOP pemakaian APD wajib', followUpStatus: 'resolved' },
    { id: 'find-005', inspectionId: 'insp-004', severity: 'sedang', description: 'Jalur evakuasi terhalang oleh tumpukan drum', recommendation: 'Pindahkan drum yang menghalangi jalur evakuasi', followUpStatus: 'pending' },
  ];

  for (const f of findings) {
    await prisma.finding.create({ data: f });
  }

  // Sample checklist results for completed inspections
  const completedIds = ['insp-001', 'insp-002', 'insp-003', 'insp-004', 'insp-005'];
  for (const inspId of completedIds) {
    for (const tmpl of templates) {
      const rand = Math.random();
      await prisma.checklistResult.create({
        data: {
          inspectionId: inspId,
          templateId: tmpl.id,
          status: rand > 0.2 ? 'sesuai' : (rand > 0.05 ? 'tidak_sesuai' : 'na'),
          comment: rand <= 0.2 && rand > 0.05 ? 'Perlu perbaikan segera' : null,
        }
      });
    }
  }

  console.log('✅ Database seeded successfully!');
  console.log('👤 Login: admin/admin123 or inspektur/inspektur123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
