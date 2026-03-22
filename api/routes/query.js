const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const fieldMaps = require('../queries/fieldMaps');
const { buildPipeline } = require('../queries/buildPipeline');

// GET /api/schema  → returns full field + filter config for all collections (used by Vue UI)
router.get('/schema', (req, res) => {
  // Strip any internal-only props, return only what the UI needs
  const schema = {};
  for (const [key, config] of Object.entries(fieldMaps)) {
    schema[key] = {
      label: config.label,
      fields: Object.entries(config.fields).map(([fieldKey, f]) => ({
        key: fieldKey,
        label: f.label,
        type: f.type,
      })),
      filters: Object.entries(config.filters).map(([filterKey, f]) => ({
        key: filterKey,
        label: f.label,
        type: f.type,
        options: f.options || null,
      })),
    };
  }
  res.json(schema);
});

// GET /api/query/:collection  → query a collection with field selection and filters
router.get('/:collection', async (req, res, next) => {
  try {
    const { collection } = req.params;
    const collectionConfig = fieldMaps[collection];

    if (!collectionConfig) {
      return res.status(404).json({
        error: `Unknown collection: "${collection}"`,
        available: Object.keys(fieldMaps),
      });
    }

    // Parse selected fields from ?fields=field1,field2,...
    const selectedFields = req.query.fields
      ? req.query.fields.split(',').map((f) => f.trim()).filter(Boolean)
      : [];

    // Parse pagination
    const pagination = {
      limit: req.query.limit || 500,
      skip: req.query.skip || 0,
    };

    // Everything else in query string = filter candidates
    const reservedParams = new Set(['fields', 'limit', 'skip']);
    const activeFilters = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (!reservedParams.has(key) && value !== '') {
        activeFilters[key] = value;
      }
    }

    const db = getDB();
    const pipeline = buildPipeline(collectionConfig, selectedFields, activeFilters, pagination);

    // Run count and data in parallel
    const [data, countResult] = await Promise.all([
      db.collection(collectionConfig.collectionName).aggregate(pipeline).toArray(),
      db.collection(collectionConfig.collectionName).aggregate([
        ...(pipeline[0]?.$match ? [pipeline[0]] : []),
        { $count: 'total' },
      ]).toArray(),
    ]);

    const total = countResult[0]?.total ?? 0;

    res.json({
      collection,
      total,
      returned: data.length,
      limit: parseInt(pagination.limit),
      skip: parseInt(pagination.skip),
      data,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
