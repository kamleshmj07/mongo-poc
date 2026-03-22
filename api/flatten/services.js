// V1 approach: flatten nested service document in Node.js
// Unwinds: subscription.plan.features[] → limits (level 5 object)

function flattenServices(docs) {
  const rows = [];

  for (const doc of docs) {
    const base = {
      serviceId:          doc.serviceId,
      employeeId:         doc.employeeId,
      employeeName:       doc.employeeName,
      department:         doc.department,
      status:             doc.status,
      assignedDate:       doc.assignedDate,
      removedDate:        doc.removedDate,
      deploymentMethod:   doc.deploymentMethod,
      appName:            doc.application?.name,
      appVendor:          doc.application?.vendor,
      appVersion:         doc.application?.version,
      appCategory:        doc.application?.category,
      supportTier:        doc.application?.provider?.supportTier,
      accountManager:     doc.application?.provider?.accountManager,
      contractRenewal:    doc.application?.provider?.contractRenewalDate,
      slaHours:           doc.application?.provider?.support?.slaResponseHours,
      escalationPolicy:   doc.application?.provider?.support?.escalation?.escalationPolicy,
      licenseId:          doc.subscription?.licenseId,
      assignedSeat:       doc.subscription?.assignedSeat,
      seatType:           doc.subscription?.seatType,
      costPerSeatUsd:     doc.subscription?.costPerSeatUsd,
      billingCycle:       doc.subscription?.billingCycle,
      expiryDate:         doc.subscription?.expiryDate,
      planName:           doc.subscription?.plan?.planName,
      lastActiveDate:     doc.usage?.lastActiveDate,
      isActive:           doc.usage?.isActive,
      totalLogins:        doc.usage?.totalLogins,
      avgSessionMinutes:  doc.usage?.avgSessionMinutes,
      logins30d:          doc.usage?.metrics?.loginCount30d,
      dataTransfer30dMb:  doc.usage?.metrics?.dataTransferMb30d,
      errorRate:          doc.usage?.metrics?.errorRate,
      auditStatus:        doc.compliance?.auditStatus,
      lastAuditDate:      doc.compliance?.lastAuditDate,
      dataClassification: doc.compliance?.dataClassification,
    };

    const features = doc.subscription?.plan?.features || [];
    if (features.length === 0) { rows.push({ ...base }); continue; }

    for (const feature of features) {
      rows.push({
        ...base,
        featureName:          feature.featureName,
        featureEnabled:       feature.enabled,
        featureEnabledDate:   feature.enabledDate,
        limitMaxStorage:      feature.limits?.maxStorage,
        limitMaxUsers:        feature.limits?.maxUsers,
        limitApiCallsPerDay:  feature.limits?.apiCallsPerDay,
        limitRateLimitPolicy: feature.limits?.rateLimitPolicy,
      });
    }
  }

  return rows;
}

module.exports = { flattenServices };
