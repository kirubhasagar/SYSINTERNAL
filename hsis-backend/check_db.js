const mongoose = require('mongoose');
const TelemetryLog = require('./models/TelemetryLog');
const AgentMetric = require('./models/AgentMetric');

mongoose.connect('mongodb://127.0.0.1:27017/hsis').then(async () => {
  const telemetryAgents = await TelemetryLog.distinct('agent_id');
  const metricAgents = await AgentMetric.distinct('agent_id');
  console.log('Telemetry Agent IDs:', telemetryAgents);
  console.log('Metric Agent IDs:', metricAgents);
  process.exit(0);
}).catch(console.error);
