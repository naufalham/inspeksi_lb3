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

  // Helper: create answerOptions JSON string
  const op = (pairs) => JSON.stringify(pairs.map(([l, s]) => ({ label: l, score: s })));

  // Common option sets
  const yaTidak      = op([['YA', 1], ['TIDAK', 0]]);
  const adaTidak     = op([['ADA', 1], ['TIDAK', 0]]);
  const adaKurang    = op([['ADA', 1], ['TIDAK', 0], ['KURANG', 0.5]]);
  const adaRusak     = op([['ADA', 1], ['TIDAK', 0], ['RUSAK', 0.5]]);
  const adaExpired   = op([['ADA', 1], ['TIDAK', 0], ['EXPIRED', 0]]);
  const yaaTidak     = op([['Ya', 1], ['Tidak', 0]]); // APAR uses 'Ya/Tidak'

  // TPS LB3 score sets
  const s530   = op([['5', 5], ['3', 3], ['0', 0]]);
  const s25    = op([['2.5', 2.5], ['1.5', 1.5], ['0', 0]]);
  const s036   = op([['0.36', 0.36], ['0.21', 0.21], ['0', 0]]);
  const s167   = op([['1.67', 1.67], ['1', 1], ['0', 0]]);
  const s21    = op([['2', 2], ['1.2', 1.2], ['0', 0]]);
  const s10    = op([['10', 10], ['6', 6], ['0', 0]]);

  // Checklist Templates
  const templates = [
    // ── TPS LB3 ──────────────────────────────────────────────────────────────
    // UMUM - Administrasi
    { id: 'ct-01', inspectionType: 'tps_lb3', category: 'UMUM - Administrasi', order: 1,  answerOptions: s530, description: 'Limbah B3 yang dihasilkan telah diidentifikasi nama, sumber, karakteristik, dan jumlahnya' },
    { id: 'ct-02', inspectionType: 'tps_lb3', category: 'UMUM - Administrasi', order: 2,  answerOptions: s530, description: 'Mempunyai rincian teknis Penyimpanan Limbah B3 yang dimuat dalam Persetujuan Lingkungan' },
    { id: 'ct-03', inspectionType: 'tps_lb3', category: 'UMUM - Administrasi', order: 3,  answerOptions: s530, requiresPhoto: true,  photoLabel: 'Foto SOP Penyimpanan LB3', description: 'Tersedia SOP Penyimpanan LB3 dalam bentuk hardfile' },
    { id: 'ct-04', inspectionType: 'tps_lb3', category: 'UMUM - Administrasi', order: 4,  answerOptions: s530, description: 'Tersedia SOP Penanganan Keadaan Darurat LB3 dalam bentuk hardfile' },
    { id: 'ct-05', inspectionType: 'tps_lb3', category: 'UMUM - Administrasi', order: 5,  answerOptions: s530, requiresPhoto: true,  photoLabel: 'Foto Penamaan & Koordinat TPS LB3', description: 'Terdapat penamaan bangunan TPS LB3 dengan Titik Koordinat TPS LB3 yang sesuai' },
    // TEMPAT - Lokasi
    { id: 'ct-06', inspectionType: 'tps_lb3', category: 'TEMPAT - Lokasi', order: 6,  answerOptions: s25, description: 'Lokasi penyimpanan dalam penguasaan perusahaan' },
    { id: 'ct-07', inspectionType: 'tps_lb3', category: 'TEMPAT - Lokasi', order: 7,  answerOptions: s25, description: 'Lokasi penyimpanan bebas Banjir & Bencana Alam' },
    // TEMPAT - Fasilitas
    { id: 'ct-08', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 8,  answerOptions: s036, description: 'Terdapat fasilitas bongkar muat (Hand palet / Alat Angkut Drum)' },
    { id: 'ct-09', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 9,  answerOptions: s036, requiresPhoto: true,  photoLabel: 'Foto Spill Kit', description: 'Terdapat peralatan penanganan tumpahan (Memiliki Spill Kit)' },
    { id: 'ct-10', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 10, answerOptions: s036, requiresPhoto: true,  photoLabel: 'Foto Fasilitas Pertolongan Pertama', description: 'Terdapat fasilitas pertolongan pertama' },
    { id: 'ct-11', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 11, answerOptions: s036, description: 'Luas ruang penyimpanan sesuai — Tidak terdapat Limbah B3 di luar ruangan TPS LB3' },
    { id: 'ct-12', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 12, answerOptions: s036, description: 'Desain dan konstruksi mampu melindungi LB3 dari hujan — Tidak ada kebocoran pada TPS LB3' },
    { id: 'ct-13', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 13, answerOptions: s036, description: 'Atap dari bahan yang tidak mudah terbakar' },
    { id: 'ct-14', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 14, answerOptions: s036, description: 'Memiliki sistem ventilasi untuk sirkulasi udara' },
    { id: 'ct-15', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 15, answerOptions: s036, description: 'Sistem pencahayaan disesuaikan dengan rancang bangun TPS LB3' },
    { id: 'ct-16', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 16, answerOptions: s036, requiresPhoto: true,  photoLabel: 'Foto Kondisi Lantai TPS LB3', description: 'Lantai kedap air dan tidak bergelombang' },
    { id: 'ct-17', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 17, answerOptions: s036, description: 'Lantai bagian dalam melandai ke arah bak penampung tumpahan (kemiringan maks 1%)' },
    { id: 'ct-18', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 18, answerOptions: s036, description: 'Lantai bagian luar dibuat agar air hujan tidak masuk ke dalam bangunan TPS LB3' },
    { id: 'ct-19', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 19, answerOptions: s036, description: 'Tersedia saluran drainase ceceran / tumpahan LB3' },
    { id: 'ct-20', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 20, answerOptions: s036, description: 'Tersedia bak penampung tumpahan — Saluran drainase berfungsi dan tidak terhalang' },
    { id: 'ct-21', inspectionType: 'tps_lb3', category: 'TEMPAT - Fasilitas', order: 21, answerOptions: s036, description: 'Dilengkapi dengan simbol Limbah B3 sesuai ketentuan peraturan perundang-undangan' },
    // TEMPAT - Rancang Bangun LB3 Mudah Menyala
    { id: 'ct-22', inspectionType: 'tps_lb3', category: 'TEMPAT - Rancang Bangun (Mudah Menyala)', order: 22, answerOptions: s167, description: 'Memiliki tembok pemisah dengan bangunan lain yang berdampingan' },
    { id: 'ct-23', inspectionType: 'tps_lb3', category: 'TEMPAT - Rancang Bangun (Mudah Menyala)', order: 23, answerOptions: s167, description: 'Struktur pendukung atap tidak mudah menyala, konstruksi atap ringan dan tidak mudah hancur' },
    { id: 'ct-24', inspectionType: 'tps_lb3', category: 'TEMPAT - Rancang Bangun (Mudah Menyala)', order: 24, answerOptions: s167, description: 'Penerangan tidak menyebabkan ledakan / percikan listrik (explosion proof)' },
    // TEMPAT - Rancang Bangun LB3 Reaktif/Korosif/Beracun
    { id: 'ct-25', inspectionType: 'tps_lb3', category: 'TEMPAT - Rancang Bangun (Reaktif/Korosif/Beracun)', order: 25, answerOptions: s167, description: 'Konstruksi dinding dibuat mudah untuk dilepas' },
    { id: 'ct-26', inspectionType: 'tps_lb3', category: 'TEMPAT - Rancang Bangun (Reaktif/Korosif/Beracun)', order: 26, answerOptions: s167, requiresPhoto: true, photoLabel: 'Foto Konstruksi TPS LB3', description: 'Konstruksi atap, dinding, dan lantai tahan terhadap korosi dan api' },
    { id: 'ct-27', inspectionType: 'tps_lb3', category: 'TEMPAT - Rancang Bangun (Reaktif/Korosif/Beracun)', order: 27, answerOptions: s167, description: 'Penerangan tidak menyebabkan ledakan / percikan listrik' },
    // TEMPAT - Peralatan Keadaan Darurat
    { id: 'ct-28', inspectionType: 'tps_lb3', category: 'TEMPAT - Peralatan Keadaan Darurat', order: 28, answerOptions: s25, requiresPhoto: true, photoLabel: 'Foto Fire Alarm TPS LB3', description: 'Terdapat sistem pendeteksi api — Fire Alarm (Smoke Detector dan Heat Detector)' },
    { id: 'ct-29', inspectionType: 'tps_lb3', category: 'TEMPAT - Peralatan Keadaan Darurat', order: 29, answerOptions: s25, requiresPhoto: true, photoLabel: 'Foto Eye Wash & Shower Darurat', description: 'Tersedia alat penanggulangan keadaan darurat — Pencuci Mata (Eye Wash) dan Shower Darurat' },
    // CARA - Pengemasan
    { id: 'ct-30', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Pengemasan', order: 30, answerOptions: s21, description: 'Menggunakan kemasan dari bahan logam atau plastik sesuai karakteristik Limbah B3' },
    { id: 'ct-31', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Pengemasan', order: 31, answerOptions: s21, description: 'Mampu mengungkung Limbah B3 untuk tetap berada dalam kemasan' },
    { id: 'ct-32', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Pengemasan', order: 32, answerOptions: s21, description: 'Memiliki penutup kuat untuk mencegah tumpahan saat penyimpanan, pemindahan, dan pengangkutan' },
    { id: 'ct-33', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Pengemasan', order: 33, answerOptions: s21, description: 'Berada dalam kondisi tidak bocor, tidak berkarat, dan tidak rusak' },
    { id: 'ct-34', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Pengemasan', order: 34, answerOptions: s21, requiresPhoto: true, photoLabel: 'Foto Label & Simbol Kemasan LB3', description: 'Kemasan Limbah B3 wajib dilekatkan simbol dan label Limbah B3' },
    // CARA - Kemasan Drum
    { id: 'ct-35', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Kemasan Drum', order: 35, answerOptions: s25, description: 'Ditumpuk berdasarkan jenis kemasan' },
    { id: 'ct-36', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Kemasan Drum', order: 36, answerOptions: s25, description: 'Jarak antara tumpukan kemasan dengan atap paling rendah 1 meter' },
    { id: 'ct-37', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Kemasan Drum', order: 37, answerOptions: s25, description: 'Disimpan dengan sistem blok 2×3, lebar gang antar blok min. 60 cm' },
    { id: 'ct-38', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Kemasan Drum', order: 38, answerOptions: s25, description: 'Drum logam 200L, tumpukan maks. 3 lapis dengan alas palet untuk 4 drum' },
    // CARA - Kemasan/Wadah Lain
    { id: 'ct-39', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Kemasan/Wadah Lain', order: 39, answerOptions: s25, description: 'Dikemas sesuai dengan jenis, karakteristik, dan/atau kompatibilitasnya' },
    { id: 'ct-40', inspectionType: 'tps_lb3', category: 'CARA PENYIMPANAN - Kemasan/Wadah Lain', order: 40, answerOptions: s25, description: 'Mempertimbangkan terjadinya pengembangan volume Limbah B3' },
    // WAKTU - Masa Simpan
    { id: 'ct-41', inspectionType: 'tps_lb3', category: 'WAKTU & HOUSEKEEPING - Masa Simpan', order: 41, answerOptions: s10, description: 'Penyimpanan Limbah B3 paling lama 365 hari sejak Limbah B3 dihasilkan' },

    // ── KOTAK P3K ─────────────────────────────────────────────────────────────
    { id: 'p3k-01', inspectionType: 'p3k', category: 'Kondisi Kotak', order: 1,  answerOptions: yaTidak,  description: 'Kotak P3K tersedia di lokasi' },
    { id: 'p3k-02', inspectionType: 'p3k', category: 'Kondisi Kotak', order: 2,  answerOptions: yaTidak,  description: 'Kotak mudah diakses & tidak terkunci' },
    { id: 'p3k-03', inspectionType: 'p3k', category: 'Kondisi Kotak', order: 3,  answerOptions: yaTidak,  description: 'Kotak dalam kondisi bersih & tidak rusak' },
    { id: 'p3k-04', inspectionType: 'p3k', category: 'Kondisi Kotak', order: 4,  answerOptions: yaTidak,  description: 'Terdapat tanda/logo P3K' },
    { id: 'p3k-05', inspectionType: 'p3k', category: 'Isi Kotak',     order: 5,  answerOptions: adaTidak, description: 'Kasa steril terbungkus 1 box' },
    { id: 'p3k-06', inspectionType: 'p3k', category: 'Isi Kotak',     order: 6,  answerOptions: adaKurang, description: 'Perban 5 cm 10 buah' },
    { id: 'p3k-07', inspectionType: 'p3k', category: 'Isi Kotak',     order: 7,  answerOptions: adaKurang, description: 'Plester cepat 25 buah' },
    { id: 'p3k-08', inspectionType: 'p3k', category: 'Isi Kotak',     order: 8,  answerOptions: adaTidak, description: 'Kapas 1 bungkus' },
    { id: 'p3k-09', inspectionType: 'p3k', category: 'Isi Kotak',     order: 9,  answerOptions: adaRusak, description: 'Kain segitiga / mitela 1 pack' },
    { id: 'p3k-10', inspectionType: 'p3k', category: 'Isi Kotak',     order: 10, answerOptions: adaRusak, description: 'Gunting 1 buah' },
    { id: 'p3k-11', inspectionType: 'p3k', category: 'Isi Kotak',     order: 11, answerOptions: adaKurang, description: 'Peniti 10 buah' },
    { id: 'p3k-12', inspectionType: 'p3k', category: 'Isi Kotak',     order: 12, answerOptions: adaKurang, description: 'Sarung tangan sekali pakai 5 pasang' },
    { id: 'p3k-13', inspectionType: 'p3k', category: 'Isi Kotak',     order: 13, answerOptions: adaKurang, description: 'Masker 1 box' },
    { id: 'p3k-14', inspectionType: 'p3k', category: 'Isi Kotak',     order: 14, answerOptions: adaRusak, description: 'Pinset 1 buah' },
    { id: 'p3k-15', inspectionType: 'p3k', category: 'Isi Kotak',     order: 15, answerOptions: adaRusak, description: 'Gelas cuci mata 1 buah' },
    { id: 'p3k-16', inspectionType: 'p3k', category: 'Isi Kotak',     order: 16, answerOptions: adaKurang, description: 'Kantong plastik bersih 5 buah' },
    { id: 'p3k-17', inspectionType: 'p3k', category: 'Isi Kotak',     order: 17, answerOptions: adaExpired, description: 'Aquades 100 ml 1 botol' },
    { id: 'p3k-18', inspectionType: 'p3k', category: 'Isi Kotak',     order: 18, answerOptions: adaExpired, description: 'Povidon Iodine 60 ml' },
    { id: 'p3k-19', inspectionType: 'p3k', category: 'Isi Kotak',     order: 19, answerOptions: adaExpired, description: 'Alkohol 70%' },
    { id: 'p3k-20', inspectionType: 'p3k', category: 'Isi Kotak',     order: 20, answerOptions: adaRusak, description: 'Buku Panduan P3K' },
    { id: 'p3k-21', inspectionType: 'p3k', category: 'Isi Kotak',     order: 21, answerOptions: adaRusak, description: 'Buku Catatan' },

    // ── APAR ──────────────────────────────────────────────────────────────────
    { id: 'apar-01', inspectionType: 'apar', category: 'Visual', order: 1,  answerOptions: yaaTidak, description: 'APAR tersedia di lokasi sesuai layout' },
    { id: 'apar-02', inspectionType: 'apar', category: 'Visual', order: 2,  answerOptions: yaaTidak, description: 'APAR mudah terlihat & tidak terhalang' },
    { id: 'apar-03', inspectionType: 'apar', category: 'Visual', order: 3,  answerOptions: yaaTidak, description: 'Tekanan pada pressure gauge normal (zona hijau)' },
    { id: 'apar-04', inspectionType: 'apar', category: 'Visual', order: 4,  answerOptions: yaaTidak, description: 'Segel & pin pengaman dalam kondisi baik' },
    { id: 'apar-05', inspectionType: 'apar', category: 'Visual', order: 5,  answerOptions: yaaTidak, description: 'Tabung tidak berkarat / penyok / bocor' },
    { id: 'apar-06', inspectionType: 'apar', category: 'Visual', order: 6,  answerOptions: yaaTidak, description: 'Selang & nozzle dalam kondisi baik' },
    { id: 'apar-07', inspectionType: 'apar', category: 'Visual', order: 7,  answerOptions: yaaTidak, description: 'Label & petunjuk penggunaan terbaca jelas' },
    { id: 'apar-08', inspectionType: 'apar', category: 'Visual', order: 8,  answerOptions: yaaTidak, description: 'Tanggal kadaluarsa / refill masih berlaku' },
    { id: 'apar-09', inspectionType: 'apar', category: 'Visual', order: 9,  answerOptions: yaaTidak, description: 'APAR sesuai jenis risiko (CO₂ / Powder / Foam)' },
    { id: 'apar-10', inspectionType: 'apar', category: 'Visual', order: 10, answerOptions: yaaTidak, description: 'Terdapat tanda lokasi APAR (signage)' },

    // ── APD (Coming Soon) ─────────────────────────────────────────────────────
    { id: 'apd-01', inspectionType: 'apd', category: 'Info', order: 1, answerOptions: yaTidak, description: 'Form inspeksi APD sedang dalam pengembangan' },

    // ── Fire Alarm (Coming Soon) ──────────────────────────────────────────────
    { id: 'fa-01', inspectionType: 'fire_alarm', category: 'Info', order: 1, answerOptions: yaTidak, description: 'Form inspeksi Fire Alarm sedang dalam pengembangan' },

    // ── Hydrant (Coming Soon) ─────────────────────────────────────────────────
    { id: 'hyd-01', inspectionType: 'hydrant', category: 'Info', order: 1, answerOptions: yaTidak, description: 'Form inspeksi Hydrant sedang dalam pengembangan' },
  ];

  for (const t of templates) {
    await prisma.checklistTemplate.create({ data: t });
  }

  // Sample inspections (past dates)
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const inspections = [
    { id: 'insp-001', type: 'tps_lb3', warehouseId: 'wh-001', inspectorId: 'user-inspektur-001', scheduledDate: daysAgo(5), startedAt: daysAgo(5), completedAt: daysAgo(5), gpsLat: -6.3582, gpsLng: 107.2918, status: 'selesai', complianceScore: 86 },
    { id: 'insp-002', type: 'apar',    warehouseId: 'wh-002', inspectorId: 'user-inspektur-001', scheduledDate: daysAgo(10), startedAt: daysAgo(10), completedAt: daysAgo(10), gpsLat: -6.3202, gpsLng: 107.0002, status: 'selesai', complianceScore: 72 },
    { id: 'insp-003', type: 'tps_lb3', warehouseId: 'wh-001', inspectorId: 'user-inspektur-002', scheduledDate: daysAgo(15), startedAt: daysAgo(15), completedAt: daysAgo(15), gpsLat: -6.3581, gpsLng: 107.2921, status: 'selesai', complianceScore: 91 },
    { id: 'insp-004', type: 'apd',     warehouseId: 'wh-003', inspectorId: 'user-inspektur-001', scheduledDate: daysAgo(20), startedAt: daysAgo(20), completedAt: daysAgo(20), gpsLat: -6.3101, gpsLng: 107.1501, status: 'selesai', complianceScore: 65 },
    { id: 'insp-005', type: 'hydrant', warehouseId: 'wh-002', inspectorId: 'user-inspektur-002', scheduledDate: daysAgo(25), startedAt: daysAgo(25), completedAt: daysAgo(25), gpsLat: -6.3201, gpsLng: 106.9999, status: 'selesai', complianceScore: 78 },
    { id: 'insp-006', type: 'tps_lb3', warehouseId: 'wh-001', inspectorId: 'user-inspektur-001', scheduledDate: new Date(), status: 'dijadwalkan' },
    { id: 'insp-007', type: 'p3k',     warehouseId: 'wh-002', inspectorId: 'user-inspektur-002', scheduledDate: daysAgo(-3), status: 'dijadwalkan' },
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
  const completedInspections = [
    { id: 'insp-001', type: 'tps_lb3' },
    { id: 'insp-002', type: 'apar' },
    { id: 'insp-003', type: 'tps_lb3' },
    { id: 'insp-004', type: 'apd' },
    { id: 'insp-005', type: 'hydrant' },
  ];
  for (const insp of completedInspections) {
    const typeTemplates = templates.filter(t => t.inspectionType === insp.type);
    for (const tmpl of typeTemplates) {
      const opts = JSON.parse(tmpl.answerOptions || '[]');
      if (opts.length === 0) continue;
      const rand = Math.random();
      // 80% chance best answer, 20% chance worst answer
      const chosen = rand > 0.2 ? opts[0].label : opts[opts.length - 1].label;
      await prisma.checklistResult.create({
        data: {
          inspectionId: insp.id,
          templateId: tmpl.id,
          status: chosen,
          comment: rand <= 0.2 ? 'Perlu perhatian' : null,
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
