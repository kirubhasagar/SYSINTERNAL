const mongoose = require('mongoose');
const TelemetryLog = require('./models/TelemetryLog');

mongoose.connect('mongodb://127.0.0.1:27017/hsis').then(async () => {
  const agents = await TelemetryLog.distinct('agent_id');
  console.log('Unique Agent IDs in DB:', agents);
  process.exit(0);
}).catch(console.error);
