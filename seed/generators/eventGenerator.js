const { faker } = require('@faker-js/faker');

const eventTypes = [
  { type: 'EMPLOYEE_HIRED', module: 'HR', severity: 'INFO' },
  { type: 'ONBOARDING_STARTED', module: 'HR', severity: 'INFO' },
  { type: 'ONBOARDING_COMPLETED', module: 'HR', severity: 'INFO' },
  { type: 'DEVICE_ASSIGNED', module: 'IT', severity: 'INFO' },
  { type: 'DEVICE_RETURNED', module: 'IT', severity: 'INFO' },
  { type: 'SERVICE_PROVISIONED', module: 'IT', severity: 'INFO' },
  { type: 'SERVICE_DEPROVISIONED', module: 'IT', severity: 'WARNING' },
  { type: 'ACCESS_GRANTED', module: 'IT', severity: 'INFO' },
  { type: 'ACCESS_REVOKED', module: 'IT', severity: 'WARNING' },
  { type: 'LICENSE_RENEWED', module: 'IT', severity: 'INFO' },
  { type: 'LICENSE_EXPIRED', module: 'IT', severity: 'WARNING' },
  { type: 'COMPLIANCE_VIOLATION', module: 'Security', severity: 'CRITICAL' },
  { type: 'PASSWORD_RESET', module: 'IT', severity: 'INFO' },
  { type: 'MFA_ENROLLED', module: 'Security', severity: 'INFO' },
  { type: 'OFFBOARDING_INITIATED', module: 'HR', severity: 'WARNING' },
  { type: 'OFFBOARDING_COMPLETED', module: 'HR', severity: 'INFO' },
  { type: 'ROLE_CHANGED', module: 'HR', severity: 'INFO' },
  { type: 'DEPARTMENT_TRANSFER', module: 'HR', severity: 'INFO' },
  { type: 'TRAINING_COMPLETED', module: 'HR', severity: 'INFO' },
  { type: 'POLICY_ACKNOWLEDGED', module: 'Compliance', severity: 'INFO' },
];

const sourceSystems = ['WorkdayHRIS', 'ServiceNow', 'MicrosoftIntune', 'ActiveDirectory', 'OktaSSO', 'CrowdStrikeFalcon', 'HRPortal'];

function generateEvent(employee, eventTemplate, eventIndex, occurredAt) {
  const relatedEntityType = faker.helpers.arrayElement(['onboarding', 'offboarding', 'device', 'service', 'employee']);
  const relatedEntityId = `${relatedEntityType.toUpperCase()}-${String(faker.number.int({ min: 1, max: 99999 })).padStart(5, '0')}`;

  const sourceSystem = faker.helpers.arrayElement(sourceSystems);
  const performedBySystem = faker.datatype.boolean({ probability: 0.6 });

  return {
    eventId: `EVT-${String(eventIndex).padStart(7, '0')}`,
    employeeId: employee.employeeId,
    employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
    department: employee.workInfo.department,
    eventType: eventTemplate.type,
    occurredAt: occurredAt.toISOString(),
    // Level 2: eventInfo
    eventInfo: {
      title: eventTemplate.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      description: faker.lorem.sentence(),
      severity: eventTemplate.severity,
      module: eventTemplate.module,
      // Level 3: context
      context: {
        environment: faker.helpers.arrayElement(['Production', 'Staging', 'Development']),
        region: faker.helpers.arrayElement(['us-east-1', 'eu-west-1', 'ap-south-1', 'au-east-1']),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        // Level 4: trigger
        trigger: {
          initiatedBy: performedBySystem ? sourceSystem : faker.person.fullName(),
          triggerType: performedBySystem ? 'Automated' : 'Manual',
          workflowId: `WF-${faker.string.alphanumeric(8).toUpperCase()}`,
          // Level 5: metadata
          metadata: {
            correlationId: faker.string.uuid(),
            traceId: faker.string.uuid(),
            spanId: faker.string.alphanumeric(16).toLowerCase(),
            sdkVersion: `v${faker.system.semver()}`,
          },
        },
      },
    },
    // Level 2: payload
    payload: {
      relatedEntityType,
      relatedEntityId,
      summary: faker.lorem.sentence(),
      // Level 3: changes
      changes: [
        {
          field: faker.helpers.arrayElement(['status', 'accessLevel', 'department', 'licenseId', 'deviceAssigned']),
          oldValue: faker.helpers.arrayElement(['Active', 'Inactive', 'Pending', null]),
          newValue: faker.helpers.arrayElement(['Active', 'Completed', 'Revoked', 'Provisioned']),
          changedAt: occurredAt.toISOString(),
          // Level 4: validation
          validation: {
            ruleSetId: `RULESET-${faker.number.int({ min: 1, max: 20 })}`,
            passed: faker.datatype.boolean({ probability: 0.95 }),
            // Level 5: rules
            rules: [
              {
                ruleId: `RULE-${faker.number.int({ min: 100, max: 999 })}`,
                ruleName: faker.helpers.arrayElement(['RequiredFieldCheck', 'AccessPolicyCheck', 'ComplianceCheck', 'DuplicateCheck']),
                passed: faker.datatype.boolean({ probability: 0.95 }),
                message: faker.datatype.boolean({ probability: 0.9 }) ? 'OK' : faker.lorem.sentence(),
              },
            ],
          },
        },
      ],
    },
    // Level 2: audit
    audit: {
      performedBy: performedBySystem ? sourceSystem : faker.person.fullName(),
      performedByType: performedBySystem ? 'System' : 'Human',
      sourceSystem,
      // Level 3: approval
      approval: {
        required: faker.datatype.boolean({ probability: 0.3 }),
        status: faker.helpers.arrayElement(['Approved', 'Auto-Approved', 'Not Required']),
        approvedAt: occurredAt.toISOString(),
        // Level 4: reviewer
        reviewer: {
          name: faker.person.fullName(),
          email: `${faker.internet.userName().toLowerCase()}@contoso.com`,
          role: faker.helpers.arrayElement(['IT Manager', 'HR Manager', 'Security Officer', 'System']),
          // Level 5: credentials
          credentials: {
            authMethod: faker.helpers.arrayElement(['SSO', 'MFA', 'Certificate', 'ServiceAccount']),
            sessionId: faker.string.uuid(),
            mfaVerified: faker.datatype.boolean({ probability: 0.8 }),
            privilegedAccess: faker.datatype.boolean({ probability: 0.2 }),
          },
        },
      },
    },
    metadata: {
      processedAt: new Date(occurredAt.getTime() + faker.number.int({ min: 100, max: 5000 })).toISOString(),
      recordVersion: 1,
      ttlDays: 365,
    },
  };
}

function generateEventsForEmployee(employee, startingIndex) {
  const events = [];
  const startDate = new Date(employee.workInfo.startDate);

  // Generate 10-15 events per employee spread across their tenure
  const eventCount = faker.number.int({ min: 10, max: 15 });
  // Always start with EMPLOYEE_HIRED and ONBOARDING_STARTED
  const mandatoryEvents = [
    { template: eventTypes.find((e) => e.type === 'EMPLOYEE_HIRED'), offset: -5 },
    { template: eventTypes.find((e) => e.type === 'ONBOARDING_STARTED'), offset: -4 },
    { template: eventTypes.find((e) => e.type === 'DEVICE_ASSIGNED'), offset: 0 },
    { template: eventTypes.find((e) => e.type === 'SERVICE_PROVISIONED'), offset: 1 },
    { template: eventTypes.find((e) => e.type === 'MFA_ENROLLED'), offset: 0 },
    { template: eventTypes.find((e) => e.type === 'ONBOARDING_COMPLETED'), offset: 10 },
  ];

  mandatoryEvents.forEach(({ template, offset }, i) => {
    const occurredAt = new Date(startDate);
    occurredAt.setDate(occurredAt.getDate() + offset);
    events.push(generateEvent(employee, template, startingIndex + i, occurredAt));
  });

  // Random additional events
  const remainingCount = eventCount - mandatoryEvents.length;
  for (let i = 0; i < remainingCount; i++) {
    const template = faker.helpers.arrayElement(eventTypes.filter((e) => !['EMPLOYEE_HIRED', 'ONBOARDING_STARTED', 'ONBOARDING_COMPLETED'].includes(e.type)));
    const occurredAt = new Date(startDate);
    occurredAt.setDate(occurredAt.getDate() + faker.number.int({ min: 15, max: 365 }));
    events.push(generateEvent(employee, template, startingIndex + mandatoryEvents.length + i, occurredAt));
  }

  return events;
}

module.exports = { generateEventsForEmployee };
