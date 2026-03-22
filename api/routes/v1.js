// V1 — Work API style: fetch all docs from MongoDB, flatten in Node.js
// This replicates what the work API does: fetch nested docs → JS loops → flat rows

const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const { flattenEmployees }  = require('../flatten/employees');
const { flattenOnboarding } = require('../flatten/onboarding');
const { flattenOffboarding }= require('../flatten/offboarding');
const { flattenServices }   = require('../flatten/services');
const { flattenEvents }     = require('../flatten/events');

function measure() {
  return {
    start: process.hrtime.bigint(),
    mem: process.memoryUsage().heapUsed,
  };
}

function finish(m) {
  return {
    totalTimeMs:    Math.round(Number(process.hrtime.bigint() - m.start) / 1e6),
    memoryDeltaMb:  parseFloat(((process.memoryUsage().heapUsed - m.mem) / 1024 / 1024).toFixed(2)),
  };
}

async function handleV1(res, next, collectionName, flattenFn) {
  try {
    const db = getDB();
    const m = measure();

    // Step 1: fetch ALL nested documents (work API style — no projection, no pipeline)
    const queryStart = process.hrtime.bigint();
    const docs = await db.collection(collectionName).find({}).toArray();
    const mongoQueryTimeMs = Math.round(Number(process.hrtime.bigint() - queryStart) / 1e6);

    // Step 2: flatten in Node.js (work API bottleneck)
    const flattenStart = process.hrtime.bigint();
    const data = flattenFn(docs);
    const flattenTimeMs = Math.round(Number(process.hrtime.bigint() - flattenStart) / 1e6);

    const { totalTimeMs, memoryDeltaMb } = finish(m);

    res.json({
      meta: {
        approach:         'v1-js-flatten',
        description:      'Fetch all docs → flatten in Node.js (replicates work API)',
        collection:       collectionName,
        docsFromMongo:    docs.length,
        recordsReturned:  data.length,
        mongoQueryTimeMs,
        flattenTimeMs,
        totalTimeMs,
        memoryDeltaMb,
      },
      data,
    });
  } catch (err) {
    next(err);
  }
}

router.get('/employees',   (req, res, next) => handleV1(res, next, 'employees',   flattenEmployees));
router.get('/onboarding',  (req, res, next) => handleV1(res, next, 'onboarding',  flattenOnboarding));
router.get('/offboarding', (req, res, next) => handleV1(res, next, 'offboarding', flattenOffboarding));
router.get('/services',    (req, res, next) => handleV1(res, next, 'services',    flattenServices));
router.get('/events',      (req, res, next) => handleV1(res, next, 'events',      flattenEvents));

module.exports = router;
