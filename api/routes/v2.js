// V2 — Optimized: MongoDB aggregation pipeline does all unwind + flatten in the DB
// Node.js receives already-flat rows — no JS processing needed

const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const employeesPipeline   = require('../pipelines/employees');
const onboardingPipeline  = require('../pipelines/onboarding');
const offboardingPipeline = require('../pipelines/offboarding');
const servicesPipeline    = require('../pipelines/services');
const eventsPipeline      = require('../pipelines/events');

function measure() {
  return {
    start: process.hrtime.bigint(),
    mem: process.memoryUsage().heapUsed,
  };
}

function finish(m) {
  return {
    totalTimeMs:   Math.round(Number(process.hrtime.bigint() - m.start) / 1e6),
    memoryDeltaMb: parseFloat(((process.memoryUsage().heapUsed - m.mem) / 1024 / 1024).toFixed(2)),
  };
}

async function handleV2(res, next, collectionName, pipeline) {
  try {
    const db = getDB();
    const m = measure();

    // MongoDB does all the work — unwind arrays + project flat fields inside the DB
    const queryStart = process.hrtime.bigint();
    const data = await db.collection(collectionName).aggregate(pipeline, { allowDiskUse: true }).toArray();
    const mongoQueryTimeMs = Math.round(Number(process.hrtime.bigint() - queryStart) / 1e6);

    const { totalTimeMs, memoryDeltaMb } = finish(m);

    res.json({
      meta: {
        approach:         'v2-mongo-pipeline',
        description:      'MongoDB $unwind + $project pipeline — flattening done in DB',
        collection:       collectionName,
        docsFromMongo:    data.length,
        recordsReturned:  data.length,
        mongoQueryTimeMs,
        flattenTimeMs:    0,
        totalTimeMs,
        memoryDeltaMb,
      },
      data,
    });
  } catch (err) {
    next(err);
  }
}

router.get('/employees',   (req, res, next) => handleV2(res, next, 'employees',   employeesPipeline));
router.get('/onboarding',  (req, res, next) => handleV2(res, next, 'onboarding',  onboardingPipeline));
router.get('/offboarding', (req, res, next) => handleV2(res, next, 'offboarding', offboardingPipeline));
router.get('/services',    (req, res, next) => handleV2(res, next, 'services',    servicesPipeline));
router.get('/events',      (req, res, next) => handleV2(res, next, 'events',      eventsPipeline));

module.exports = router;
