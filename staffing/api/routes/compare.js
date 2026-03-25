// compare — runs v1, v2, and v3 on the same collection, returns metrics side by side
const express          = require('express');
const router           = express.Router();
const { getDB }        = require('../config/db');
const flattenOnboards  = require('../flatten/onboards');
const flattenOffboards = require('../flatten/offboards');
const onboardPipeline  = require('../pipelines/onboards');
const offboardPipeline = require('../pipelines/offboards');
const { Parser }       = require('json2csv');

const CONFIG = {
  onboards:  { flatten: flattenOnboards,  pipeline: onboardPipeline  },
  offboards: { flatten: flattenOffboards, pipeline: offboardPipeline },
};

async function runV1(db, collection, flatten) {
  const mem0 = process.memoryUsage().heapUsed;
  const t0   = process.hrtime.bigint();
  const docs = await db.collection(collection).find({}).toArray();
  const mongoQueryTimeMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);

  const t1   = process.hrtime.bigint();
  const rows = flatten(docs);
  const flattenTimeMs = Math.round(Number(process.hrtime.bigint() - t1) / 1e6);

  const memoryDeltaMb = parseFloat(((process.memoryUsage().heapUsed - mem0) / 1024 / 1024).toFixed(1));
  return {
    approach:        'js-flatten',
    docsFromMongo:   docs.length,
    recordsReturned: rows.length,
    mongoQueryTimeMs,
    flattenTimeMs,
    totalTimeMs:     mongoQueryTimeMs + flattenTimeMs,
    memoryDeltaMb,
    bottleneck:      flattenTimeMs > mongoQueryTimeMs ? 'JS flattening' : 'MongoDB fetch',
  };
}

async function runV2(db, collection, pipeline) {
  const mem0 = process.memoryUsage().heapUsed;
  const t0   = process.hrtime.bigint();
  const rows = await db.collection(collection).aggregate(pipeline, { allowDiskUse: true }).toArray();
  const mongoQueryTimeMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);

  const memoryDeltaMb = parseFloat(((process.memoryUsage().heapUsed - mem0) / 1024 / 1024).toFixed(1));
  return {
    approach:        'mongodb-pipeline',
    docsFromMongo:   rows.length,
    recordsReturned: rows.length,
    mongoQueryTimeMs,
    flattenTimeMs:   0,
    totalTimeMs:     mongoQueryTimeMs,
    memoryDeltaMb,
    bottleneck:      'MongoDB fetch/transfer',
  };
}

async function runV3(db, collection) {
  const mem0   = process.memoryUsage().heapUsed;
  const t0     = process.hrtime.bigint();
  const docs   = await db.collection(collection).find({}).toArray();
  const mongoQueryTimeMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);

  const t1     = process.hrtime.bigint();
  const parser = new Parser({ flattenObjects: true, eol: '\n' });
  const csv    = parser.parse(docs);
  const parseTimeMs = Math.round(Number(process.hrtime.bigint() - t1) / 1e6);

  const memoryDeltaMb = parseFloat(((process.memoryUsage().heapUsed - mem0) / 1024 / 1024).toFixed(1));
  // Count CSV rows (subtract 1 for header)
  const csvRows = csv.split('\n').length - 1;
  return {
    approach:        'json2csv',
    outputFormat:    'CSV',
    docsFromMongo:   docs.length,
    recordsReturned: csvRows,
    note:            'Arrays serialised as strings — one row per document, no service expansion',
    mongoQueryTimeMs,
    parseTimeMs,
    flattenTimeMs:   0,
    totalTimeMs:     mongoQueryTimeMs + parseTimeMs,
    memoryDeltaMb,
    bottleneck:      'MongoDB fetch/transfer',
  };
}

router.get('/:collection', async (req, res, next) => {
  const { collection } = req.params;
  if (!CONFIG[collection]) {
    return res.status(404).json({ error: `Unknown collection: ${collection}. Valid: onboards, offboards` });
  }

  try {
    const db = getDB();
    const { flatten, pipeline } = CONFIG[collection];

    const [v1, v2, v3] = await Promise.all([
      runV1(db, collection, flatten),
      runV2(db, collection, pipeline),
      runV3(db, collection),
    ]);

    const speedupV1vsV2 = (v1.totalTimeMs / v2.totalTimeMs).toFixed(1);
    const speedupV1vsV3 = (v1.totalTimeMs / v3.totalTimeMs).toFixed(1);
    const fastest = [v1, v2, v3].reduce((a, b) => a.totalTimeMs < b.totalTimeMs ? a : b);

    res.json({
      collection,
      summary: {
        fastest:         fastest.approach,
        v1_totalTimeMs:  v1.totalTimeMs,
        v2_totalTimeMs:  v2.totalTimeMs,
        v3_totalTimeMs:  v3.totalTimeMs,
        v1_vs_v2:        `v1 is ${speedupV1vsV2}x ${v1.totalTimeMs <= v2.totalTimeMs ? 'faster' : 'slower'} than v2`,
        v1_vs_v3:        `v1 is ${speedupV1vsV3}x ${v1.totalTimeMs <= v3.totalTimeMs ? 'faster' : 'slower'} than v3`,
        v1_recordsOut:   v1.recordsReturned,
        v2_recordsOut:   v2.recordsReturned,
        v3_recordsOut:   v3.recordsReturned,
        note:            'v3 records = CSV rows (one per doc, arrays not expanded)',
        v1_memoryDeltaMb: v1.memoryDeltaMb,
        v2_memoryDeltaMb: v2.memoryDeltaMb,
        v3_memoryDeltaMb: v3.memoryDeltaMb,
      },
      v1,
      v2,
      v3,
    });
  } catch (err) { next(err); }
});

module.exports = router;
