const express   = require('express');
const router    = express.Router();
const { getDB } = require('../../config/db');

async function run(req, res, next, endpoint, description, joinKey, pipeline) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
    const skip  = parseInt(req.query.skip) || 0;
    const pagedPipeline = [...pipeline, ...(skip ? [{ $skip: skip }] : []), { $limit: limit }];

    const t0   = process.hrtime.bigint();
    const data = await getDB().collection('offboards').aggregate(pagedPipeline).toArray();
    const totalTimeMs = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);

    res.json({
      meta: { endpoint, description, joinKey, limit, skip, recordsReturned: data.length, totalTimeMs },
      data,
    });
  } catch (err) { next(err); }
}

// GET /api/split/offboards/summary
router.get('/summary', (req, res, next) => run(req, res, next,
  '/api/split/offboards/summary',
  'One row per offboard request — employee, termination type, manager, workflow status',
  'docId',
  [{
    $project: {
      _id: 0,
      docId:           1,
      docType:         1,
      unit:            1,
      createdBy:       1,
      createdAt:       1,
      updatedAt:       1,
      commonName:      '$offboard.employee.CommonName',
      upn:             '$offboard.employee.userPrincipalName',
      department:      '$offboard.employee.Department',
      jobTitle:        '$offboard.employee.JobTitle',
      costCenter:      '$offboard.employee.CostCenter',
      location:        '$offboard.employee.Location',
      hireDate:        '$offboard.employee.HireDate',
      country:         '$offboard.employee.Country',
      legalEntity:     '$offboard.employee.LegalEntity',
      terminationType: '$offboard.terminationType',
      lastWorkingDay:  '$offboard.lastWorkingDay',
      managerUpn:      '$offboard.employee.ManagerUserPrincipalName',
      managerName:     '$offboard.employee.ManagerName',
      grandMgrUpn:     '$offboard.employee.GrandManagerUserPrincipalName',
      grandMgrName:    '$offboard.employee.GrandManagerName',
      requesterUpn:    '$requester.userPrincipalName',
      requesterName:   '$requester.CommonName',
      companyName:     '$company.Name',
      companyCountry:  '$company.Country',
      companyRegion:   '$company.Region',
      currency:        '$company.Currency',
      wfStatus:        '$workflow.Status',
      wfSta:           '$workflow.Sta',
      allDone:         '$allSvcSta.allDone',
      serviceCount:    { $size: { $ifNull: ['$services', []] } },
    },
  }]
));

// GET /api/split/offboards/services
router.get('/services', (req, res, next) => run(req, res, next,
  '/api/split/offboards/services',
  'One row per service task — join to summary on docId',
  'docId',
  [
    { $unwind: { path: '$services', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        _fieldsObj: {
          $arrayToObject: {
            $map: {
              input: { $ifNull: ['$services.fields', []] },
              as:    'f',
              in:    { k: { $concat: ['field_', '$$f.key'] }, v: '$$f.value' },
            },
          },
        },
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            {
              docId:           '$docId',
              unit:            '$unit',
              commonName:      '$offboard.employee.CommonName',
              upn:             '$offboard.employee.userPrincipalName',
              department:      '$offboard.employee.Department',
              terminationType: '$offboard.terminationType',
              lastWorkingDay:  '$offboard.lastWorkingDay',
              wfStatus:        '$workflow.Status',
              allDone:         '$allSvcSta.allDone',
              serviceId:       '$services._id',
              serviceName:     '$services.name',
              serviceType:     '$services.type',
              mustDone:        '$services.mustDone',
              serviceStatus:   '$services.status',
              serviceResp:     { $reduce: { input: { $ifNull: ['$services.resp', []] }, initialValue: '', in: { $cond: [{ $eq: ['$$value', ''] }, '$$this', { $concat: ['$$value', ';', '$$this'] }] } } },
              serviceDoneDate: '$services.doneDate',
              serviceStaDate:  '$services.staDate',
              depands:         { $reduce: { input: { $ifNull: ['$services.depands', []] }, initialValue: '', in: { $cond: [{ $eq: ['$$value', ''] }, '$$this', { $concat: ['$$value', ';', '$$this'] }] } } },
            },
            '$_fieldsObj',
          ],
        },
      },
    },
  ]
));

// GET /api/split/offboards/workflow-steps
router.get('/workflow-steps', (req, res, next) => run(req, res, next,
  '/api/split/offboards/workflow-steps',
  'One row per workflow step — join to summary on docId',
  'docId',
  [
    { $unwind: { path: '$workflow.Data', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id:            0,
        docId:          1,
        unit:           1,
        commonName:     '$offboard.employee.CommonName',
        upn:            '$offboard.employee.userPrincipalName',
        department:     '$offboard.employee.Department',
        terminationType: '$offboard.terminationType',
        lastWorkingDay: '$offboard.lastWorkingDay',
        wfStatus:       '$workflow.Status',
        stepAction:     '$workflow.Data.Action',
        stepStatus:     '$workflow.Data.Status',
        stepDate:       '$workflow.Data.Date',
        stepDoneDate:   '$workflow.Data.DoneDate',
        stepResp:       { $reduce: { input: { $ifNull: ['$workflow.Data.Resp', []] }, initialValue: '', in: { $cond: [{ $eq: ['$$value', ''] }, '$$this', { $concat: ['$$value', ';', '$$this'] }] } } },
      },
    },
  ]
));

module.exports = router;
