const { faker } = require('@faker-js/faker');

const onboardingTaskTemplates = [
  { taskId: 'ONB-001', category: 'Identity & Access', taskName: 'Active Directory Account Creation', assignedTo: 'IT Helpdesk' },
  { taskId: 'ONB-002', category: 'Identity & Access', taskName: 'MFA Enrollment', assignedTo: 'Employee' },
  { taskId: 'ONB-003', category: 'Identity & Access', taskName: 'SSO Profile Setup', assignedTo: 'IT Helpdesk' },
  { taskId: 'ONB-004', category: 'Hardware', taskName: 'Laptop Provisioned and Shipped', assignedTo: 'IT Helpdesk' },
  { taskId: 'ONB-005', category: 'Hardware', taskName: 'Monitor & Peripherals Assigned', assignedTo: 'IT Helpdesk' },
  { taskId: 'ONB-006', category: 'HR Compliance', taskName: 'I-9 Verification', assignedTo: 'HR' },
  { taskId: 'ONB-007', category: 'HR Compliance', taskName: 'Background Check Cleared', assignedTo: 'HR' },
  { taskId: 'ONB-008', category: 'HR Compliance', taskName: 'Employment Contract Signed', assignedTo: 'Employee' },
  { taskId: 'ONB-009', category: 'Training', taskName: 'Security Awareness Training', assignedTo: 'Employee' },
  { taskId: 'ONB-010', category: 'Training', taskName: 'Code of Conduct Acknowledged', assignedTo: 'Employee' },
  { taskId: 'ONB-011', category: 'Training', taskName: 'IT Acceptable Use Policy', assignedTo: 'Employee' },
  { taskId: 'ONB-012', category: 'Training', taskName: 'HIPAA / Data Privacy Training', assignedTo: 'Employee' },
  { taskId: 'ONB-013', category: 'Access Provisioning', taskName: 'VPN Access Granted', assignedTo: 'IT Helpdesk' },
  { taskId: 'ONB-014', category: 'Access Provisioning', taskName: 'Email Account Created', assignedTo: 'IT Helpdesk' },
  { taskId: 'ONB-015', category: 'Access Provisioning', taskName: 'ERP System Access', assignedTo: 'IT Helpdesk' },
];

const trainingPlatforms = ['KnowBe4', 'Workday Learning', 'LinkedIn Learning', 'Coursera for Business', 'SAP SuccessFactors'];

function generateOnboarding(employee, index) {
  const startDate = new Date(employee.workInfo.startDate);
  const prepDate = new Date(startDate);
  prepDate.setDate(prepDate.getDate() - 5);
  const completedDate = new Date(startDate);
  completedDate.setDate(completedDate.getDate() + 10);

  const batchMonth = startDate.toLocaleString('default', { month: 'short' }).toUpperCase();
  const batchYear = startDate.getFullYear();
  const batchQuarter = Math.ceil((startDate.getMonth() + 1) / 3);

  // Build phases with 5-level nesting
  const phases = [
    {
      phaseId: 'PHASE-01',
      phaseName: 'Pre-Boarding',
      startDate: prepDate.toISOString().split('T')[0],
      endDate: employee.workInfo.startDate,
      status: 'Completed',
      // Level 3: tasks
      tasks: onboardingTaskTemplates.slice(0, 3).map((t) => ({
        ...t,
        status: 'Completed',
        dueDate: prepDate.toISOString().split('T')[0],
        completedDate: prepDate.toISOString().split('T')[0],
        notes: faker.lorem.sentence(),
        // Level 4: subtasks
        subtasks: [
          {
            subtaskId: `${t.taskId}-ST-01`,
            name: `Verify ${t.taskName} prerequisites`,
            completedDate: prepDate.toISOString().split('T')[0],
            completedBy: 'IT Helpdesk',
            // Level 5: checklist
            checklist: {
              totalItems: faker.number.int({ min: 3, max: 6 }),
              completedItems: faker.number.int({ min: 3, max: 6 }),
              lastUpdated: prepDate.toISOString(),
              approvedBy: faker.person.fullName(),
            },
          },
        ],
      })),
    },
    {
      phaseId: 'PHASE-02',
      phaseName: 'Week 1 - Identity & Hardware',
      startDate: employee.workInfo.startDate,
      endDate: new Date(startDate.getTime() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Completed',
      tasks: onboardingTaskTemplates.slice(3, 8).map((t) => ({
        ...t,
        status: 'Completed',
        dueDate: new Date(startDate.getTime() + 3 * 86400000).toISOString().split('T')[0],
        completedDate: new Date(startDate.getTime() + 2 * 86400000).toISOString().split('T')[0],
        notes: faker.lorem.sentence(),
        subtasks: [
          {
            subtaskId: `${t.taskId}-ST-01`,
            name: `${t.taskName} - initial setup`,
            completedDate: new Date(startDate.getTime() + 1 * 86400000).toISOString().split('T')[0],
            completedBy: t.assignedTo,
            checklist: {
              totalItems: faker.number.int({ min: 3, max: 8 }),
              completedItems: faker.number.int({ min: 3, max: 8 }),
              lastUpdated: new Date(startDate.getTime() + 1 * 86400000).toISOString(),
              approvedBy: faker.person.fullName(),
            },
          },
        ],
      })),
    },
    {
      phaseId: 'PHASE-03',
      phaseName: 'Week 2 - Training & Compliance',
      startDate: new Date(startDate.getTime() + 7 * 86400000).toISOString().split('T')[0],
      endDate: completedDate.toISOString().split('T')[0],
      status: 'Completed',
      tasks: onboardingTaskTemplates.slice(8).map((t) => ({
        ...t,
        status: 'Completed',
        dueDate: completedDate.toISOString().split('T')[0],
        completedDate: new Date(completedDate.getTime() - 2 * 86400000).toISOString().split('T')[0],
        notes: faker.lorem.sentence(),
        subtasks: [
          {
            subtaskId: `${t.taskId}-ST-01`,
            name: `Complete ${t.taskName} module`,
            completedDate: new Date(completedDate.getTime() - 3 * 86400000).toISOString().split('T')[0],
            completedBy: 'Employee',
            checklist: {
              totalItems: faker.number.int({ min: 2, max: 5 }),
              completedItems: faker.number.int({ min: 2, max: 5 }),
              lastUpdated: new Date(completedDate.getTime() - 3 * 86400000).toISOString(),
              approvedBy: faker.person.fullName(),
            },
          },
        ],
      })),
    },
  ];

  return {
    onboardingId: `ONB-${String(index + 1).padStart(5, '0')}`,
    employeeId: employee.employeeId,
    employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
    department: employee.workInfo.department,
    status: 'Completed',
    onboardingBatch: `${batchYear}-Q${batchQuarter}-${batchMonth}`,
    startedDate: prepDate.toISOString().split('T')[0],
    completedDate: completedDate.toISOString().split('T')[0],
    // Level 2: hrContact
    hrContact: {
      name: faker.person.fullName(),
      email: `${faker.internet.userName().toLowerCase()}@contoso.com`,
      phone: faker.phone.number(),
    },
    // Level 2: assignedBuddy
    assignedBuddy: {
      employeeId: `EMP-${faker.number.int({ min: 2018, max: 2023 })}-${String(faker.number.int({ min: 1, max: 200 })).padStart(5, '0')}`,
      name: faker.person.fullName(),
      email: `${faker.internet.userName().toLowerCase()}@contoso.com`,
    },
    // Level 2: phases (contains level 3 tasks > level 4 subtasks > level 5 checklist)
    phases,
    // Level 2: training
    training: {
      platform: faker.helpers.arrayElement(trainingPlatforms),
      // Level 3: modules
      modules: [
        {
          moduleId: 'MOD-001',
          moduleName: 'Security Awareness',
          completedDate: completedDate.toISOString().split('T')[0],
          durationMinutes: faker.number.int({ min: 30, max: 90 }),
          // Level 4: assessment
          assessment: {
            score: faker.number.int({ min: 70, max: 100 }),
            passingScore: 70,
            attempts: faker.number.int({ min: 1, max: 3 }),
            passed: true,
            // Level 5: questions (summary)
            questions: {
              total: 20,
              correct: faker.number.int({ min: 14, max: 20 }),
              categories: ['Phishing', 'Password Policy', 'Data Handling', 'Social Engineering'],
              hardestCategory: faker.helpers.arrayElement(['Phishing', 'Social Engineering']),
            },
          },
        },
        {
          moduleId: 'MOD-002',
          moduleName: 'Code of Conduct',
          completedDate: completedDate.toISOString().split('T')[0],
          durationMinutes: faker.number.int({ min: 20, max: 60 }),
          assessment: {
            score: faker.number.int({ min: 80, max: 100 }),
            passingScore: 80,
            attempts: 1,
            passed: true,
            questions: {
              total: 15,
              correct: faker.number.int({ min: 12, max: 15 }),
              categories: ['Workplace Conduct', 'Anti-Harassment', 'Conflicts of Interest'],
              hardestCategory: 'Conflicts of Interest',
            },
          },
        },
      ],
    },
    // Level 2: accessProvisioning
    accessProvisioning: {
      completedDate: new Date(startDate.getTime() + 2 * 86400000).toISOString().split('T')[0],
      // Level 3: systems
      systems: [
        {
          systemName: 'Active Directory',
          provisionedDate: employee.workInfo.startDate,
          status: 'Active',
          // Level 4: roles
          roles: [
            {
              roleName: `${employee.workInfo.department} - Standard User`,
              roleId: `ROLE-${String(faker.number.int({ min: 100, max: 999 }))}`,
              assignedDate: employee.workInfo.startDate,
              // Level 5: permissions
              permissions: [
                { permissionKey: 'read_shared_drives', grantedBy: 'IT Helpdesk', scope: 'Department' },
                { permissionKey: 'send_email', grantedBy: 'IT Helpdesk', scope: 'Global' },
                { permissionKey: 'vpn_access', grantedBy: 'IT Helpdesk', scope: 'Network' },
              ],
            },
          ],
        },
      ],
    },
    metadata: {
      createdAt: prepDate.toISOString(),
      updatedAt: completedDate.toISOString(),
      recordVersion: 1,
    },
  };
}

module.exports = { generateOnboarding };
