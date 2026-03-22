const { faker } = require('@faker-js/faker');

const offboardingTaskTemplates = [
  { taskId: 'OFF-001', category: 'Access Revocation', taskName: 'Disable AD Account', assignedTo: 'IT Helpdesk' },
  { taskId: 'OFF-002', category: 'Access Revocation', taskName: 'Revoke VPN Access', assignedTo: 'IT Helpdesk' },
  { taskId: 'OFF-003', category: 'Access Revocation', taskName: 'Deactivate All Software Licenses', assignedTo: 'IT Helpdesk' },
  { taskId: 'OFF-004', category: 'Access Revocation', taskName: 'Remove from Email Distribution Lists', assignedTo: 'IT Helpdesk' },
  { taskId: 'OFF-005', category: 'Hardware Return', taskName: 'Issue Return Shipping Label', assignedTo: 'IT Helpdesk' },
  { taskId: 'OFF-006', category: 'Hardware Return', taskName: 'Laptop Wiped & Re-imaged', assignedTo: 'IT Helpdesk' },
  { taskId: 'OFF-007', category: 'Hardware Return', taskName: 'Monitor & Peripherals Returned', assignedTo: 'IT Helpdesk' },
  { taskId: 'OFF-008', category: 'HR Compliance', taskName: 'Exit Interview Conducted', assignedTo: 'HR' },
  { taskId: 'OFF-009', category: 'HR Compliance', taskName: 'Final Payroll Processed', assignedTo: 'HR' },
  { taskId: 'OFF-010', category: 'HR Compliance', taskName: 'Benefits Termination Notice', assignedTo: 'HR' },
  { taskId: 'OFF-011', category: 'Knowledge Transfer', taskName: 'Documentation Completed', assignedTo: 'Employee' },
  { taskId: 'OFF-012', category: 'Knowledge Transfer', taskName: 'Handover Meeting with Successor', assignedTo: 'Employee' },
];

const separationTypes = [
  'Voluntary Resignation',
  'Involuntary Termination',
  'Retirement',
  'Contract End',
  'Mutual Separation',
  'Redundancy',
];

function generateOffboarding(employee, index) {
  const startDate = new Date(employee.workInfo.startDate);
  // Offboarded employees left 6-18 months after joining
  const monthsWorked = faker.number.int({ min: 6, max: 36 });
  const lastWorkingDay = new Date(startDate);
  lastWorkingDay.setMonth(lastWorkingDay.getMonth() + monthsWorked);
  const initiatedDate = new Date(lastWorkingDay);
  initiatedDate.setDate(initiatedDate.getDate() - 14);
  const completedDate = new Date(lastWorkingDay);
  completedDate.setDate(completedDate.getDate() + 7);

  const separationType = faker.helpers.arrayElement(separationTypes);

  // Build phases with 5-level nesting
  const phases = [
    {
      phaseId: 'OFF-PHASE-01',
      phaseName: 'Initiation & Notice Period',
      startDate: initiatedDate.toISOString().split('T')[0],
      endDate: lastWorkingDay.toISOString().split('T')[0],
      status: 'Completed',
      // Level 3: tasks
      tasks: offboardingTaskTemplates.slice(7, 10).map((t) => ({
        ...t,
        status: 'Completed',
        dueDate: lastWorkingDay.toISOString().split('T')[0],
        completedDate: new Date(lastWorkingDay.getTime() - 2 * 86400000).toISOString().split('T')[0],
        notes: faker.lorem.sentence(),
        // Level 4: verifications
        verifications: [
          {
            verificationId: `VER-${t.taskId}-01`,
            verifiedBy: faker.person.fullName(),
            verifiedAt: new Date(lastWorkingDay.getTime() - 1 * 86400000).toISOString(),
            method: faker.helpers.arrayElement(['Email Confirmation', 'System Check', 'Manager Sign-off']),
            // Level 5: evidence
            evidence: {
              type: faker.helpers.arrayElement(['Screenshot', 'Email Thread', 'System Log', 'Signed Form']),
              referenceId: `EVD-${faker.string.alphanumeric(8).toUpperCase()}`,
              storedAt: 'SharePoint/Offboarding/Evidence',
              retentionYears: 7,
            },
          },
        ],
      })),
    },
    {
      phaseId: 'OFF-PHASE-02',
      phaseName: 'Access Revocation',
      startDate: lastWorkingDay.toISOString().split('T')[0],
      endDate: new Date(lastWorkingDay.getTime() + 1 * 86400000).toISOString().split('T')[0],
      status: 'Completed',
      tasks: offboardingTaskTemplates.slice(0, 4).map((t) => ({
        ...t,
        status: 'Completed',
        dueDate: lastWorkingDay.toISOString().split('T')[0],
        completedDate: lastWorkingDay.toISOString().split('T')[0],
        notes: `Completed on last working day per standard procedure`,
        verifications: [
          {
            verificationId: `VER-${t.taskId}-01`,
            verifiedBy: 'IT Helpdesk',
            verifiedAt: lastWorkingDay.toISOString(),
            method: 'System Check',
            evidence: {
              type: 'System Log',
              referenceId: `EVD-${faker.string.alphanumeric(8).toUpperCase()}`,
              storedAt: 'ServiceNow/Offboarding/AccessRevocation',
              retentionYears: 3,
            },
          },
        ],
      })),
    },
    {
      phaseId: 'OFF-PHASE-03',
      phaseName: 'Asset Recovery & Knowledge Transfer',
      startDate: lastWorkingDay.toISOString().split('T')[0],
      endDate: completedDate.toISOString().split('T')[0],
      status: 'Completed',
      tasks: offboardingTaskTemplates.slice(4, 7).concat(offboardingTaskTemplates.slice(10)).map((t) => ({
        ...t,
        status: 'Completed',
        dueDate: completedDate.toISOString().split('T')[0],
        completedDate: new Date(completedDate.getTime() - 1 * 86400000).toISOString().split('T')[0],
        notes: faker.lorem.sentence(),
        verifications: [
          {
            verificationId: `VER-${t.taskId}-01`,
            verifiedBy: faker.person.fullName(),
            verifiedAt: completedDate.toISOString(),
            method: 'Manager Sign-off',
            evidence: {
              type: 'Signed Form',
              referenceId: `EVD-${faker.string.alphanumeric(8).toUpperCase()}`,
              storedAt: 'SharePoint/Offboarding/KnowledgeTransfer',
              retentionYears: 5,
            },
          },
        ],
      })),
    },
  ];

  return {
    offboardingId: `OFF-${String(index + 1).padStart(5, '0')}`,
    employeeId: employee.employeeId,
    employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
    department: employee.workInfo.department,
    separationType,
    status: 'Completed',
    initiatedDate: initiatedDate.toISOString().split('T')[0],
    lastWorkingDay: lastWorkingDay.toISOString().split('T')[0],
    completedDate: completedDate.toISOString().split('T')[0],
    exitInterviewCompleted: faker.datatype.boolean({ probability: 0.85 }),
    exitInterviewDate: new Date(lastWorkingDay.getTime() - 3 * 86400000).toISOString().split('T')[0],
    // Level 2: hrContact
    hrContact: {
      name: faker.person.fullName(),
      email: `${faker.internet.userName().toLowerCase()}@contoso.com`,
    },
    // Level 2: phases (level 3 tasks > level 4 verifications > level 5 evidence)
    phases,
    // Level 2: assetReturn
    assetReturn: {
      status: 'Completed',
      returnDeadline: completedDate.toISOString().split('T')[0],
      // Level 3: devices
      devices: [
        {
          serialNumber: `LT-${faker.string.alphanumeric(8).toUpperCase()}`,
          assetTag: `ASSET-${faker.number.int({ min: 1000, max: 9999 })}`,
          deviceType: 'Laptop',
          returnedDate: completedDate.toISOString().split('T')[0],
          trackingNumber: faker.string.alphanumeric(12).toUpperCase(),
          // Level 4: condition
          condition: {
            grade: faker.helpers.arrayElement(['A', 'B', 'C', 'D']),
            physicalDamage: faker.datatype.boolean({ probability: 0.15 }),
            notes: faker.lorem.sentence(),
            // Level 5: assessment
            assessment: {
              assessedBy: faker.person.fullName(),
              assessedDate: completedDate.toISOString().split('T')[0],
              refurbishmentRequired: faker.datatype.boolean({ probability: 0.2 }),
              estimatedRepairCostUsd: faker.datatype.boolean() ? faker.number.int({ min: 0, max: 500 }) : 0,
              disposition: faker.helpers.arrayElement(['Reassign', 'Refurbish', 'Recycle', 'Storage']),
            },
          },
        },
      ],
    },
    // Level 2: knowledgeTransfer
    knowledgeTransfer: {
      documentationCompleted: true,
      completedDate: new Date(lastWorkingDay.getTime() - 2 * 86400000).toISOString().split('T')[0],
      handoverTo: {
        employeeId: `EMP-${faker.number.int({ min: 2019, max: 2024 })}-${String(faker.number.int({ min: 1, max: 500 })).padStart(5, '0')}`,
        name: faker.person.fullName(),
        email: `${faker.internet.userName().toLowerCase()}@contoso.com`,
      },
      // Level 3: areas
      areas: ['System Access Credentials', 'Project Documentation', 'Client Contacts', 'Ongoing Tasks'].map((area, i) => ({
        areaId: `KT-AREA-${String(i + 1).padStart(2, '0')}`,
        area,
        status: 'Completed',
        // Level 4: documents
        documents: [
          {
            docId: `KT-DOC-${String(i + 1).padStart(3, '0')}`,
            title: `${area} Handover Document`,
            location: `SharePoint/KnowledgeTransfer/${employee.employeeId}`,
            // Level 5: versions
            versions: [
              {
                versionNo: '1.0',
                updatedAt: new Date(lastWorkingDay.getTime() - 5 * 86400000).toISOString(),
                updatedBy: employee.personalInfo.firstName,
                changeLog: 'Initial draft',
              },
              {
                versionNo: '1.1',
                updatedAt: new Date(lastWorkingDay.getTime() - 2 * 86400000).toISOString(),
                updatedBy: employee.personalInfo.firstName,
                changeLog: 'Added missing sections per manager review',
              },
            ],
          },
        ],
      })),
    },
    // Level 2: finalPayroll
    finalPayroll: {
      finalPayDate: new Date(lastWorkingDay.getTime() + 14 * 86400000).toISOString().split('T')[0],
      accrualsPaidOut: true,
      severanceEligible: separationType === 'Redundancy' || separationType === 'Involuntary Termination',
      severanceWeeks: separationType === 'Redundancy' ? faker.number.int({ min: 4, max: 26 }) : 0,
    },
    metadata: {
      createdAt: initiatedDate.toISOString(),
      updatedAt: completedDate.toISOString(),
      recordVersion: 2,
    },
  };
}

module.exports = { generateOffboarding };
