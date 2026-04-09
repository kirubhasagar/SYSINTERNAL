export const ACK_STORAGE_KEY = 'hsis_ack_incidents';

export const parseTelemetryLog = (log, index = 0) => {
  let parsedDetails = {
    msg: log.details,
    process: 'Unknown',
    severity: 'Info',
    pid: '-',
    cpu: '-',
    mem: '-',
    host: '',
  };

  try {
    parsedDetails =
      typeof log.details === 'string'
        ? JSON.parse(log.details)
        : (log.details || parsedDetails);
  } catch (error) {
    // Keep the fallback structure when legacy payloads are plain strings.
  }

  return {
    id: log._id || `${log.agent_id}-${log.timestamp}-${index}`,
    time: new Date(log.timestamp).toLocaleString(),
    rawTimestamp: new Date(log.timestamp).getTime(),
    agent: log.agent_id,
    type: log.syscall_type,
    ...parsedDetails,
  };
};

export const getStoredAcknowledgements = () => {
  try {
    const value = localStorage.getItem(ACK_STORAGE_KEY);
    return new Set(value ? JSON.parse(value) : []);
  } catch (error) {
    return new Set();
  }
};

export const persistAcknowledgements = (ackSet) => {
  localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify([...ackSet]));
};

export const buildReportCatalog = (telemetryLogs, metrics) => {
  const incidents = telemetryLogs
    .map(parseTelemetryLog)
    .filter((log) => log.type !== 'SYSTEM_STARTUP' && log.type !== 'chmod');

  const criticalCount = incidents.filter((log) => `${log.severity}`.toLowerCase() === 'critical').length;
  const rootkitCount = incidents.filter((log) => log.type === 'ROOTKIT_DETECTED').length;
  const tamperCount = incidents.filter((log) => log.type === 'MEMORY_TAMPER').length;

  const executiveSummary = {
    generatedAt: new Date().toISOString(),
    activeAgents: metrics.length,
    incidents: incidents.length,
    criticalIncidents: criticalCount,
    rootkitIndicators: rootkitCount,
    integrityAlerts: tamperCount,
    healthyAgents: metrics.filter((metric) => metric.status === 'secure').length,
    warningAgents: metrics.filter((metric) => metric.status === 'warning').length,
    compromisedAgents: metrics.filter((metric) => metric.status === 'compromised').length,
  };

  const incidentCsvRows = [
    ['timestamp', 'agent', 'severity', 'type', 'process', 'pid', 'message'],
    ...incidents.map((incident) => [
      incident.time,
      incident.agent,
      incident.severity,
      incident.type,
      incident.process,
      incident.pid,
      `${incident.msg}`.replace(/\s+/g, ' ').trim(),
    ]),
  ];

  const metricsSnapshot = metrics.map((metric) => ({
    agent_id: metric.agent_id,
    hostname: metric.hostname,
    public_ip: metric.public_ip,
    private_ip: metric.private_ip,
    cpu_percent: metric.cpu_percent,
    memory_percent: metric.memory_percent,
    load_average_1m: metric.load_average_1m,
    uptime_seconds: metric.uptime_seconds,
    monitored_process: metric.monitored_process,
    status: metric.status,
    syscall_counts: metric.syscall_counts,
  }));

  const rootkitFindings = incidents
    .filter((incident) => incident.type === 'ROOTKIT_DETECTED' || incident.type === 'MEMORY_TAMPER')
    .map((incident) => ({
      timestamp: incident.time,
      agent: incident.agent,
      type: incident.type,
      severity: incident.severity,
      detail: incident.msg,
      process: incident.process,
    }));

  return [
    {
      id: 'executive-summary',
      name: 'Executive Security Summary',
      type: 'JSON',
      description: 'High-level health and incident counts for the current environment.',
      generatedLabel: new Date().toLocaleString(),
      sizeLabel: `${JSON.stringify(executiveSummary).length} B`,
      filename: 'hsis-executive-summary.json',
      content: JSON.stringify(executiveSummary, null, 2),
      mimeType: 'application/json',
    },
    {
      id: 'incident-ledger',
      name: 'Incident Ledger',
      type: 'CSV',
      description: 'Flat export of current incident telemetry for investigations and audit trails.',
      generatedLabel: new Date().toLocaleString(),
      sizeLabel: `${incidentCsvRows.length - 1} rows`,
      filename: 'hsis-incident-ledger.csv',
      content: incidentCsvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n'),
      mimeType: 'text/csv;charset=utf-8',
    },
    {
      id: 'agent-health',
      name: 'Agent Health Snapshot',
      type: 'JSON',
      description: 'Latest metrics snapshot for every active monitored system.',
      generatedLabel: new Date().toLocaleString(),
      sizeLabel: `${metricsSnapshot.length} agents`,
      filename: 'hsis-agent-health.json',
      content: JSON.stringify(metricsSnapshot, null, 2),
      mimeType: 'application/json',
    },
    {
      id: 'rootkit-findings',
      name: 'Rootkit & Integrity Findings',
      type: 'JSON',
      description: 'Focused report containing stealth and tamper indicators currently observed.',
      generatedLabel: new Date().toLocaleString(),
      sizeLabel: `${rootkitFindings.length} findings`,
      filename: 'hsis-rootkit-findings.json',
      content: JSON.stringify(rootkitFindings, null, 2),
      mimeType: 'application/json',
    },
  ];
};

export const downloadBlob = (filename, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
