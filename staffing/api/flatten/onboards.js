// v1 approach — custom Node.js for-loops
// One flat row per service per onboard document.
// service.fields[] pivoted into field_<key> columns.

module.exports = function flattenOnboards(docs) {
  const rows = [];

  for (const doc of docs) {
    const base = {
      // Document header
      docId:         doc.docId,
      docType:       doc.docType,
      unit:          doc.unit,
      createdBy:     doc.createdBy,
      createdAt:     doc.createdAt,
      updatedAt:     doc.updatedAt,
      // Employee
      firstName:     doc.onboard?.firstName,
      lastName:      doc.onboard?.lastName,
      commonName:    doc.onboard?.commonName,
      upn:           doc.onboard?.upn,
      department:    doc.onboard?.department,
      jobTitle:      doc.onboard?.jobTitle,
      costCenter:    doc.onboard?.costCenter,
      joinDate:      doc.onboard?.joinDate,
      joinDateStr:   doc.onboard?.joinDateStr,
      location:      doc.onboard?.location,
      eventType:     doc.onboard?.eventType,
      // Manager
      managerName:   doc.onboard?.manager?.CommonName,
      managerUpn:    doc.onboard?.manager?.userPrincipalName,
      managerTitle:  doc.onboard?.manager?.JobTitle,
      grandMgrName:  doc.onboard?.manager?.GrandManagerName,
      grandMgrUpn:   doc.onboard?.manager?.GrandManagerUserPrincipalName,
      // Requester
      requesterName: doc.requester?.CommonName,
      requesterUpn:  doc.requester?.userPrincipalName,
      requesterDept: doc.requester?.Department,
      // Company
      companyName:   doc.company?.Name,
      companyCountry: doc.company?.Country,
      companyRegion: doc.company?.Region,
      currency:      doc.company?.Currency,
      // Workflow summary
      wfStatus:      doc.workflow?.Status,
      wfSta:         doc.workflow?.Sta,
      allDone:       doc.allSvcSta?.allDone,
    };

    for (const svc of (doc.services || [])) {
      // Pivot fields[] into field_<key> columns
      const fieldsFlat = {};
      for (const f of (svc.fields || [])) {
        fieldsFlat[`field_${f.key}`] = f.value ?? '';
      }

      rows.push({
        ...base,
        serviceId:      svc._id,
        serviceName:    svc.name,
        serviceType:    svc.type,
        mustDone:       svc.mustDone,
        serviceStatus:  svc.status,
        serviceResp:    (svc.resp || []).join(';'),
        serviceDoneDate: svc.doneDate ?? null,
        serviceStaDate: svc.staDate,
        depands:        (svc.depands || []).join(';'),
        ...fieldsFlat,
      });
    }
  }

  return rows;
};
