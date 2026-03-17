# InspeksiPro Backend

API backend untuk sistem inspeksi limbah B3.

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Setup database:
   ```bash
   cp .env.example .env
   npx prisma db push
   node prisma/seed.js
   ```

3. Jalankan server:
   ```bash
   npm run dev
   ```

Server berjalan di http://localhost:5000

## Login
- Admin: `admin` / `admin123`
- Inspektur: `inspektur` / `inspektur123`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | - | Login |
| POST | /api/auth/refresh | - | Refresh token |
| GET | /api/auth/me | ✓ | Profil user |
| GET | /api/warehouses | ✓ | List gudang |
| POST | /api/warehouses | Admin | Tambah gudang |
| GET | /api/inspections | ✓ | List inspeksi |
| POST | /api/inspections | Admin | Jadwalkan inspeksi |
| GET | /api/inspections/:id | ✓ | Detail inspeksi |
| POST | /api/inspections/:id/start | ✓ | Mulai inspeksi (GPS) |
| PUT | /api/inspections/:id/checklist | ✓ | Simpan checklist |
| POST | /api/inspections/:id/findings | ✓ | Tambah temuan |
| POST | /api/inspections/:id/photos | ✓ | Upload foto |
| POST | /api/inspections/:id/complete | ✓ | Selesaikan inspeksi |
| GET | /api/reports/dashboard | ✓ | Statistik dashboard |
| GET | /api/checklist-templates | ✓ | Template checklist |
