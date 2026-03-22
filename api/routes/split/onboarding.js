const express = require('express');
const router = express.Router();
const { getDB } = require('../../config/db');

// Shared base fields — top-level onboarding fields, no arrays
const BASE_PROJECT = {
  _id: 0,
  onboardingId:        1,
  employeeId:          1,
  employeeName:        1,
  department:          1,
  status:              1,
  onboardingBatch:     1,
  startedDate:         1,
  completedDate:       1,
  hrContactName:       '$hrContact.name',
  hrContactEmail:      '$hrContact.email',
  buddyName:           '$assignedBuddy.name',
  buddyEmail:          '$assignedBuddy.email',
  trainingPlatform:    '$training.platform',
  accessCompletedDate: '$accessProvisioning.completedDate',
};

async function run(req, res, next, collectionName, endpoint, description, joinKey, pipeline) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
    const skip  = parseInt(req.query.skip) || 0;
    const pagedPipeline = [...pipeline, ...(skip ? [{ $skip: skip }] : []), { $limit: limit }];

    const start = process.hrtime.bigint();
    const data = await getDB().collection(collectionName).aggregate(pagedPipeline).toArray();
    const totalTimeMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    res.json({
      meta: { endpoint, description, joinKey, limit, skip, recordsReturned: data.length, totalTimeMs },
      data,
    });
  } catch (err) { next(err); }
}

// GET /api/split/onboarding/summary
// One row per employee — top-level onboarding fields only, no phases/tasks unwound
router.get('/summary', (req, res, next) => run(req, res, next, 'onboarding',
  '/api/split/onboarding/summary',
  'One row per employee — onboarding header fields only',
  'onboardingId / employeeId',
  [{ $project: BASE_PROJECT }]
));

// GET /api/split/onboarding/phases
// One row per phase — single $unwind on phases[]
router.get('/phases', (req, res, next) => run(req, res, next, 'onboarding',
  '/api/split/onboarding/phases',
  'One row per onboarding phase — join to summary on onboardingId',
  'onboardingId',
  [
    { $unwind: '$phases' },
    {
      $project: {
        ...BASE_PROJECT,
        phaseId:        '$phases.phaseId',
        phaseName:      '$phases.phaseName',
        phaseStatus:    '$phases.status',
        phaseStartDate: '$phases.startDate',
        phaseEndDate:   '$phases.endDate',
        taskCount:      { $size: { $ifNull: ['$phases.tasks', []] } },
      },
    },
  ]
));

// GET /api/split/onboarding/tasks
// One row per task — unwind phases[] then tasks[]
router.get('/tasks', (req, res, next) => run(req, res, next, 'onboarding',
  '/api/split/onboarding/tasks',
  'One row per onboarding task — join to phases on onboardingId + phaseName',
  'onboardingId',
  [
    { $unwind: '$phases' },
    { $unwind: '$phases.tasks' },
    {
      $project: {
        _id: 0,
        onboardingId:      1,
        employeeId:        1,
        department:        1,
        onboardingBatch:   1,
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
        subtaskCount:      { $size: { $ifNull: ['$phases.tasks.subtasks', []] } },
      },
    },
  ]
));

// GET /api/split/onboarding/subtasks
// One row per subtask — unwind phases[] → tasks[] → subtasks[]
router.get('/subtasks', (req, res, next) => run(req, res, next, 'onboarding',
  '/api/split/onboarding/subtasks',
  'One row per subtask checklist item — join to tasks on onboardingId + taskId',
  'onboardingId + taskId',
  [
    { $unwind: '$phases' },
    { $unwind: '$phases.tasks' },
    { $unwind: { path: '$phases.tasks.subtasks', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        onboardingId:        1,
        employeeId:          1,
        phaseName:           '$phases.phaseName',
        taskId:              '$phases.tasks.taskId',
        taskName:            '$phases.tasks.taskName',
        subtaskId:           '$phases.tasks.subtasks.subtaskId',
        subtaskName:         '$phases.tasks.subtasks.name',
        subtaskCompletedBy:  '$phases.tasks.subtasks.completedBy',
        subtaskCompletedDate:'$phases.tasks.subtasks.completedDate',
        checklistTotal:      '$phases.tasks.subtasks.checklist.totalItems',
        checklistCompleted:  '$phases.tasks.subtasks.checklist.completedItems',
        checklistApprovedBy: '$phases.tasks.subtasks.checklist.approvedBy',
        checklistLastUpdated:'$phases.tasks.subtasks.checklist.lastUpdated',
      },
    },
  ]
));

// GET /api/split/onboarding/training
// One row per training module — single $unwind on training.modules[]
router.get('/training', (req, res, next) => run(req, res, next, 'onboarding',
  '/api/split/onboarding/training',
  'One row per training module — join to summary on onboardingId',
  'onboardingId',
  [
    { $unwind: { path: '$training.modules', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        onboardingId:       1,
        employeeId:         1,
        department:         1,
        trainingPlatform:   '$training.platform',
        moduleId:           '$training.modules.moduleId',
        moduleName:         '$training.modules.moduleName',
        completedDate:      '$training.modules.completedDate',
        durationMinutes:    '$training.modules.durationMinutes',
        score:              '$training.modules.assessment.score',
        passingScore:       '$training.modules.assessment.passingScore',
        attempts:           '$training.modules.assessment.attempts',
        passed:             '$training.modules.assessment.passed',
        totalQuestions:     '$training.modules.assessment.questions.total',
        correctAnswers:     '$training.modules.assessment.questions.correct',
        hardestCategory:    '$training.modules.assessment.questions.hardestCategory',
      },
    },
  ]
));

// GET /api/split/onboarding/access
// One row per permission granted — unwind systems[] → roles[] → permissions[]
router.get('/access', (req, res, next) => run(req, res, next, 'onboarding',
  '/api/split/onboarding/access',
  'One row per permission granted — join to summary on onboardingId',
  'onboardingId',
  [
    { $unwind: { path: '$accessProvisioning.systems', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$accessProvisioning.systems.roles', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$accessProvisioning.systems.roles.permissions', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        onboardingId:     1,
        employeeId:       1,
        department:       1,
        accessCompletedDate: '$accessProvisioning.completedDate',
        systemName:       '$accessProvisioning.systems.systemName',
        systemStatus:     '$accessProvisioning.systems.status',
        provisionedDate:  '$accessProvisioning.systems.provisionedDate',
        roleId:           '$accessProvisioning.systems.roles.roleId',
        roleName:         '$accessProvisioning.systems.roles.roleName',
        roleAssignedDate: '$accessProvisioning.systems.roles.assignedDate',
        permissionKey:    '$accessProvisioning.systems.roles.permissions.permissionKey',
        grantedBy:        '$accessProvisioning.systems.roles.permissions.grantedBy',
        scope:            '$accessProvisioning.systems.roles.permissions.scope',
      },
    },
  ]
));

module.exports = router;
