const express = require('express');
const router = express.Router();
const { getDB } = require('../../config/db');

// Employees has no top-level arrays — only nested objects.
// One endpoint returns all fields fully flattened via $project.

const pipeline = [
  {
    $project: {
      _id: 0,
      // Identity
      employeeId:          1,
      status:              1,
      // Personal — level 2-5
      firstName:           '$personalInfo.firstName',
      lastName:            '$personalInfo.lastName',
      preferredName:       '$personalInfo.preferredName',
      dateOfBirth:         '$personalInfo.dateOfBirth',
      personalEmail:       '$personalInfo.personalEmail',
      phoneNumber:         '$personalInfo.phoneNumber',
      homeCity:            '$personalInfo.address.city',
      homeCountry:         '$personalInfo.address.country',
      homePostalCode:      '$personalInfo.address.postalCode',
      coordLat:            '$personalInfo.address.coordinates.lat',
      coordLng:            '$personalInfo.address.coordinates.lng',
      coordAccuracy:       '$personalInfo.address.coordinates.precision.accuracy',
      coordSource:         '$personalInfo.address.coordinates.precision.source',
      coordVerifiedBy:     '$personalInfo.address.coordinates.precision.verifiedBy',
      // Work — level 2-5
      workEmail:           '$workInfo.workEmail',
      jobTitle:            '$workInfo.title',
      department:          '$workInfo.department',
      subDepartment:       '$workInfo.subDepartment',
      costCenter:          '$workInfo.costCenter',
      businessUnit:        '$workInfo.businessUnit',
      employmentType:      '$workInfo.employmentType',
      employmentStatus:    '$workInfo.employmentStatus',
      startDate:           '$workInfo.startDate',
      endDate:             '$workInfo.endDate',
      managerName:         '$workInfo.manager.name',
      managerEmail:        '$workInfo.manager.email',
      managerTitle:        '$workInfo.manager.title',
      managerPhone:        '$workInfo.manager.contact.phone',
      managerChannel:      '$workInfo.manager.contact.preferredChannel.type',
      siteCode:            '$workInfo.location.siteCode',
      officeCity:          '$workInfo.location.city',
      officeCountry:       '$workInfo.location.country',
      remoteStatus:        '$workInfo.location.remoteStatus',
      floor:               '$workInfo.location.building.floor',
      wing:                '$workInfo.location.building.wing',
      deskNumber:          '$workInfo.location.building.deskNumber',
      zone:                '$workInfo.location.building.floorPlan.zone',
      nearestMeetingRoom:  '$workInfo.location.building.floorPlan.nearestMeetingRoom',
      parkingBay:          '$workInfo.location.building.floorPlan.parkingBay',
      // Compensation — level 2-5
      currency:            '$compensation.currency',
      annualBaseSalary:    '$compensation.structure.annualBaseSalary',
      annualBonusTarget:   '$compensation.structure.annualBonusTarget',
      salaryBand:          '$compensation.structure.components.details.salaryBand',
      salaryApprovedBy:    '$compensation.structure.components.details.approvedBy',
      lastReviewDate:      '$compensation.structure.components.details.lastReviewDate',
      // Metadata
      createdAt:           '$metadata.createdAt',
      updatedAt:           '$metadata.updatedAt',
      dataSource:          '$metadata.dataSource',
    },
  },
];

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
    const skip  = parseInt(req.query.skip) || 0;
    const pagedPipeline = [...pipeline, ...(skip ? [{ $skip: skip }] : []), { $limit: limit }];

    const start = process.hrtime.bigint();
    const data = await getDB().collection('employees').aggregate(pagedPipeline).toArray();
    const totalTimeMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);

    res.json({
      meta: {
        endpoint:        '/api/split/employees',
        description:     'One row per employee — all nested objects flattened, no arrays',
        joinKey:         'employeeId',
        limit,
        skip,
        recordsReturned: data.length,
        totalTimeMs,
      },
      data,
    });
  } catch (err) { next(err); }
});

module.exports = router;
