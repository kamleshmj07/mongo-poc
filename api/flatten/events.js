// V1 approach: flatten nested event document in Node.js
// Unwinds: payload.changes[] → validation → rules[] (level 5)

function flattenEvents(docs) {
  const rows = [];

  for (const doc of docs) {
    const base = {
      eventId:           doc.eventId,
      employeeId:        doc.employeeId,
      employeeName:      doc.employeeName,
      department:        doc.department,
      eventType:         doc.eventType,
      occurredAt:        doc.occurredAt,
      title:             doc.eventInfo?.title,
      severity:          doc.eventInfo?.severity,
      module:            doc.eventInfo?.module,
      environment:       doc.eventInfo?.context?.environment,
      region:            doc.eventInfo?.context?.region,
      ipAddress:         doc.eventInfo?.context?.ipAddress,
      triggerType:       doc.eventInfo?.context?.trigger?.triggerType,
      initiatedBy:       doc.eventInfo?.context?.trigger?.initiatedBy,
      correlationId:     doc.eventInfo?.context?.trigger?.metadata?.correlationId,
      traceId:           doc.eventInfo?.context?.trigger?.metadata?.traceId,
      relatedEntityType: doc.payload?.relatedEntityType,
      relatedEntityId:   doc.payload?.relatedEntityId,
      performedBy:       doc.audit?.performedBy,
      performedByType:   doc.audit?.performedByType,
      sourceSystem:      doc.audit?.sourceSystem,
      approvalRequired:  doc.audit?.approval?.required,
      approvalStatus:    doc.audit?.approval?.status,
      reviewerName:      doc.audit?.approval?.reviewer?.name,
      reviewerRole:      doc.audit?.approval?.reviewer?.role,
      authMethod:        doc.audit?.approval?.reviewer?.credentials?.authMethod,
      mfaVerified:       doc.audit?.approval?.reviewer?.credentials?.mfaVerified,
      privilegedAccess:  doc.audit?.approval?.reviewer?.credentials?.privilegedAccess,
    };

    const changes = doc.payload?.changes || [];
    if (changes.length === 0) { rows.push({ ...base }); continue; }

    for (const change of changes) {
      const rules = change.validation?.rules || [];
      if (rules.length === 0) {
        rows.push({
          ...base,
          changeField:     change.field,
          changeOldValue:  change.oldValue,
          changeNewValue:  change.newValue,
          changedAt:       change.changedAt,
          ruleSetId:       change.validation?.ruleSetId,
          validationPassed:change.validation?.passed,
        });
        continue;
      }

      for (const rule of rules) {
        rows.push({
          ...base,
          changeField:     change.field,
          changeOldValue:  change.oldValue,
          changeNewValue:  change.newValue,
          changedAt:       change.changedAt,
          ruleSetId:       change.validation?.ruleSetId,
          validationPassed:change.validation?.passed,
          ruleId:          rule.ruleId,
          ruleName:        rule.ruleName,
          rulePassed:      rule.passed,
          ruleMessage:     rule.message,
        });
      }
    }
  }

  return rows;
}

module.exports = { flattenEvents };
