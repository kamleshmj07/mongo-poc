const express = require('express');
const app     = express();
const auth    = require('./middleware/auth');

app.use(express.json());

// Health check — no auth
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// API routes
app.use('/api/v1',      auth, require('./routes/v1'));
app.use('/api/v2',      auth, require('./routes/v2'));
app.use('/api/v3',      auth, require('./routes/v3'));
app.use('/api/compare', auth, require('./routes/compare'));

// Split API
app.use('/api/split/onboards',       auth, require('./routes/split/onboards'));
app.use('/api/split/offboards',      auth, require('./routes/split/offboards'));
app.use('/api/split/companyprofiles', auth, require('./routes/split/companyprofiles'));

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

module.exports = app;
