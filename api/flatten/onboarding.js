// V1 approach: flatten nested onboarding document in Node.js
// Unwinds: phases[] → tasks[] → subtasks[] (3 levels of arrays)

function flattenOnboarding(docs) {
  const rows = [];

  for (const doc of docs) {
    const base = {
      onboardingId:          doc.onboardingId,
      employeeId:            doc.employeeId,
      employeeName:          doc.employeeName,
      department:            doc.department,
      status:                doc.status,
      onboardingBatch:       doc.onboardingBatch,
      startedDate:           doc.startedDate,
      completedDate:         doc.completedDate,
      hrContactName:         doc.hrContact?.name,
      hrContactEmail:        doc.hrContact?.email,
      buddyName:             doc.assignedBuddy?.name,
      buddyEmail:            doc.assignedBuddy?.email,
      trainingPlatform:      doc.training?.platform,
      securityScore:         doc.training?.modules?.[0]?.assessment?.score,
      conductScore:          doc.training?.modules?.[1]?.assessment?.score,
      accessCompletedDate:   doc.accessProvisioning?.completedDate,
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
        const subtasks = task.subtasks || [];
        if (subtasks.length === 0) {
          rows.push({
            ...base,
            phaseName:        phase.phaseName,
            phaseStatus:      phase.status,
            taskId:           task.taskId,
            taskCategory:     task.category,
            taskName:         task.taskName,
            taskAssignedTo:   task.assignedTo,
            taskStatus:       task.status,
            taskDueDate:      task.dueDate,
            taskCompletedDate:task.completedDate,
          });
          continue;
        }

        for (const subtask of subtasks) {
          rows.push({
            ...base,
            phaseName:           phase.phaseName,
            phaseStatus:         phase.status,
            taskId:              task.taskId,
            taskCategory:        task.category,
            taskName:            task.taskName,
            taskAssignedTo:      task.assignedTo,
            taskStatus:          task.status,
            taskDueDate:         task.dueDate,
            taskCompletedDate:   task.completedDate,
            subtaskId:           subtask.subtaskId,
            subtaskName:         subtask.name,
            subtaskCompletedBy:  subtask.completedBy,
            checklistTotal:      subtask.checklist?.totalItems,
            checklistCompleted:  subtask.checklist?.completedItems,
            checklistApprovedBy: subtask.checklist?.approvedBy,
          });
        }
      }
    }
  }

  return rows;
}

module.exports = { flattenOnboarding };
