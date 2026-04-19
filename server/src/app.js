const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { isProduction } = require('./config/env');

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/board');
const homeownerRoutes = require('./routes/homeowner');
const managementRoutes = require('./routes/management');
const webhooksRoutes = require('./routes/webhooks');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_APP_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || !isProduction()) {
      return callback(null, true);
    }

    if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  }
}));

// Webhooks need raw body
app.use('/api/webhooks', webhooksRoutes);

app.use(express.json({ limit: '12mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/homeowner', homeownerRoutes);
app.use('/api/management', managementRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'HOA Portal API is running' });
});

module.exports = app;
