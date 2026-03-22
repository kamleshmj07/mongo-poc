const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const auth = require('./middleware/auth');
const queryRouter        = require('./routes/query');
const v1Router           = require('./routes/v1');
const v2Router           = require('./routes/v2');
const compareRouter      = require('./routes/compare');
const splitEmployees     = require('./routes/split/employees');
const splitOnboarding    = require('./routes/split/onboarding');
const splitOffboarding   = require('./routes/split/offboarding');
const splitServices      = require('./routes/split/services');
const splitEvents        = require('./routes/split/events');

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health check — no auth required
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// All routes require bearer token
// /api          — flexible query builder (field selection + filters, used by UI)
// /api/v1       — work API style: fetch all docs, flatten in Node.js
// /api/v2       — optimized: MongoDB $unwind + $project pipeline
// /api/compare      — side-by-side performance comparison (no data returned)
// /api/split/*      — one endpoint per nesting level, Power BI joins on shared keys
app.use('/api',                      auth, queryRouter);
app.use('/api/v1',                   auth, v1Router);
app.use('/api/v2',                   auth, v2Router);
app.use('/api/compare',              auth, compareRouter);
app.use('/api/split/employees',      auth, splitEmployees);
app.use('/api/split/onboarding',     auth, splitOnboarding);
app.use('/api/split/offboarding',    auth, splitOffboarding);
app.use('/api/split/services',       auth, splitServices);
app.use('/api/split/events',         auth, splitEvents);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
