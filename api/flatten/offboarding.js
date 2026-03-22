// V1 approach: flatten nested offboarding document in Node.js
// Unwinds: phases[] → tasks[] → verifications[] → evidence (object at level 5)

function flattenOffboarding(docs) {
  const rows = [];

  for (const doc of docs) {
    const base = {
      offboardingId:        doc.offboardingId,
      employeeId:           doc.employeeId,
      employeeName:         doc.employeeName,
      department:           doc.department,
      separationType:       doc.separationType,
      status:               doc.status,
      initiatedDate:        doc.initiatedDate,
      lastWorkingDay:       doc.lastWorkingDay,
      completedDate:        doc.completedDate,
      exitInterviewDone:    doc.exitInterviewCompleted,
      exitInterviewDate:    doc.exitInterviewDate,
      hrContactName:        doc.hrContact?.name,
      finalPayDate:         doc.finalPayroll?.finalPayDate,
      severanceEligible:    doc.finalPayroll?.severanceEligible,
      severanceWeeks:       doc.finalPayroll?.severanceWeeks,
      ktCompleted:          doc.knowledgeTransfer?.documentationCompleted,
      ktCompletedDate:      doc.knowledgeTransfer?.completedDate,
      handoverToName:       doc.knowledgeTransfer?.handoverTo?.name,
      assetReturnStatus:    doc.assetReturn?.status,
      deviceSerialNumber:   doc.assetReturn?.devices?.[0]?.serialNumber,
      deviceConditionGrade: doc.assetReturn?.devices?.[0]?.condition?.grade,
      deviceDisposition:    doc.assetReturn?.devices?.[0]?.condition?.assessment?.disposition,
      deviceAssessedBy:     doc.assetReturn?.devices?.[0]?.condition?.assessment?.assessedBy,
    };

    const phases = doc.phases || [];
    if (phases.length === 0) { rows.push({ ...base }); continue; }

    for (const phase of phases) {
      const tasks = phase.tasks || [];
      if (tasks.length === 0) {
        rows.push({ ...base, phaseName: phase.phaseName, phaseStatus: phase.status });
        continue;
      }

      for (const task of tasks) {
        const verifications = task.verifications || [];
        if (verifications.length === 0) {
          rows.push({
            ...base,
            phaseName:         phase.phaseName,
            phaseStatus:       phase.status,
            taskId:            task.taskId,
            taskCategory:      task.category,
            taskName:          task.taskName,
            taskAssignedTo:    task.assignedTo,
            taskStatus:        task.status,
            taskDueDate:       task.dueDate,
            taskCompletedDate: task.completedDate,
          });
          continue;
        }

        for (const v of verifications) {
          rows.push({
            ...base,
            phaseName:          phase.phaseName,
            phaseStatus:        phase.status,
            taskId:             task.taskId,
            taskCategory:       task.category,
            taskName:           task.taskName,
            taskAssignedTo:     task.assignedTo,
            taskStatus:         task.status,
            taskDueDate:        task.dueDate,
            taskCompletedDate:  task.completedDate,
            verificationId:     v.verificationId,
            verifiedBy:         v.verifiedBy,
            verifiedAt:         v.verifiedAt,
            verificationMethod: v.method,
            evidenceType:       v.evidence?.type,
            evidenceRefId:      v.evidence?.referenceId,
            evidenceStoredAt:   v.evidence?.storedAt,
            evidenceRetainYrs:  v.evidence?.retentionYears,
          });
        }
      }
    }
  }

  return rows;
}

module.exports = { flattenOffboarding };
