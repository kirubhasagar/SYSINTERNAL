const mongoose = require('mongoose');
const TelemetryLog = require('./models/TelemetryLog');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hsis';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB. Clearing old static telemetry...');
    await TelemetryLog.deleteMany({});
    console.log('Database cleared of mock data. Ready for live data only.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
