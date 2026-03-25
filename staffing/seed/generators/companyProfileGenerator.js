const { faker } = require('@faker-js/faker');
const { ObjectId } = require('mongodb');

const WF_ROLES = [
  'HRM', 'HRSSC', 'HRSSC_Payroll', 'HRSSC_Admin', 'HRSSC_Benefits',
  'HRSSC_Staffing', 'HR', 'HR_Staffing', 'LOCALIT', 'Admin',
  'BA', 'FIN', 'Fin_SAP', 'BUHR', 'GM', 'EA_Admin', 'InternalControl',
  'Communication', 'Manager',
];
const ACL_ROLES = ['ApprovalFormAuthor', 'Author', 'KeyUser', 'SuperReader'];

function makeEmail(domain) {
  return `${faker.person.firstName().toLowerCase()}.${faker.person.lastName().toLowerCase()}@${domain}`;
}

module.exports = function generateCompanyProfile(company) {
  const domain = `${company.unit.toLowerCase()}.company.com`;

  const acls = ACL_ROLES.map(key => ({
    key,
    values: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => makeEmail(domain)),
  }));

  const wfRoles = WF_ROLES.map(key => ({
    key,
    values: Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () => makeEmail(domain)),
  }));

  // Build a map so generators can look up role → email
  const roleEmailMap = {};
  wfRoles.forEach(r => { roleEmailMap[r.key] = r.values[0]; });

  return {
    _id: new ObjectId(),
    unit: company.unit,
    name: company.name,
    country: company.country,
    region: company.region,
    ba: company.ba,
    currency: company.currency,
    acls,
    wfRoles,
    wfMapRoles: [],
    wfRouters: [
      {
        name: 'onboard-approval',
        route: [
          'Create Request$CreatedBy$HRSSC$HRSSC',
          'Manager Approval$doc.onboard.manager.userPrincipalName',
          "Services Process$[System Agent]$$$doc.allSvcSta.allDone==='Yes'",
        ],
        validate: [],
        editStep: ['Manager Approval'],
        codMsg: [],
        doneNotice: [],
        triggerNotice: [],
      },
      {
        name: 'offboard-approval',
        route: [
          'Create Request$CreatedBy$HRSSC$HRSSC',
          'Manager Approval$doc.offboard.employee.ManagerUserPrincipalName',
          'HR Process$HR',
          "Services Process$[System Agent]$$$doc.allSvcSta.allDone==='Yes'",
        ],
        validate: [],
        editStep: ['Manager Approval', 'HR Process'],
        codMsg: [],
        doneNotice: [],
        triggerNotice: [],
      },
    ],
    keywords: [
      { key: 'Location', values: [company.country] },
      {
        key: 'AutoCreateContractRenew',
        values: [
          'function getFilter(){',
          '    var now=new Date();',
          '    var toDate=dateAdd(now, 90);',
          '    return { ContractExpirationDate:{$gte:now, $lte:toDate} };',
          '}',
        ],
      },
    ],
    createdAt: faker.date.past({ years: 5 }),
    updatedAt: faker.date.recent({ days: 90 }),
    // expose for use by other generators
    _roleEmailMap: roleEmailMap,
    _domain: domain,
  };
};
