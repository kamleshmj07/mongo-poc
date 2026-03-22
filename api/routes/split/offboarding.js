const express = require('express');
const router = express.Router();
const { getDB } = require('../../config/db');

const BASE_PROJECT = {
  _id: 0,
  offboardingId:     1,
  employeeId:        1,
  employeeName:      1,
  department:        1,
  separationType:    1,
  status:            1,
  initiatedDate:     1,
  lastWorkingDay:    1,
  completedDate:     1,
  exitInterviewDone: '$exitInterviewCompleted',
  exitInterviewDate: 1,
  hrContactName:     '$hrContact.name',
  finalPayDate:      '$finalPayroll.finalPayDate',
  severanceEligible: '$finalPayroll.severanceEligible',
  severanceWeeks:    '$finalPayroll.severanceWeeks',
};

async function run(req, res, next, endpoint, description, joinKey, pipeline) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
    const skip  = parseInt(req.query.skip) || 0;
    const pagedPipeline = [...pipeline, ...(skip ? [{ $skip: skip }] : []), { $limit: limit }];

    const start = process.hrtime.bigint();
    const data = await getDB().collection('offboarding').aggregate(pagedPipeline).toArray();
    const totalTimeMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    res.json({
      meta: { endpoint, description, joinKey, limit, skip, recordsReturned: data.length, totalTimeMs },
      data,
    });
  } catch (err) { next(err); }
}

// GET /api/split/offboarding/summary
router.get('/summary', (req, res, next) => run(req, res, next,
  '/api/split/offboarding/summary',
  'One row per offboarded employee — header fields only',
  'offboardingId / employeeId',
  [{ $project: BASE_PROJECT }]
));

// GET /api/split/offboarding/tasks
// One row per task — unwind phases[] → tasks[]
router.get('/tasks', (req, res, next) => run(req, res, next,
  '/api/split/offboarding/tasks',
  'One row per offboarding task — join to summary on offboardingId',
  'offboardingId',
  [
    { $unwind: '$phases' },
    { $unwind: '$phases.tasks' },
    {
      $project: {
        _id: 0,
        offboardingId:     1,
        employeeId:        1,
        department:        1,
        separationType:    1,
        phaseName:         '$phases.phaseName',
        phaseStatus:       '$phases.status',
        taskId:            '$phases.tasks.taskId',
        taskCategory:      '$phases.tasks.category',
        taskName:          '$phases.tasks.taskName',
        taskAssignedTo:    '$phases.tasks.assignedTo',
        taskStatus:        '$phases.tasks.status',
        taskDueDate:       '$phases.tasks.dueDate',
        taskCompletedDate: '$phases.tasks.completedDate',
        taskNotes:         '$phases.tasks.notes',
        verificationCount: { $size: { $ifNull: ['$phases.tasks.verifications', []] } },
      },
    },
  ]
));

// GET /api/split/offboarding/verifications
// One row per verification — unwind phases[] → tasks[] → verifications[]
router.get('/verifications', (req, res, next) => run(req, res, next,
  '/api/split/offboarding/verifications',
  'One row per task verification — join to tasks on offboardingId + taskId',
  'offboardingId + taskId',
  [
    { $unwind: '$phases' },
    { $unwind: '$phases.tasks' },
    { $unwind: { path: '$phases.tasks.verifications', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        offboardingId:      1,
        employeeId:         1,
        phaseName:          '$phases.phaseName',
        taskId:             '$phases.tasks.taskId',
        taskName:           '$phases.tasks.taskName',
        verificationId:     '$phases.tasks.verifications.verificationId',
        verifiedBy:         '$phases.tasks.verifications.verifiedBy',
        verifiedAt:         '$phases.tasks.verifications.verifiedAt',
        method:             '$phases.tasks.verifications.method',
        evidenceType:       '$phases.tasks.verifications.evidence.type',
        evidenceRefId:      '$phases.tasks.verifications.evidence.referenceId',
        evidenceStoredAt:   '$phases.tasks.verifications.evidence.storedAt',
        evidenceRetainYrs:  '$phases.tasks.verifications.evidence.retentionYears',
      },
    },
  ]
));

// GET /api/split/offboarding/asset-return
// One row per returned device — single $unwind on assetReturn.devices[]
router.get('/asset-return', (req, res, next) => run(req, res, next,
  '/api/split/offboarding/asset-return',
  'One row per returned device — join to summary on offboardingId',
  'offboardingId',
  [
    { $unwind: { path: '$assetReturn.devices', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        offboardingId:       1,
        employeeId:          1,
        department:          1,
        lastWorkingDay:      1,
        assetReturnStatus:   '$assetReturn.status',
        returnDeadline:      '$assetReturn.returnDeadline',
        serialNumber:        '$assetReturn.devices.serialNumber',
        assetTag:            '$assetReturn.devices.assetTag',
        deviceType:          '$assetReturn.devices.deviceType',
        returnedDate:        '$assetReturn.devices.returnedDate',
        trackingNumber:      '$assetReturn.devices.trackingNumber',
        conditionGrade:      '$assetReturn.devices.condition.grade',
        physicalDamage:      '$assetReturn.devices.condition.physicalDamage',
        conditionNotes:      '$assetReturn.devices.condition.notes',
        assessedBy:          '$assetReturn.devices.condition.assessment.assessedBy',
        assessedDate:        '$assetReturn.devices.condition.assessment.assessedDate',
        refurbishRequired:   '$assetReturn.devices.condition.assessment.refurbishmentRequired',
        repairCostUsd:       '$assetReturn.devices.condition.assessment.estimatedRepairCostUsd',
        disposition:         '$assetReturn.devices.condition.assessment.disposition',
      },
    },
  ]
));

// GET /api/split/offboarding/knowledge-areas
// One row per KT area — single $unwind on knowledgeTransfer.areas[]
router.get('/knowledge-areas', (req, res, next) => run(req, res, next,
  '/api/split/offboarding/knowledge-areas',
  'One row per knowledge transfer area — join to summary on offboardingId',
  'offboardingId',
  [
    { $unwind: { path: '$knowledgeTransfer.areas', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        offboardingId:   1,
        employeeId:      1,
        department:      1,
        ktCompleted:     '$knowledgeTransfer.documentationCompleted',
        ktCompletedDate: '$knowledgeTransfer.completedDate',
        handoverToName:  '$knowledgeTransfer.handoverTo.name',
        handoverToEmail: '$knowledgeTransfer.handoverTo.email',
        areaId:          '$knowledgeTransfer.areas.areaId',
        area:            '$knowledgeTransfer.areas.area',
        areaStatus:      '$knowledgeTransfer.areas.status',
        documentCount:   { $size: { $ifNull: ['$knowledgeTransfer.areas.documents', []] } },
      },
    },
  ]
));

module.exports = router;
