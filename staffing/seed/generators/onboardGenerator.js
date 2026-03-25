const { faker } = require('@faker-js/faker');
const { ObjectId } = require('mongodb');
const serviceCatalog = require('../data/onboardServices');

const DEPARTMENTS   = ['Finance', 'HR Shared Services', 'IT', 'Sales', 'Operations', 'Engineering', 'Marketing', 'Legal', 'Supply Chain', 'Customer Service', 'Procurement'];
const JOB_TITLES    = ['Analyst', 'Senior Analyst', 'Specialist', 'Senior Specialist', 'Manager', 'Senior Manager', 'Director', 'Coordinator', 'Engineer', 'Consultant', 'Associate'];
const EVENT_TYPES   = ['1. New Hire', '2. Transfer', '3. Rehire'];
const LOCATIONS     = ['Shanghai Zhongchuang Office', 'Beijing Office', 'Singapore HQ', 'London Office', 'Munich Office', 'New York Office', 'Sydney Office', 'Tokyo Office', 'Mumbai Office'];

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
    default: return faker.string.alphanumeric(8).toUpperCase();
  }
}

function buildServices(roleEmailMap, domain, isCompleted, joinDate) {
  // Always include the 5 core services; pick 2–5 optional ones
  const core     = serviceCatalog.slice(0, 5);
  const optional = faker.helpers.arrayElements(serviceCatalog.slice(5), faker.number.int({ min: 2, max: 5 }));
  const selected = [...core, ...optional];

  return selected.map(tpl => {
    const respEmail = roleEmailMap[tpl.role] || makeEmail(domain);
    const resp      = [respEmail];
    const status    = isCompleted ? 'Done' : (Math.random() > 0.5 ? 'In Progress' : 'Waiting Action');
    const doneDate  = isCompleted ? faker.date.between({ from: joinDate, to: new Date() }) : null;
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
      type:            'Onboard',
      mustDone:        tpl.mustDone,
      resp,
      depands:         tpl.depands || [],
      completeNotices: tpl.completeNotices || [],
      ...(tpl.triggerAt ? { triggerAt: tpl.triggerAt } : { triggerAt: '' }),
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

module.exports = function generateOnboard(company, companyProfile) {
  const domain       = companyProfile._domain;
  const roleEmailMap = companyProfile._roleEmailMap;

  // Employee being onboarded
  const firstName  = faker.person.firstName();
  const lastName   = faker.person.lastName();
  const commonName = `${firstName} ${lastName}`;
  const upn        = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;

  // Manager
  const mgrFirst = faker.person.firstName();
  const mgrLast  = faker.person.lastName();
  const mgrUpn   = `${mgrFirst.toLowerCase()}.${mgrLast.toLowerCase()}@${domain}`;

  // Grand manager
  const gmFirst  = faker.person.firstName();
  const gmLast   = faker.person.lastName();
  const gmUpn    = `${gmFirst.toLowerCase()}.${gmLast.toLowerCase()}@${domain}`;

  // HR requester
  const reqFirst = faker.person.firstName();
  const reqLast  = faker.person.lastName();
  const reqUpn   = roleEmailMap['HRSSC_Staffing'] || makeEmail(domain);
  const reqName  = reqUpn.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());

  const department = faker.helpers.arrayElement(DEPARTMENTS);
  const jobTitle   = faker.helpers.arrayElement(JOB_TITLES);
  const location   = faker.helpers.arrayElement(LOCATIONS);
  const eventType  = faker.helpers.arrayElement(EVENT_TYPES);
  const joinDate   = faker.date.between({ from: '2020-01-01', to: new Date() });
  const joinDateStr = joinDate.toISOString().split('T')[0];
  const joinDateNum = parseInt(joinDateStr.replace(/-/g, ''));
  const costCenter  = `${company.ba}${faker.string.alphanumeric(7).toUpperCase()}`;

  const isCompleted = Math.random() > 0.2;
  const createdAt   = faker.date.between({ from: new Date(joinDate.getTime() - 30 * 86400000), to: joinDate });
  const updatedAt   = faker.date.between({ from: createdAt, to: new Date() });

  const services        = buildServices(roleEmailMap, domain, isCompleted, joinDate);
  const allDone         = services.every(s => s.status === 'Done') ? 'Yes' : 'No';
  const allResp         = [...new Set(services.flatMap(s => s.resp))];
  const requiredServices = services.filter(s => s.mustDone === 'Yes').map(s => s.name);

  const approvalDate    = faker.date.between({ from: createdAt, to: updatedAt });
  const approvalName    = `${mgrFirst} ${mgrLast}`;

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
      Action: 'Manager Approval',
      Resp:   [mgrUpn],
      Backup: ['-'],
      Notice: ['-'],
      Status: isCompleted ? 'Done' : 'Waiting',
      Date:   isCompleted ? `${approvalDate.toISOString().replace('T', ' ').slice(0, 16)} GMT8 ${approvalName}` : '-',
      ...(isCompleted ? { DoneDate: approvalDate.toISOString() } : {}),
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

  // A handful of UPN-change log entries
  const logs = Array.from({ length: faker.number.int({ min: 0, max: 4 }) }, () => {
    const d   = faker.date.between({ from: createdAt, to: updatedAt });
    const em  = allResp[Math.floor(Math.random() * allResp.length)] || reqUpn;
    const old = em.replace('@', '@cn.');
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()} GMT8 UPN changed - .services.${faker.number.int({min:0,max:2})}.resp.0:${old}->${em}`;
  });

  return {
    _id:       new ObjectId(),
    docType:   'onboard',
    docId:     makeDocId(),
    uuid:      faker.string.uuid(),
    unit:      company.unit,
    createdBy: reqUpn,
    createdAt,
    updatedAt,
    logs,
    attachedFiles: [],

    onboard: {
      firstName,
      middleName:  Math.random() > 0.8 ? faker.person.middleName() : '',
      lastName,
      commonName,
      localName:   faker.person.fullName(),
      upn,
      upnDomain:   `@${domain}`,
      nameStatus:  `3.Name [${commonName}] is available`,
      eventType,
      location,
      department,
      jobTitle,
      costCenter:  `${costCenter}-${department.replace(/ /g, '_')}`,
      joinDate:    joinDate.toISOString(),
      joinDateNum,
      joinDateStr,
      selectEmployee: false,
      remark:      '',
      manager: {
        _id:                          new ObjectId().toString(),
        CommonName:                   `${mgrFirst} ${mgrLast}`,
        userPrincipalName:            mgrUpn,
        JobTitle:                     faker.helpers.arrayElement(JOB_TITLES),
        Department:                   department,
        Location:                     location,
        CostCenter:                   `${company.ba}${faker.string.alphanumeric(7).toUpperCase()}`,
        Manager:                      faker.number.int({ min: 100000, max: 999999 }),
        GrandManagerName:             `${gmFirst} ${gmLast}`,
        GrandManagerUserPrincipalName: gmUpn,
        ManagerUserPrincipalName:     gmUpn,
      },
    },

    requester: {
      CommonName:                `${reqFirst} ${reqLast}`,
      userPrincipalName:         reqUpn,
      Email:                     reqUpn,
      JobTitle:                  'HR Specialist',
      Department:                'HR Shared Services-Staffing',
      Location:                  location,
      ManagerName:               `${gmFirst} ${gmLast}`,
      ManagerEmail:              gmUpn,
      ManagerUserPrincipalName:  gmUpn,
      GrandManagerUserPrincipalName: makeEmail(domain),
      Country:                   company.country,
      LegalEntity:               company.ba,
      CostCenter:                `${company.ba}${faker.string.alphanumeric(7).toUpperCase()}`,
      Unit:                      company.unit,
      Guid:                      faker.number.int({ min: 100000, max: 999999 }),
      HireDate:                  faker.date.past({ years: 5 }).toISOString(),
      EmpGroupDesc:              'Regular',
      EmpStatusDesc:             'Active',
      EmpType:                   'WH',
      EmpSubGroup:               faker.number.int({ min: 10, max: 30 }),
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
      wfKey:     'onboard',
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
        { Action: 'Manager Approval', Resp: 'doc.onboard.manager.userPrincipalName' },
        { Action: 'Services Process', Resp: '[System Agent]', AgentCod: "doc.allSvcSta.allDone==='Yes'" },
      ],
      WFValidate: [],
      editStep:   ['Manager Approval'],
      codMsg:     [],
      doneNotice: [],
      Data:       wfData,
      ActionCode: { 'Create Request': 0, 'Manager Approval': 1, 'Services Process': 2 },
      messages:   [],
      PreviousSta: 0,
      SubmitDate:      createdAt.toISOString(),
      SubmitDate_num:  joinDateNum,
      NoticeId:        '',
      ...(isCompleted ? {
        CompleteDate:     updatedAt.toISOString(),
        CompleteDate_num: parseInt(updatedAt.toISOString().split('T')[0].replace(/-/g, '')),
      } : {}),
    },
  };
};
