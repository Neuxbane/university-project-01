const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PORT, HOST } = require('./config');

const authRoutes = require('./routes/auth');
const motorcycleRoutes = require('./routes/motorcycles');
const requirementRoutes = require('./routes/requirements');
const positionRoutes = require('./routes/positions');
const boltSpecRoutes = require('./routes/boltSpecs');
const packageRoutes = require('./routes/packages');
const pickListRoutes = require('./routes/pickLists');
const importExportRoutes = require('./routes/importExport');
const auditLogRoutes = require('./routes/auditLogs');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const positionAnnotationRoutes = require('./routes/positionAnnotations');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Hex Titanium Bolt Specification System',
    port: Number(PORT) || 3000,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/system-info', (req, res) => {
  res.json({
    status: 'ok',
    port: Number(PORT) || 3000,
    host: HOST,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/motorcycles', motorcycleRoutes);
app.use('/api', requirementRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/bolt-specs', boltSpecRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/pick-lists', pickListRoutes);
app.use('/api/import', importExportRoutes);
app.use('/api/admin', importExportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/position-annotations', positionAnnotationRoutes);

// Serve uploaded files statically
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Global 404 for unmatched API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

// Serve Vue Frontend static build if present
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

module.exports = app;

