require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origins.includes('*') || origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/warehouses', require('./routes/warehouse.routes'));
app.use('/api/inspections', require('./routes/inspection.routes'));
app.use('/api/checklist-templates', require('./routes/checklist.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/users', require('./routes/user.routes'));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} tidak ditemukan` }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 InspeksiPro Backend berjalan di http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 API: http://localhost:${PORT}/api`);
  console.log(`\n✅ Endpoints:`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   GET    /api/warehouses`);
  console.log(`   GET    /api/inspections`);
  console.log(`   GET    /api/reports/dashboard`);
});

module.exports = app;
