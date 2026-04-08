const mongoose = require('mongoose');

const AgentMetricSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  agent_id: {
    type: String,
    required: true,
    index: true
  },
  hostname: {
    type: String,
    default: ''
  },
  instance_id: {
    type: String,
    default: ''
  },
  private_ip: {
    type: String,
    default: ''
  },
  public_ip: {
    type: String,
    default: ''
  },
  cpu_percent: {
    type: Number,
    default: 0
  },
  memory_percent: {
    type: Number,
    default: 0
  },
  load_average_1m: {
    type: Number,
    default: 0
  },
  uptime_seconds: {
    type: Number,
    default: 0
  },
  monitored_pid: {
    type: Number,
    default: null
  },
  monitored_process: {
    type: String,
    default: ''
  },
  syscall_counts: {
    execve: { type: Number, default: 0 },
    mprotect: { type: Number, default: 0 },
    ptrace: { type: Number, default: 0 },
    chmod: { type: Number, default: 0 },
    anomaly: { type: Number, default: 0 },
    memory_tamper: { type: Number, default: 0 },
    rootkit: { type: Number, default: 0 }
  },
  status: {
    type: String,
    default: 'secure'
  }
});

module.exports = mongoose.model('agent_metric', AgentMetricSchema);
