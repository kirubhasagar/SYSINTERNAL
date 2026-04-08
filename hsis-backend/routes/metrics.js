const express = require('express');
const router = express.Router();
const AgentMetric = require('../models/AgentMetric');

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

router.post('/', async (req, res) => {
  try {
    const {
      agent_id,
      hostname,
      instance_id,
      private_ip,
      public_ip,
      cpu_percent,
      memory_percent,
      load_average_1m,
      uptime_seconds,
      monitored_pid,
      monitored_process,
      syscall_counts,
      status
    } = req.body;

    if (!agent_id) {
      return res.status(400).json({ msg: 'agent_id is required' });
    }

    const update = {
      timestamp: new Date(),
      hostname: hostname || '',
      instance_id: instance_id || '',
      private_ip: private_ip || '',
      public_ip: public_ip || '',
      cpu_percent: normalizeNumber(cpu_percent),
      memory_percent: normalizeNumber(memory_percent),
      load_average_1m: normalizeNumber(load_average_1m),
      uptime_seconds: normalizeNumber(uptime_seconds),
      monitored_pid: monitored_pid ?? null,
      monitored_process: monitored_process || '',
      syscall_counts: {
        execve: normalizeNumber(syscall_counts?.execve),
        mprotect: normalizeNumber(syscall_counts?.mprotect),
        ptrace: normalizeNumber(syscall_counts?.ptrace),
        chmod: normalizeNumber(syscall_counts?.chmod),
        anomaly: normalizeNumber(syscall_counts?.anomaly),
        memory_tamper: normalizeNumber(syscall_counts?.memory_tamper),
        rootkit: normalizeNumber(syscall_counts?.rootkit)
      },
      status: status || 'secure'
    };

    try {
      await AgentMetric.findOneAndUpdate(
        { agent_id },
        { $set: update, $setOnInsert: { agent_id } },
        { upsert: true, new: true }
      );
      res.status(200).json({ status: 'received', mode: 'db' });
    } catch (dbError) {
      console.log(`[DB Offline] Received Metrics: ${agent_id}`);
      res.status(200).json({ status: 'received', mode: 'memory_fallback' });
    }
  } catch (err) {
    console.error('Metrics ingest error:', err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/', async (req, res) => {
  try {
    let metrics = [];
    try {
      metrics = await AgentMetric.find({ agent_id: { $regex: /^aws-ec2-|^agent-/ } })
        .sort({ timestamp: -1 });
    } catch (dbError) {
      console.log('DB offline, returning empty metrics payload.');
    }

    res.json(metrics);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
