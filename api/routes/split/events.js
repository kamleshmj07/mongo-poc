const express = require('express');
const router = express.Router();
const { getDB } = require('../../config/db');

const BASE_PROJECT = {
  _id: 0,
  eventId:           1,
  employeeId:        1,
  employeeName:      1,
  department:        1,
  eventType:         1,
  occurredAt:        1,
  title:             '$eventInfo.title',
  severity:          '$eventInfo.severity',
  module:            '$eventInfo.module',
  environment:       '$eventInfo.context.environment',
  region:            '$eventInfo.context.region',
  triggerType:       '$eventInfo.context.trigger.triggerType',
  initiatedBy:       '$eventInfo.context.trigger.initiatedBy',
  correlationId:     '$eventInfo.context.trigger.metadata.correlationId',
  traceId:           '$eventInfo.context.trigger.metadata.traceId',
  relatedEntityType: '$payload.relatedEntityType',
  relatedEntityId:   '$payload.relatedEntityId',
  performedBy:       '$audit.performedBy',
  performedByType:   '$audit.performedByType',
  sourceSystem:      '$audit.sourceSystem',
  approvalRequired:  '$audit.approval.required',
  approvalStatus:    '$audit.approval.status',
  reviewerName:      '$audit.approval.reviewer.name',
  reviewerRole:      '$audit.approval.reviewer.role',
  authMethod:        '$audit.approval.reviewer.credentials.authMethod',
  mfaVerified:       '$audit.approval.reviewer.credentials.mfaVerified',
  privilegedAccess:  '$audit.approval.reviewer.credentials.privilegedAccess',
};

async function run(req, res, next, endpoint, description, joinKey, pipeline) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
    const skip  = parseInt(req.query.skip) || 0;
    const pagedPipeline = [...pipeline, ...(skip ? [{ $skip: skip }] : []), { $limit: limit }];

    const start = process.hrtime.bigint();
    const data = await getDB().collection('events').aggregate(pagedPipeline).toArray();
    const totalTimeMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    res.json({
      meta: { endpoint, description, joinKey, limit, skip, recordsReturned: data.length, totalTimeMs },
      data,
    });
  } catch (err) { next(err); }
}

// GET /api/split/events/summary
// One row per event — all nested objects flattened, no arrays unwound
router.get('/summary', (req, res, next) => run(req, res, next,
  '/api/split/events/summary',
  'One row per event — all context, audit, and approval fields flattened',
  'eventId / employeeId',
  [{ $project: BASE_PROJECT }]
));

// GET /api/split/events/changes
// One row per field change inside an event — single $unwind on payload.changes[]
router.get('/changes', (req, res, next) => run(req, res, next,
  '/api/split/events/changes',
  'One row per field change — join to summary on eventId',
  'eventId',
  [
    { $unwind: { path: '$payload.changes', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        eventId:          1,
        employeeId:       1,
        department:       1,
        eventType:        1,
        occurredAt:       1,
        severity:         '$eventInfo.severity',
        module:           '$eventInfo.module',
        changeField:      '$payload.changes.field',
        changeOldValue:   '$payload.changes.oldValue',
        changeNewValue:   '$payload.changes.newValue',
        changedAt:        '$payload.changes.changedAt',
        ruleSetId:        '$payload.changes.validation.ruleSetId',
        validationPassed: '$payload.changes.validation.passed',
        ruleCount:        { $size: { $ifNull: ['$payload.changes.validation.rules', []] } },
      },
    },
  ]
));

// GET /api/split/events/rules
// One row per validation rule — unwind payload.changes[] → validation.rules[]
router.get('/rules', (req, res, next) => run(req, res, next,
  '/api/split/events/rules',
  'One row per validation rule fired — join to changes on eventId + changeField',
  'eventId + changeField',
  [
    { $unwind: { path: '$payload.changes', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$payload.changes.validation.rules', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        eventId:          1,
        employeeId:       1,
        eventType:        1,
        occurredAt:       1,
        severity:         '$eventInfo.severity',
        changeField:      '$payload.changes.field',
        ruleSetId:        '$payload.changes.validation.ruleSetId',
        ruleId:           '$payload.changes.validation.rules.ruleId',
        ruleName:         '$payload.changes.validation.rules.ruleName',
        rulePassed:       '$payload.changes.validation.rules.passed',
        ruleMessage:      '$payload.changes.validation.rules.message',
      },
    },
  ]
));

module.exports = router;
