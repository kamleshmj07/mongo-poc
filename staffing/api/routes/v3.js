// v3 — prod-style: find({}) → json2csv (flattenObjects: true, no unwind) → CSV
// Arrays (services[], logs[], etc.) are serialised as strings — not row-expanded.
// Performance metrics returned in response headers.
const express   = require('express');
const router    = express.Router();
const { getDB } = require('../config/db');
const { Parser } = require('json2csv');

const VALID = new Set(['onboards', 'offboards', 'companyprofiles']);

router.get('/:collection', async (req, res, next) => {
  const { collection } = req.params;
  if (!VALID.has(collection)) {
    return res.status(404).json({ error: `Unknown collection: ${collection}` });
  }

  try {
    const memBefore = process.memoryUsage().heapUsed;

    // ── MongoDB fetch ──────────────────────────────────────────────────────────
    const t0   = process.hrtime.bigint();
    const docs = await getDB().collection(collection).find({}).toArray();
    const mongoQueryTimeMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);

    // ── json2csv parse ─────────────────────────────────────────────────────────
    const t1  = process.hrtime.bigint();
    const parser = new Parser({ flattenObjects: true, eol: '\n' });
    const csv    = parser.parse(docs);
    const parseTimeMs = Math.round(Number(process.hrtime.bigint() - t1) / 1e6);

    const memAfter      = process.memoryUsage().heapUsed;
    const memoryDeltaMb = parseFloat(((memAfter - memBefore) / 1024 / 1024).toFixed(1));
    const totalTimeMs   = mongoQueryTimeMs + parseTimeMs;

    // Metrics in headers so CSV body is clean
    res.set('Content-Type',          'text/csv');
    res.set('Content-Disposition',   `attachment; filename="${collection}.csv"`);
    res.set('X-Approach',            'json2csv');
    res.set('X-Collection',          collection);
    res.set('X-Docs-From-Mongo',     String(docs.length));
    res.set('X-Mongo-Query-Time-Ms', String(mongoQueryTimeMs));
    res.set('X-Parse-Time-Ms',       String(parseTimeMs));
    res.set('X-Total-Time-Ms',       String(totalTimeMs));
    res.set('X-Memory-Delta-Mb',     String(memoryDeltaMb));
    res.set('X-Note',                'Arrays serialised as strings — no row expansion');
    res.send(csv);

  } catch (err) { next(err); }
});

module.exports = router;
