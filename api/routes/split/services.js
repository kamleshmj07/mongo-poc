const express = require('express');
const router = express.Router();
const { getDB } = require('../../config/db');

const BASE_PROJECT = {
  _id: 0,
  serviceId:          1,
  employeeId:         1,
  employeeName:       1,
  department:         1,
  status:             1,
  assignedDate:       1,
  removedDate:        1,
  deploymentMethod:   1,
  appName:            '$application.name',
  appVendor:          '$application.vendor',
  appVersion:         '$application.version',
  appCategory:        '$application.category',
  supportTier:        '$application.provider.supportTier',
  accountManager:     '$application.provider.accountManager',
  contractRenewal:    '$application.provider.contractRenewalDate',
  slaHours:           '$application.provider.support.slaResponseHours',
  licenseId:          '$subscription.licenseId',
  assignedSeat:       '$subscription.assignedSeat',
  seatType:           '$subscription.seatType',
  costPerSeatUsd:     '$subscription.costPerSeatUsd',
  billingCycle:       '$subscription.billingCycle',
  expiryDate:         '$subscription.expiryDate',
  planName:           '$subscription.plan.planName',
  lastActiveDate:     '$usage.lastActiveDate',
  isActive:           '$usage.isActive',
  totalLogins:        '$usage.totalLogins',
  avgSessionMinutes:  '$usage.avgSessionMinutes',
  logins30d:          '$usage.metrics.loginCount30d',
  dataTransfer30dMb:  '$usage.metrics.dataTransferMb30d',
  errorRate:          '$usage.metrics.errorRate',
  auditStatus:        '$compliance.auditStatus',
  lastAuditDate:      '$compliance.lastAuditDate',
  dataClassification: '$compliance.dataClassification',
};

async function run(req, res, next, endpoint, description, joinKey, pipeline) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
    const skip  = parseInt(req.query.skip) || 0;
    const pagedPipeline = [...pipeline, ...(skip ? [{ $skip: skip }] : []), { $limit: limit }];

    const start = process.hrtime.bigint();
    const data = await getDB().collection('services').aggregate(pagedPipeline).toArray();
    const totalTimeMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    res.json({
      meta: { endpoint, description, joinKey, limit, skip, recordsReturned: data.length, totalTimeMs },
      data,
    });
  } catch (err) { next(err); }
}

// GET /api/split/services/summary
// One row per service assignment — no array unwinds
router.get('/summary', (req, res, next) => run(req, res, next,
  '/api/split/services/summary',
  'One row per service assignment — all service header fields, no feature/usage arrays',
  'serviceId / employeeId',
  [{ $project: BASE_PROJECT }]
));

// GET /api/split/services/features
// One row per software feature — single $unwind on subscription.plan.features[]
router.get('/features', (req, res, next) => run(req, res, next,
  '/api/split/services/features',
  'One row per software feature — join to summary on serviceId',
  'serviceId',
  [
    { $unwind: { path: '$subscription.plan.features', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        serviceId:            1,
        employeeId:           1,
        department:           1,
        appName:              '$application.name',
        appVendor:            '$application.vendor',
        appCategory:          '$application.category',
        planName:             '$subscription.plan.planName',
        featureName:          '$subscription.plan.features.featureName',
        featureEnabled:       '$subscription.plan.features.enabled',
        featureEnabledDate:   '$subscription.plan.features.enabledDate',
        limitMaxStorage:      '$subscription.plan.features.limits.maxStorage',
        limitMaxUsers:        '$subscription.plan.features.limits.maxUsers',
        limitApiCallsPerDay:  '$subscription.plan.features.limits.apiCallsPerDay',
        limitRateLimitPolicy: '$subscription.plan.features.limits.rateLimitPolicy',
      },
    },
  ]
));

// GET /api/split/services/weekly-usage
// One row per week per service — single $unwind on usage.metrics.breakdown[]
router.get('/weekly-usage', (req, res, next) => run(req, res, next,
  '/api/split/services/weekly-usage',
  'One row per week of usage per service — join to summary on serviceId',
  'serviceId',
  [
    { $unwind: { path: '$usage.metrics.breakdown', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        serviceId:          1,
        employeeId:         1,
        department:         1,
        appName:            '$application.name',
        appCategory:        '$application.category',
        weekOf:             '$usage.metrics.breakdown.weekOf',
        weeklyLogins:       '$usage.metrics.breakdown.logins',
        weeklyDataMb:       '$usage.metrics.breakdown.dataTransferMb',
        weeklyErrors:       '$usage.metrics.breakdown.errorsCount',
        peakUsageHour:      '$usage.metrics.breakdown.details.peakUsageHour',
        mostUsedFeature:    '$usage.metrics.breakdown.details.mostUsedFeature',
        sessionTimeouts:    '$usage.metrics.breakdown.details.sessionTimeoutCount',
        deviceType:         '$usage.metrics.breakdown.details.deviceType',
      },
    },
  ]
));

// GET /api/split/services/escalation
// One row per escalation contact — unwind application.provider.support.escalation.contacts[]
router.get('/escalation', (req, res, next) => run(req, res, next,
  '/api/split/services/escalation',
  'One row per escalation contact per service — join to summary on serviceId',
  'serviceId',
  [
    { $unwind: { path: '$application.provider.support.escalation.contacts', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        serviceId:            1,
        employeeId:           1,
        appName:              '$application.name',
        appVendor:            '$application.vendor',
        supportTier:          '$application.provider.supportTier',
        escalationLevel:      '$application.provider.support.escalation.contacts.level',
        escalationTeam:       '$application.provider.support.escalation.contacts.team',
        escalationEmail:      '$application.provider.support.escalation.contacts.email',
        responseTimeHours:    '$application.provider.support.escalation.contacts.responseTimeHours',
        escalationPolicy:     '$application.provider.support.escalation.escalationPolicy',
        lastEscalationDate:   '$application.provider.support.escalation.lastEscalationDate',
      },
    },
  ]
));

module.exports = router;
