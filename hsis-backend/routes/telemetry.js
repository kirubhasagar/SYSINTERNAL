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
      logs = await TelemetryLog.find({ agent_id: { $regex: /^aws-ec2-/ } }).sort({ timestamp: -1 }).limit(50);
    } catch (dbError) {
      console.log('DB offline, returning empty data for dashboard view.');
      // Return empty array if DB is offline so frontend doesn't show static data
      logs = [];
    }
    
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
