const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/board');
const homeownerRoutes = require('./routes/homeowner');
const managementRoutes = require('./routes/management');
const webhooksRoutes = require('./routes/webhooks');

const app = express();

app.use(cors());

// Webhooks need raw body
app.use('/api/webhooks', webhooksRoutes);

app.use(express.json({ limit: '12mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/homeowner', homeownerRoutes);
app.use('/api/management', managementRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'HOA Portal API is running' });
});

module.exports = app;
