// v2 approach — MongoDB aggregation pipeline
// $unwind services[], pivot fields[] via $arrayToObject, merge into one flat doc.

module.exports = [
  { $unwind: { path: '$services', preserveNullAndEmptyArrays: true } },

  // Convert fields array → { field_<key>: value } object
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

  // Build the flat row and merge field columns in
  {
    $replaceRoot: {
      newRoot: {
        $mergeObjects: [
          {
            docId:          '$docId',
            docType:        '$docType',
            unit:           '$unit',
            createdBy:      '$createdBy',
            createdAt:      '$createdAt',
            updatedAt:      '$updatedAt',
            // Employee
            firstName:      '$onboard.firstName',
            lastName:       '$onboard.lastName',
            commonName:     '$onboard.commonName',
            upn:            '$onboard.upn',
            department:     '$onboard.department',
            jobTitle:       '$onboard.jobTitle',
            costCenter:     '$onboard.costCenter',
            joinDate:       '$onboard.joinDate',
            joinDateStr:    '$onboard.joinDateStr',
            location:       '$onboard.location',
            eventType:      '$onboard.eventType',
            // Manager
            managerName:    '$onboard.manager.CommonName',
            managerUpn:     '$onboard.manager.userPrincipalName',
            managerTitle:   '$onboard.manager.JobTitle',
            grandMgrName:   '$onboard.manager.GrandManagerName',
            grandMgrUpn:    '$onboard.manager.GrandManagerUserPrincipalName',
            // Requester
            requesterName:  '$requester.CommonName',
            requesterUpn:   '$requester.userPrincipalName',
            requesterDept:  '$requester.Department',
            // Company
            companyName:    '$company.Name',
            companyCountry: '$company.Country',
            companyRegion:  '$company.Region',
            currency:       '$company.Currency',
            // Workflow
            wfStatus:       '$workflow.Status',
            wfSta:          '$workflow.Sta',
            allDone:        '$allSvcSta.allDone',
            // Service
            serviceId:      '$services._id',
            serviceName:    '$services.name',
            serviceType:    '$services.type',
            mustDone:       '$services.mustDone',
            serviceStatus:  '$services.status',
            serviceResp:    { $reduce: { input: { $ifNull: ['$services.resp', []] }, initialValue: '', in: { $cond: [{ $eq: ['$$value', ''] }, '$$this', { $concat: ['$$value', ';', '$$this'] }] } } },
            serviceDoneDate: '$services.doneDate',
            serviceStaDate: '$services.staDate',
            depands:        { $reduce: { input: { $ifNull: ['$services.depands', []] }, initialValue: '', in: { $cond: [{ $eq: ['$$value', ''] }, '$$this', { $concat: ['$$value', ';', '$$this'] }] } } },
          },
          '$_fieldsObj',
        ],
      },
    },
  },
];
