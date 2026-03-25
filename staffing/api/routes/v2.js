// v2 — MongoDB aggregation pipeline: $unwind + $arrayToObject → flat rows → JSON
const express    = require('express');
const router     = express.Router();
const { getDB }  = require('../config/db');
const onboardPipeline  = require('../pipelines/onboards');
const offboardPipeline = require('../pipelines/offboards');

const PIPELINES = {
  onboards:  onboardPipeline,
  offboards: offboardPipeline,
};

router.get('/:collection', async (req, res, next) => {
  const { collection } = req.params;
  if (!PIPELINES[collection]) {
    return res.status(404).json({ error: `Unknown collection: ${collection}` });
  }

  try {
    const memBefore = process.memoryUsage().heapUsed;

    const t0   = process.hrtime.bigint();
    const rows = await getDB()
      .collection(collection)
      .aggregate(PIPELINES[collection], { allowDiskUse: true })
      .toArray();
    const mongoQueryTimeMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);

    const memAfter      = process.memoryUsage().heapUsed;
    const memoryDeltaMb = parseFloat(((memAfter - memBefore) / 1024 / 1024).toFixed(1));

    res.json({
      meta: {
        approach:        'mongodb-pipeline',
        collection,
        docsFromMongo:   rows.length,
        recordsReturned: rows.length,
        mongoQueryTimeMs,
        flattenTimeMs:   0,
        totalTimeMs:     mongoQueryTimeMs,
        memoryDeltaMb,
        bottleneck:      'MongoDB fetch/transfer',
      },
      data: rows,
    });
  } catch (err) { next(err); }
});

module.exports = router;
