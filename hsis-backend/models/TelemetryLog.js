const mongoose = require('mongoose');

const TelemetryLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  agent_id: {
    type: String,
    required: true
  },
  syscall_type: {
    type: String, // e.g., 'execve', 'mprotect', 'ptrace', 'memory_tamper'
    required: true
  },
  expected_hash: {
    type: String,
    default: null
  },
  actual_hash: {
    type: String,
    default: null
  },
  details: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('telemetry_log', TelemetryLogSchema);
