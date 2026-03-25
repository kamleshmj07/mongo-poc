// v1 approach — custom Node.js for-loops
// One flat row per service per offboard document.
// service.fields[] pivoted into field_<key> columns.

module.exports = function flattenOffboards(docs) {
  const rows = [];

  for (const doc of docs) {
    const emp  = doc.offboard?.employee || {};
    const base = {
      // Document header
      docId:            doc.docId,
      docType:          doc.docType,
      unit:             doc.unit,
      createdBy:        doc.createdBy,
      createdAt:        doc.createdAt,
      updatedAt:        doc.updatedAt,
      // Employee
      commonName:       emp.CommonName,
      upn:              emp.userPrincipalName,
      department:       emp.Department,
      jobTitle:         emp.JobTitle,
      costCenter:       emp.CostCenter,
      location:         emp.Location,
      hireDate:         emp.HireDate,
      country:          emp.Country,
      legalEntity:      emp.LegalEntity,
      // Offboard details
      terminationType:  doc.offboard?.terminationType,
      lastWorkingDay:   doc.offboard?.lastWorkingDay,
      // Manager
      managerUpn:       emp.ManagerUserPrincipalName,
      managerName:      emp.ManagerName,
      grandMgrUpn:      emp.GrandManagerUserPrincipalName,
      grandMgrName:     emp.GrandManagerName,
      // Requester
      requesterUpn:     doc.requester?.userPrincipalName,
      requesterName:    doc.requester?.CommonName,
      // Company
      companyName:      doc.company?.Name,
      companyCountry:   doc.company?.Country,
      companyRegion:    doc.company?.Region,
      currency:         doc.company?.Currency,
      // Workflow summary
      wfStatus:         doc.workflow?.Status,
      wfSta:            doc.workflow?.Sta,
      allDone:          doc.allSvcSta?.allDone,
    };

    for (const svc of (doc.services || [])) {
      const fieldsFlat = {};
      for (const f of (svc.fields || [])) {
        fieldsFlat[`field_${f.key}`] = f.value ?? '';
      }

      rows.push({
        ...base,
        serviceId:       svc._id,
        serviceName:     svc.name,
        serviceType:     svc.type,
        mustDone:        svc.mustDone,
        serviceStatus:   svc.status,
        serviceResp:     (svc.resp || []).join(';'),
        serviceDoneDate: svc.doneDate ?? null,
        serviceStaDate:  svc.staDate,
        depands:         (svc.depands || []).join(';'),
        ...fieldsFlat,
      });
    }
  }

  return rows;
};
