#!/bin/sh
set -e

echo ">>> Menjalankan migrasi database..."
npx prisma db push

# Seed hanya jika database masih kosong (tabel User belum ada data)
DB_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
")

if [ "$DB_COUNT" = "0" ]; then
  echo ">>> Database kosong, menjalankan seed..."
  node prisma/seed.js
else
  echo ">>> Database sudah ada data ($DB_COUNT users), skip seed."
fi

echo ">>> Menjalankan server..."
exec node src/app.js
