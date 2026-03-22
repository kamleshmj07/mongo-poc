const { faker } = require('@faker-js/faker');
const departments = require('../data/departments');
const locations = require('../data/locations');

function generateEmployee(index) {
  const dept = departments[index % departments.length];
  const subDept = dept.subDepartments[index % dept.subDepartments.length];
  const location = locations[index % locations.length];
  const floor = location.floors[index % location.floors.length];
  const wing = location.wings[index % location.wings.length];
  const startYear = 2018 + (index % 7);
  const employeeId = `EMP-${startYear}-${String(index + 1).padStart(5, '0')}`;

  return {
    employeeId,
    status: 'Active',
    // Level 2: personalInfo
    personalInfo: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      preferredName: faker.person.firstName(),
      dateOfBirth: faker.date.birthdate({ min: 25, max: 55, mode: 'age' }).toISOString().split('T')[0],
      nationalIdLast4: faker.string.numeric(4),
      personalEmail: faker.internet.email(),
      phoneNumber: faker.phone.number(),
      // Level 3: address
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        stateProvince: faker.location.state(),
        postalCode: faker.location.zipCode(),
        country: faker.location.countryCode('alpha-3'),
        // Level 4: coordinates
        coordinates: {
          lat: parseFloat(faker.location.latitude()),
          lng: parseFloat(faker.location.longitude()),
          // Level 5: precision metadata
          precision: {
            accuracy: faker.helpers.arrayElement(['high', 'medium', 'low']),
            source: faker.helpers.arrayElement(['GPS', 'IP', 'Manual', 'PostalCode']),
            lastVerified: faker.date.recent({ days: 180 }).toISOString(),
            verifiedBy: faker.helpers.arrayElement(['HRSystem', 'Employee', 'Admin']),
          },
        },
      },
      emergencyContact: {
        name: faker.person.fullName(),
        relationship: faker.helpers.arrayElement(['Spouse', 'Parent', 'Sibling', 'Friend']),
        phone: faker.phone.number(),
      },
    },
    // Level 2: workInfo
    workInfo: {
      workEmail: `${faker.internet.userName().toLowerCase()}@contoso.com`,
      title: faker.person.jobTitle(),
      department: dept.name,
      subDepartment: subDept,
      costCenter: dept.costCenter,
      businessUnit: dept.businessUnit,
      employmentType: faker.helpers.weightedArrayElement([
        { weight: 75, value: 'Full-Time' },
        { weight: 15, value: 'Contract' },
        { weight: 10, value: 'Part-Time' },
      ]),
      employmentStatus: 'Active',
      startDate: `${startYear}-${String(faker.number.int({ min: 1, max: 12 })).padStart(2, '0')}-${String(faker.number.int({ min: 1, max: 28 })).padStart(2, '0')}`,
      endDate: null,
      // Level 3: manager
      manager: {
        employeeId: `EMP-${startYear - 1}-${String(faker.number.int({ min: 1, max: 50 })).padStart(5, '0')}`,
        name: faker.person.fullName(),
        email: `${faker.internet.userName().toLowerCase()}@contoso.com`,
        title: faker.person.jobTitle(),
        // Level 4: contact
        contact: {
          phone: faker.phone.number(),
          officeLocation: location.siteCode,
          // Level 5: preferredChannel
          preferredChannel: {
            type: faker.helpers.arrayElement(['Teams', 'Email', 'Slack', 'Phone']),
            availableHours: '09:00-17:00',
            timezone: location.timezone,
            doNotDisturbAfter: '18:00',
          },
        },
      },
      // Level 3: location
      location: {
        siteCode: location.siteCode,
        buildingName: location.buildingName,
        city: location.city,
        country: location.country,
        timezone: location.timezone,
        remoteStatus: faker.helpers.arrayElement(['On-Site', 'Hybrid', 'Remote']),
        // Level 4: building
        building: {
          floor,
          wing,
          deskNumber: `${floor}-${wing}-${String(faker.number.int({ min: 1, max: 99 })).padStart(3, '0')}`,
          // Level 5: floorPlan
          floorPlan: {
            zone: faker.helpers.arrayElement(['Open Plan', 'Hot Desk', 'Private Office', 'Shared Office']),
            nearestMeetingRoom: `MR-${floor}${wing}-${faker.number.int({ min: 1, max: 6 })}`,
            accessCardRequired: true,
            parkingBay: faker.datatype.boolean() ? `P${faker.number.int({ min: 1, max: 200 })}` : null,
          },
        },
      },
    },
    // Level 2: compensation
    compensation: {
      currency: location.country === 'GBR' ? 'GBP' : location.country === 'IND' ? 'INR' : location.country === 'AUS' ? 'AUD' : 'USD',
      payFrequency: 'Bi-Weekly',
      // Level 3: structure
      structure: {
        annualBaseSalary: faker.number.int({ min: 45000, max: 200000 }),
        annualBonusTarget: faker.number.int({ min: 5000, max: 40000 }),
        // Level 4: components
        components: {
          base: faker.number.int({ min: 40000, max: 180000 }),
          bonus: faker.number.int({ min: 0, max: 30000 }),
          equity: faker.number.int({ min: 0, max: 50000 }),
          // Level 5: details
          details: {
            effectiveDate: `${startYear}-01-01`,
            lastReviewDate: `${startYear + 1}-01-01`,
            approvedBy: faker.person.fullName(),
            salaryBand: faker.helpers.arrayElement(['Band 1', 'Band 2', 'Band 3', 'Band 4', 'Band 5']),
            notes: faker.helpers.arrayElement(['Annual review adjustment', 'Promotion adjustment', 'Market correction', 'Standard increment']),
          },
        },
      },
    },
    metadata: {
      createdAt: new Date(`${startYear}-01-01`).toISOString(),
      updatedAt: new Date().toISOString(),
      dataSource: 'WorkdayHRIS',
      recordVersion: faker.number.int({ min: 1, max: 10 }),
      createdBy: 'system',
    },
  };
}

module.exports = { generateEmployee };
