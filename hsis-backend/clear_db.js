const mongoose = require('mongoose');
const TelemetryLog = require('./models/TelemetryLog');
const AgentMetric = require('./models/AgentMetric');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hsis';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB. Clearing telemetry and metric snapshots...');
    await TelemetryLog.deleteMany({});
    await AgentMetric.deleteMany({});
    console.log('Database cleared. Ready for fresh live data only.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
