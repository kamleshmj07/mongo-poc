// v2 approach — MongoDB aggregation pipeline
// $unwind services[], pivot fields[] via $arrayToObject, merge into one flat doc.

module.exports = [
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
            docType:         '$docType',
            unit:            '$unit',
            createdBy:       '$createdBy',
            createdAt:       '$createdAt',
            updatedAt:       '$updatedAt',
            // Employee
            commonName:      '$offboard.employee.CommonName',
            upn:             '$offboard.employee.userPrincipalName',
            department:      '$offboard.employee.Department',
            jobTitle:        '$offboard.employee.JobTitle',
            costCenter:      '$offboard.employee.CostCenter',
            location:        '$offboard.employee.Location',
            hireDate:        '$offboard.employee.HireDate',
            country:         '$offboard.employee.Country',
            legalEntity:     '$offboard.employee.LegalEntity',
            // Offboard details
            terminationType: '$offboard.terminationType',
            lastWorkingDay:  '$offboard.lastWorkingDay',
            // Manager
            managerUpn:      '$offboard.employee.ManagerUserPrincipalName',
            managerName:     '$offboard.employee.ManagerName',
            grandMgrUpn:     '$offboard.employee.GrandManagerUserPrincipalName',
            grandMgrName:    '$offboard.employee.GrandManagerName',
            // Requester
            requesterUpn:    '$requester.userPrincipalName',
            requesterName:   '$requester.CommonName',
            // Company
            companyName:     '$company.Name',
            companyCountry:  '$company.Country',
            companyRegion:   '$company.Region',
            currency:        '$company.Currency',
            // Workflow
            wfStatus:        '$workflow.Status',
            wfSta:           '$workflow.Sta',
            allDone:         '$allSvcSta.allDone',
            // Service
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
];
