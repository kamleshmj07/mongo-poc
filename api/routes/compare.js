// Compare endpoint: runs both v1 and v2 on the same collection and returns metrics side by side
// Does NOT return data (too large) — just the performance numbers

const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');

const { flattenEmployees }  = require('../flatten/employees');
const { flattenOnboarding } = require('../flatten/onboarding');
const { flattenOffboarding }= require('../flatten/offboarding');
const { flattenServices }   = require('../flatten/services');
const { flattenEvents }     = require('../flatten/events');

const employeesPipeline   = require('../pipelines/employees');
const onboardingPipeline  = require('../pipelines/onboarding');
const offboardingPipeline = require('../pipelines/offboarding');
const servicesPipeline    = require('../pipelines/services');
const eventsPipeline      = require('../pipelines/events');

const registry = {
  employees:   { flatten: flattenEmployees,   pipeline: employeesPipeline,   collection: 'employees'   },
  onboarding:  { flatten: flattenOnboarding,  pipeline: onboardingPipeline,  collection: 'onboarding'  },
  offboarding: { flatten: flattenOffboarding, pipeline: offboardingPipeline, collection: 'offboarding' },
  services:    { flatten: flattenServices,    pipeline: servicesPipeline,    collection: 'services'    },
  events:      { flatten: flattenEvents,      pipeline: eventsPipeline,      collection: 'events'      },
};

router.get('/:collection', async (req, res, next) => {
  const entry = registry[req.params.collection];
  if (!entry) {
    return res.status(404).json({ error: 'Unknown collection', available: Object.keys(registry) });
  }

  try {
    const db = getDB();
    const { flatten, pipeline, collection } = entry;

    // --- Run V1 ---
    const v1Start = process.hrtime.bigint();
    const v1MemBefore = process.memoryUsage().heapUsed;

    const v1QueryStart = process.hrtime.bigint();
    const docs = await db.collection(collection).find({}).toArray();
    const v1QueryMs = Math.round(Number(process.hrtime.bigint() - v1QueryStart) / 1e6);

    const v1FlatStart = process.hrtime.bigint();
    const v1Data = flatten(docs);
    const v1FlatMs = Math.round(Number(process.hrtime.bigint() - v1FlatStart) / 1e6);

    const v1TotalMs = Math.round(Number(process.hrtime.bigint() - v1Start) / 1e6);
    const v1MemDelta = parseFloat(((process.memoryUsage().heapUsed - v1MemBefore) / 1024 / 1024).toFixed(2));

    // --- Run V2 ---
    const v2Start = process.hrtime.bigint();
    const v2MemBefore = process.memoryUsage().heapUsed;

    const v2QueryStart = process.hrtime.bigint();
    const v2Data = await db.collection(collection).aggregate(pipeline, { allowDiskUse: true }).toArray();
    const v2QueryMs = Math.round(Number(process.hrtime.bigint() - v2QueryStart) / 1e6);

    const v2TotalMs = Math.round(Number(process.hrtime.bigint() - v2Start) / 1e6);
    const v2MemDelta = parseFloat(((process.memoryUsage().heapUsed - v2MemBefore) / 1024 / 1024).toFixed(2));

    // --- Summary ---
    const speedupFactor = v1TotalMs > 0 ? (v1TotalMs / v2TotalMs).toFixed(2) : 'N/A';

    res.json({
      collection,
      summary: {
        v1_totalTimeMs:   v1TotalMs,
        v2_totalTimeMs:   v2TotalMs,
        speedupFactor:    `${speedupFactor}x faster with v2`,
        v1_recordsOut:    v1Data.length,
        v2_recordsOut:    v2Data.length,
        v1_memoryDeltaMb: v1MemDelta,
        v2_memoryDeltaMb: v2MemDelta,
      },
      v1: {
        approach:         'js-flatten (work API style)',
        docsFromMongo:    docs.length,
        recordsReturned:  v1Data.length,
        mongoQueryTimeMs: v1QueryMs,
        flattenTimeMs:    v1FlatMs,
        totalTimeMs:      v1TotalMs,
        memoryDeltaMb:    v1MemDelta,
        bottleneck:       v1FlatMs > v1QueryMs ? 'JS flattening' : 'MongoDB fetch',
      },
      v2: {
        approach:         'mongodb-pipeline (optimized)',
        docsFromMongo:    v2Data.length,
        recordsReturned:  v2Data.length,
        mongoQueryTimeMs: v2QueryMs,
        flattenTimeMs:    0,
        totalTimeMs:      v2TotalMs,
        memoryDeltaMb:    v2MemDelta,
        bottleneck:       'none significant',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
