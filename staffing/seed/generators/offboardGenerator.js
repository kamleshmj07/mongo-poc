const { faker } = require('@faker-js/faker');
const { ObjectId } = require('mongodb');
const serviceCatalog = require('../data/offboardServices');

const DEPARTMENTS    = ['Finance', 'HR Shared Services', 'IT', 'Sales', 'Operations', 'Engineering', 'Marketing', 'Legal', 'Supply Chain', 'Customer Service', 'Procurement'];
const JOB_TITLES     = ['Analyst', 'Senior Analyst', 'Specialist', 'Senior Specialist', 'Manager', 'Senior Manager', 'Director', 'Coordinator', 'Engineer', 'Consultant', 'Associate'];
const LOCATIONS      = ['Shanghai Zhongchuang Office', 'Beijing Office', 'Singapore HQ', 'London Office', 'Munich Office', 'New York Office', 'Sydney Office', 'Tokyo Office', 'Mumbai Office'];
const TERM_TYPES     = ['Resignation', 'Retirement', 'End of Contract', 'Redundancy', 'Mutual Agreement'];

function makeDocId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${rand(4)}-${rand(5)}`;
}

function pickFieldValue(field) {
  switch (field.type) {
    case 'Number': return faker.number.int({ min: 0, max: 50000 });
    case 'Date':   return faker.date.recent({ days: 365 }).toISOString().split('T')[0];
    case 'List': {
      const opts = (field.listOptions || 'Yes\nNo').split('\n').filter(Boolean);
      return opts[Math.floor(Math.random() * opts.length)];
    }
    default: return faker.lorem.words(2);
  }
}

function buildServices(roleEmailMap, domain, isCompleted, lastWorkingDay) {
  // Always include core services; pick 3–5 optional ones
  const core     = serviceCatalog.slice(0, 4);
  const optional = faker.helpers.arrayElements(serviceCatalog.slice(4), faker.number.int({ min: 3, max: 6 }));
  const selected = [...core, ...optional];

  return selected.map(tpl => {
    const respEmail = roleEmailMap[tpl.role] || makeEmail(domain);
    const resp      = [respEmail];
    const status    = isCompleted ? 'Done' : (Math.random() > 0.5 ? 'In Progress' : 'Waiting Action');
    const doneDate  = isCompleted ? faker.date.between({ from: lastWorkingDay, to: new Date() }) : null;
    const respName  = respEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());

    const fields = tpl.fields.map(f => ({
      key:        f.key,
      label:      f.label,
      type:       f.type,
      isRequired: f.isRequired,
      ...(f.listOptions ? { listOptions: f.listOptions } : {}),
      value: isCompleted ? pickFieldValue(f) : '',
    }));

    return {
      _id:             new ObjectId().toString(),
      name:            tpl.name,
      type:            'Offboard',
      mustDone:        tpl.mustDone,
      resp,
      depands:         tpl.depands || [],
      completeNotices: tpl.completeNotices || [],
      ...(tpl.triggerAt ? { triggerAt: tpl.triggerAt } : {}),
      desc:            tpl.desc,
      fields,
      status,
      TheBall:         isCompleted ? ['-'] : resp,
      staDate:         doneDate
        ? `${doneDate.toISOString().replace('T', ' ').slice(0, 16)} GMT8 ${respName}`
        : '-',
      attachedFiles:   [],
      ...(doneDate ? { doneDate: doneDate.toISOString() } : {}),
      ...(tpl.options ? { options: tpl.options } : {}),
    };
  });
}

function makeEmail(domain) {
  return `${faker.person.firstName().toLowerCase()}.${faker.person.lastName().toLowerCase()}@${domain}`;
}

module.exports = function generateOffboard(company, companyProfile) {
  const domain       = companyProfile._domain;
  const roleEmailMap = companyProfile._roleEmailMap;

  // Employee being offboarded
  const firstName  = faker.person.firstName();
  const lastName   = faker.person.lastName();
  const commonName = `${firstName} ${lastName}`;
  const upn        = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
  const empGuid    = faker.number.int({ min: 100000, max: 999999 });

  // Manager
  const mgrFirst = faker.person.firstName();
  const mgrLast  = faker.person.lastName();
  const mgrUpn   = `${mgrFirst.toLowerCase()}.${mgrLast.toLowerCase()}@${domain}`;

  // Grand manager
  const gmFirst  = faker.person.firstName();
  const gmLast   = faker.person.lastName();
  const gmUpn    = `${gmFirst.toLowerCase()}.${gmLast.toLowerCase()}@${domain}`;

  // HR requester
  const reqUpn   = roleEmailMap['HRSSC_Staffing'] || makeEmail(domain);
  const reqFirst = reqUpn.split('.')[0].replace(/\b\w/g, c => c.toUpperCase());
  const reqLast  = reqUpn.split('.')[1]?.split('@')[0].replace(/\b\w/g, c => c.toUpperCase()) || 'HR';
  const reqName  = `${reqFirst} ${reqLast}`;

  const department     = faker.helpers.arrayElement(DEPARTMENTS);
  const jobTitle       = faker.helpers.arrayElement(JOB_TITLES);
  const location       = faker.helpers.arrayElement(LOCATIONS);
  const terminationType = faker.helpers.arrayElement(TERM_TYPES);
  const costCenter     = `${company.ba}${faker.string.alphanumeric(7).toUpperCase()}`;

  const lastWorkingDay = faker.date.between({ from: '2020-01-01', to: new Date() });
  const lastWorkingDayStr = lastWorkingDay.toISOString().split('T')[0];
  const lastWorkingDayNum = parseInt(lastWorkingDayStr.replace(/-/g, ''));
  const createdAt      = faker.date.between({ from: new Date(lastWorkingDay.getTime() - 60 * 86400000), to: lastWorkingDay });
  const isCompleted    = Math.random() > 0.15;
  const updatedAt      = faker.date.between({ from: createdAt, to: new Date() });

  const services         = buildServices(roleEmailMap, domain, isCompleted, lastWorkingDay);
  const allDone          = services.every(s => s.status === 'Done') ? 'Yes' : 'No';
  const allResp          = [...new Set(services.flatMap(s => s.resp))];
  const requiredServices = services.filter(s => s.mustDone === 'Yes').map(s => s.name);

  const approvalDate = faker.date.between({ from: createdAt, to: updatedAt });

  const wfData = [
    {
      Action:   'Create Request',
      Resp:     [reqUpn],
      Backup:   ['-'],
      Notice:   ['-'],
      Status:   'Done',
      Date:     `${createdAt.toISOString().replace('T', ' ').slice(0, 16)} GMT8 ${reqName}`,
      DoneDate: createdAt.toISOString(),
    },
    {
      Action:  'Manager Approval',
      Resp:    [mgrUpn],
      Backup:  ['-'],
      Notice:  ['-'],
      Status:  isCompleted ? 'Done' : 'Waiting',
      Date:    isCompleted ? `${approvalDate.toISOString().replace('T', ' ').slice(0, 16)} GMT8 ${mgrFirst} ${mgrLast}` : '-',
      ...(isCompleted ? { DoneDate: approvalDate.toISOString() } : {}),
    },
    {
      Action:  'HR Process',
      Resp:    [roleEmailMap['HR'] || makeEmail(domain)],
      Backup:  ['-'],
      Notice:  ['-'],
      Status:  isCompleted ? 'Done' : 'Waiting',
      ...(isCompleted ? { Date: `${faker.date.between({ from: approvalDate, to: updatedAt }).toISOString().replace('T', ' ').slice(0, 16)} GMT8 HR` } : {}),
    },
    {
      Action:   'Services Process',
      Resp:     allResp,
      Backup:   ['-'],
      Notice:   ['-'],
      Status:   isCompleted ? 'Done' : 'In Progress',
      AgentCod: "doc.allSvcSta.allDone==='Yes'",
      ...(isCompleted ? { Date: `${updatedAt.toISOString().replace('T', ' ').slice(0, 16)} GMT8 [System Agent]` } : {}),
    },
  ];

  const logs = Array.from({ length: faker.number.int({ min: 0, max: 4 }) }, () => {
    const d   = faker.date.between({ from: createdAt, to: updatedAt });
    const em  = allResp[Math.floor(Math.random() * allResp.length)] || reqUpn;
    const old = em.replace('@', '@cn.');
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()} GMT8 UPN changed - .services.${faker.number.int({min:0,max:2})}.resp.0:${old}->${em}`;
  });

  return {
    _id:       new ObjectId(),
    docType:   'offboard',
    docId:     makeDocId(),
    uuid:      faker.string.uuid(),
    unit:      company.unit,
    createdBy: reqUpn,
    createdAt,
    updatedAt,
    logs,
    attachedFiles: [],

    offboard: {
      employee: {
        CommonName:                   commonName,
        userPrincipalName:            upn,
        Email:                        upn,
        JobTitle:                     jobTitle,
        Department:                   department,
        Location:                     location,
        CostCenter:                   `${costCenter}-${department.replace(/ /g, '_')}`,
        Country:                      company.country,
        LegalEntity:                  company.ba,
        Unit:                         company.unit,
        Guid:                         empGuid,
        EmpGroupDesc:                 'Regular',
        EmpStatusDesc:                'Inactive',
        EmpType:                      'WH',
        HireDate:                     faker.date.past({ years: 8 }).toISOString(),
        ManagerUserPrincipalName:     mgrUpn,
        ManagerName:                  `${mgrFirst} ${mgrLast}`,
        GrandManagerUserPrincipalName: gmUpn,
        GrandManagerName:             `${gmFirst} ${gmLast}`,
      },
      terminationType,
      lastWorkingDay:    lastWorkingDayStr,
      lastWorkingDayNum,
      remark:            '',
    },

    requester: {
      CommonName:                reqName,
      userPrincipalName:         reqUpn,
      Email:                     reqUpn,
      JobTitle:                  'HR Specialist',
      Department:                'HR Shared Services-Staffing',
      ManagerEmail:              gmUpn,
      ManagerUserPrincipalName:  gmUpn,
      GrandManagerUserPrincipalName: makeEmail(domain),
      Country:                   company.country,
      LegalEntity:               company.ba,
      Unit:                      company.unit,
    },

    company: {
      Name:        company.name,
      Country:     company.country,
      CountryCode: company.unit,
      Region:      company.region,
      Ba:          company.ba,
      Unit:        company.unit,
      Currency:    company.currency,
      Location:    `${company.unit}_Office`,
      Status:      'A',
      Type:        'H',
      Division:    'HCO',
    },

    services,

    allSvcSta: {
      requiredServices,
      allResp,
      TheBall: isCompleted ? [''] : allResp,
      allDone,
    },

    workflow: {
      Sta:       isCompleted ? 98 : faker.number.int({ min: 10, max: 80 }),
      Status:    isCompleted ? 'Completed' : 'In Progress',
      wfKey:     'offboard',
      Requester: reqUpn,
      Involved:  [reqUpn, mgrUpn, ...allResp],
      Log:       [`${createdAt.toISOString().replace('T', ' ').slice(0, 16)} GMT8 ${reqName}: submit @ Create Request`],
      Comment:   [],
      TheBall:   isCompleted ? ['-'] : [mgrUpn],
      TheBallBak: ['-'],
      Notice:    ['-'],
      isSpecial: false,
      hasError:  false,
      WFRoute: [
        { Action: 'Create Request',   Resp: 'CreatedBy' },
        { Action: 'Manager Approval', Resp: 'doc.offboard.employee.ManagerUserPrincipalName' },
        { Action: 'HR Process',       Resp: 'HR' },
        { Action: 'Services Process', Resp: '[System Agent]', AgentCod: "doc.allSvcSta.allDone==='Yes'" },
      ],
      WFValidate: [],
      editStep:   ['Manager Approval', 'HR Process'],
      codMsg:     [],
      doneNotice: [],
      Data:       wfData,
      ActionCode: { 'Create Request': 0, 'Manager Approval': 1, 'HR Process': 2, 'Services Process': 3 },
      messages:   [],
      PreviousSta: 0,
      SubmitDate:      createdAt.toISOString(),
      SubmitDate_num:  lastWorkingDayNum,
      NoticeId:        '',
      ...(isCompleted ? {
        CompleteDate:     updatedAt.toISOString(),
        CompleteDate_num: parseInt(updatedAt.toISOString().split('T')[0].replace(/-/g, '')),
      } : {}),
    },
  };
};
