const { faker } = require('@faker-js/faker');
const softwareCatalog = require('../data/softwareCatalog');

const supportEscalationContacts = [
  { level: 'L1', team: 'IT Helpdesk', email: 'helpdesk@contoso.com', responseTimeHours: 4 },
  { level: 'L2', team: 'IT Infrastructure', email: 'infra@contoso.com', responseTimeHours: 8 },
  { level: 'L3', team: 'Vendor Support', email: 'vendor-escalation@contoso.com', responseTimeHours: 24 },
];

function pickAppsForDepartment(department) {
  const allApps = softwareCatalog.filter(
    (app) => app.departments === 'ALL' || (Array.isArray(app.departments) && app.departments.includes(department))
  );
  // Always include ALL + 2-4 department-specific apps
  const deptSpecific = allApps.filter((a) => a.departments !== 'ALL');
  const universal = allApps.filter((a) => a.departments === 'ALL');
  const selected = [...universal, ...deptSpecific.slice(0, faker.number.int({ min: 2, max: 4 }))];
  return selected;
}

function generateService(employee, app, serviceIndex) {
  const startDate = new Date(employee.workInfo.startDate);
  const assignedDate = new Date(startDate);
  assignedDate.setDate(assignedDate.getDate() + faker.number.int({ min: 0, max: 3 }));

  const weeklyBreakdown = Array.from({ length: 8 }, (_, i) => {
    const weekOf = new Date(assignedDate);
    weekOf.setDate(weekOf.getDate() + i * 7);
    return {
      weekOf: weekOf.toISOString().split('T')[0],
      logins: faker.number.int({ min: 0, max: 25 }),
      dataTransferMb: faker.number.float({ min: 0, max: 500, fractionDigits: 2 }),
      errorsCount: faker.number.int({ min: 0, max: 5 }),
      // Level 5: details
      details: {
        peakUsageHour: `${faker.number.int({ min: 8, max: 17 })}:00`,
        mostUsedFeature: faker.helpers.arrayElement(app.features || ['Core']),
        sessionTimeoutCount: faker.number.int({ min: 0, max: 3 }),
        deviceType: faker.helpers.arrayElement(['Laptop', 'Mobile', 'Desktop']),
      },
    };
  });

  return {
    serviceId: `SVC-${String(serviceIndex).padStart(6, '0')}`,
    employeeId: employee.employeeId,
    employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
    department: employee.workInfo.department,
    status: 'Active',
    assignedDate: assignedDate.toISOString().split('T')[0],
    removedDate: null,
    deploymentMethod: faker.helpers.arrayElement(['Intune', 'SCCM', 'Manual', 'Self-Service Portal']),
    // Level 2: application
    application: {
      appId: app.appId,
      name: app.name,
      vendor: app.vendor,
      version: faker.system.semver(),
      category: app.category,
      licenseType: app.licenseType,
      licensePool: app.licensePool,
      // Level 3: provider
      provider: {
        vendorName: app.vendor,
        supportTier: app.supportTier,
        contactEmail: `support@${app.vendor.toLowerCase().replace(/\s/g, '')}.com`,
        accountManager: faker.person.fullName(),
        contractRenewalDate: faker.date.future({ years: 2 }).toISOString().split('T')[0],
        // Level 4: support
        support: {
          portalUrl: `https://support.${app.vendor.toLowerCase().replace(/\s/g, '')}.com`,
          ticketPrefix: app.vendor.substring(0, 3).toUpperCase(),
          slaResponseHours: faker.helpers.arrayElement([1, 4, 8, 24]),
          // Level 5: escalation
          escalation: {
            contacts: supportEscalationContacts,
            escalationPolicy: 'Follow runbook: SharePoint/IT/Runbooks/VendorEscalation',
            lastEscalationDate: faker.datatype.boolean({ probability: 0.1 })
              ? faker.date.recent({ days: 180 }).toISOString().split('T')[0]
              : null,
          },
        },
      },
    },
    // Level 2: subscription
    subscription: {
      licenseId: `LIC-${app.appId}-${String(faker.number.int({ min: 1000, max: 9999 }))}`,
      assignedSeat: employee.workInfo.workEmail,
      seatType: app.licenseType,
      costPerSeatUsd: app.costPerSeatUsd,
      billingCycle: app.billingCycle,
      expiryDate: faker.date.future({ years: 1 }).toISOString().split('T')[0],
      autoRenew: true,
      // Level 3: plan
      plan: {
        planName: `${app.name} - ${app.supportTier}`,
        tier: app.supportTier,
        costPerSeatUsd: app.costPerSeatUsd,
        // Level 4: features
        features: (app.features || []).map((f) => ({
          featureName: f,
          enabled: true,
          enabledDate: assignedDate.toISOString().split('T')[0],
          // Level 5: limits
          limits: {
            maxStorage: app.limits?.maxStorage || 'Unlimited',
            maxUsers: app.limits?.maxUsers || 'Unlimited',
            apiCallsPerDay: app.limits?.apiCallsPerDay || 'Unlimited',
            rateLimitPolicy: 'Standard',
          },
        })),
      },
    },
    // Level 2: usage
    usage: {
      lastActiveDate: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
      isActive: true,
      totalLogins: faker.number.int({ min: 10, max: 500 }),
      avgSessionMinutes: faker.number.float({ min: 5, max: 120, fractionDigits: 1 }),
      // Level 3: metrics
      metrics: {
        loginCount30d: faker.number.int({ min: 5, max: 60 }),
        dataTransferMb30d: faker.number.float({ min: 10, max: 2000, fractionDigits: 2 }),
        errorRate: faker.number.float({ min: 0, max: 5, fractionDigits: 2 }),
        // Level 4: breakdown (weekly)
        breakdown: weeklyBreakdown,
      },
    },
    // Level 2: compliance
    compliance: {
      lastAuditDate: faker.date.recent({ days: 90 }).toISOString().split('T')[0],
      auditStatus: faker.helpers.weightedArrayElement([
        { weight: 90, value: 'Compliant' },
        { weight: 8, value: 'Warning' },
        { weight: 2, value: 'Non-Compliant' },
      ]),
      usageTracked: true,
      dataClassification: faker.helpers.arrayElement(['Public', 'Internal', 'Confidential', 'Restricted']),
    },
    metadata: {
      createdAt: assignedDate.toISOString(),
      updatedAt: faker.date.recent({ days: 30 }).toISOString(),
      recordVersion: faker.number.int({ min: 1, max: 5 }),
    },
  };
}

function generateServicesForEmployee(employee, startingIndex) {
  const apps = pickAppsForDepartment(employee.workInfo.department);
  return apps.map((app, i) => generateService(employee, app, startingIndex + i));
}

module.exports = { generateServicesForEmployee };
