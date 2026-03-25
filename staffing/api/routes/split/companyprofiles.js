const express   = require('express');
const router    = express.Router();
const { getDB } = require('../../config/db');

async function run(req, res, next, endpoint, description, joinKey, pipeline) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
    const skip  = parseInt(req.query.skip) || 0;
    const pagedPipeline = [...pipeline, ...(skip ? [{ $skip: skip }] : []), { $limit: limit }];

    const t0   = process.hrtime.bigint();
    const data = await getDB().collection('companyprofiles').aggregate(pagedPipeline).toArray();
    const totalTimeMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);

    res.json({
      meta: { endpoint, description, joinKey, limit, skip, recordsReturned: data.length, totalTimeMs },
      data,
    });
  } catch (err) { next(err); }
}

// GET /api/split/companyprofiles/summary
router.get('/summary', (req, res, next) => run(req, res, next,
  '/api/split/companyprofiles/summary',
  'One row per company entity',
  'unit',
  [{
    $project: {
      _id:      0,
      unit:     1,
      name:     1,
      country:  1,
      region:   1,
      ba:       1,
      currency: 1,
      createdAt: 1,
      updatedAt: 1,
      aclCount:    { $size: { $ifNull: ['$acls', []] } },
      wfRoleCount: { $size: { $ifNull: ['$wfRoles', []] } },
      routerCount: { $size: { $ifNull: ['$wfRouters', []] } },
    },
  }]
));

// GET /api/split/companyprofiles/acls
// One row per ACL entry — join to summary on unit
router.get('/acls', (req, res, next) => run(req, res, next,
  '/api/split/companyprofiles/acls',
  'One row per ACL role entry — join to summary on unit',
  'unit',
  [
    { $unwind: { path: '$acls', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id:      0,
        unit:     1,
        name:     1,
        aclKey:   '$acls.key',
        aclValues: { $reduce: { input: { $ifNull: ['$acls.values', []] }, initialValue: '', in: { $cond: [{ $eq: ['$$value', ''] }, '$$this', { $concat: ['$$value', ';', '$$this'] }] } } },
        aclCount:  { $size: { $ifNull: ['$acls.values', []] } },
      },
    },
  ]
));

// GET /api/split/companyprofiles/wf-roles
// One row per workflow role entry — join to summary on unit
router.get('/wf-roles', (req, res, next) => run(req, res, next,
  '/api/split/companyprofiles/wf-roles',
  'One row per workflow role assignment — join to summary on unit',
  'unit',
  [
    { $unwind: { path: '$wfRoles', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id:        0,
        unit:       1,
        name:       1,
        roleKey:    '$wfRoles.key',
        roleValues: { $reduce: { input: { $ifNull: ['$wfRoles.values', []] }, initialValue: '', in: { $cond: [{ $eq: ['$$value', ''] }, '$$this', { $concat: ['$$value', ';', '$$this'] }] } } },
        roleCount:  { $size: { $ifNull: ['$wfRoles.values', []] } },
      },
    },
  ]
));

module.exports = router;
