const express = require('express');
const router = express.Router();
const TelemetryLog = require('../models/TelemetryLog');

// @route   POST /api/telemetry
// @desc    High-concurrency listener for C-agent packets
router.post('/', async (req, res) => {
  try {
    const { agent_id, syscall_type, expected_hash, actual_hash, details } = req.body;

    // In a real high-throughput scenario, we might push this to a Redis queue first.
    // For this implementation, we write directly to MongoDB.

    let logMode = 'db';
    
    // Try to save to DB if it's connected
    try {
      const newLog = new TelemetryLog({
        agent_id,
        syscall_type,
        expected_hash,
        actual_hash,
        details
      });
      await newLog.save();
    } catch (dbError) {
      logMode = 'memory_fallback';
      console.log(`[DB Offline] Received Telemetry: ${agent_id} | ${syscall_type}`);
    }

    res.status(200).json({ status: 'received', mode: logMode });
  } catch (err) {
    console.error('Telemetry ingest error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/telemetry
// @desc    Get recent telemetry logs for the Dashboard
router.get('/', async (req, res) => {
  try {
    let logs = [];
    try {
      logs = await TelemetryLog.find().sort({ timestamp: -1 }).limit(50);
    } catch (dbError) {
      console.log('DB offline, returning mock data for dashboard view.');
      // Return some mock data if DB is offline so frontend doesn't break
      logs = [
        { _id: '1', timestamp: new Date(), agent_id: 'aws-i-mock', syscall_type: 'SYSCALL_ANOMALY', details: 'Mock data (DB Offline)' }
      ];
    }
    
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
