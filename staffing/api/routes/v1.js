// v1 — work-API style: find({}) → custom Node.js flatten → JSON
const express         = require('express');
const router          = express.Router();
const { getDB }       = require('../config/db');
const flattenOnboards = require('../flatten/onboards');
const flattenOffboards = require('../flatten/offboards');

const COLLECTIONS = {
  onboards:  { flatten: flattenOnboards },
  offboards: { flatten: flattenOffboards },
};

router.get('/:collection', async (req, res, next) => {
  const { collection } = req.params;
  if (!COLLECTIONS[collection]) {
    return res.status(404).json({ error: `Unknown collection: ${collection}` });
  }

  try {
    const memBefore = process.memoryUsage().heapUsed;

    // ── MongoDB fetch ──────────────────────────────────────────────────────────
    const t0   = process.hrtime.bigint();
    const docs = await getDB().collection(collection).find({}).toArray();
    const mongoQueryTimeMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);

    // ── JS flatten ─────────────────────────────────────────────────────────────
    const t1   = process.hrtime.bigint();
    const rows = COLLECTIONS[collection].flatten(docs);
    const flattenTimeMs = Math.round(Number(process.hrtime.bigint() - t1) / 1e6);

    const memAfter      = process.memoryUsage().heapUsed;
    const memoryDeltaMb = parseFloat(((memAfter - memBefore) / 1024 / 1024).toFixed(1));

    res.json({
      meta: {
        approach:        'js-flatten',
        collection,
        docsFromMongo:   docs.length,
        recordsReturned: rows.length,
        mongoQueryTimeMs,
        flattenTimeMs,
        totalTimeMs:     mongoQueryTimeMs + flattenTimeMs,
        memoryDeltaMb,
        bottleneck:      flattenTimeMs > mongoQueryTimeMs ? 'JS flattening' : 'MongoDB fetch',
      },
      data: rows,
    });
  } catch (err) { next(err); }
});

module.exports = router;
