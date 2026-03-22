/**
 * Builds a MongoDB aggregation pipeline from:
 *  - selectedFields: array of field keys (from fieldMaps)
 *  - activeFilters:  object of { filterKey: value }
 *  - pagination:     { limit, skip }
 *  - collectionConfig: one entry from fieldMaps
 */
function buildPipeline(collectionConfig, selectedFields, activeFilters, pagination) {
  const pipeline = [];

  // --- 1. $match stage from active filters ---
  const match = {};
  for (const [filterKey, filterValue] of Object.entries(activeFilters)) {
    if (filterValue === '' || filterValue === null || filterValue === undefined) continue;
    const filterConfig = collectionConfig.filters[filterKey];
    if (!filterConfig) continue;

    const { path, operator } = filterConfig;

    if (operator === 'gte') {
      match[path] = match[path] || {};
      match[path].$gte = filterValue;
    } else if (operator === 'lte') {
      match[path] = match[path] || {};
      match[path].$lte = filterValue;
    } else if (filterConfig.type === 'text') {
      // partial match, case-insensitive
      match[path] = { $regex: filterValue, $options: 'i' };
    } else {
      match[path] = filterValue;
    }
  }

  if (Object.keys(match).length > 0) {
    pipeline.push({ $match: match });
  }

  // --- 2. $project stage from selected fields ---
  const projectStage = { _id: 0 };

  const fields = selectedFields.length > 0 ? selectedFields : Object.keys(collectionConfig.fields);

  for (const fieldKey of fields) {
    const fieldConfig = collectionConfig.fields[fieldKey];
    if (!fieldConfig) continue;
    // If the path equals the key, just include it directly; otherwise alias it
    if (fieldConfig.path === fieldKey) {
      projectStage[fieldKey] = 1;
    } else {
      projectStage[fieldKey] = `$${fieldConfig.path}`;
    }
  }

  pipeline.push({ $project: projectStage });

  // --- 3. Pagination ---
  const skip = parseInt(pagination.skip) || 0;
  const limit = Math.min(parseInt(pagination.limit) || 500, 5000);

  if (skip > 0) pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  return pipeline;
}

module.exports = { buildPipeline };
