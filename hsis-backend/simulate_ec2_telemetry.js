const http = require('http');

console.log("=== HSIS Layer 1/2 Telemetry Simulator ===");
console.log("Injecting sys_call and memory_tamper blocks to local dashboard...");

const agents = ['aws-ec2-0abc123', 'aws-ec2-0def456', 'aws-ec2-0ghi789'];
const syscall_types = ['SYS_EXECVE', 'SYS_MPROTECT', 'SYS_PTRACE', 'MEMORY_TAMPER', 'SYSCALL_ANOMALY'];

const sendPacket = () => {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const type = syscall_types[Math.floor(Math.random() * syscall_types.length)];
    
    let details = "Monitoring standard deviation.";
    if (type === 'MEMORY_TAMPER') details = "RX segment checksum mismatch detected!";
    if (type === 'SYSCALL_ANOMALY') details = "ptrace RWX hook anomaly";

    const data = JSON.stringify({
        agent_id: agent,
        syscall_type: type,
        expected_hash: "0x985a67",
        actual_hash: type === 'MEMORY_TAMPER' ? "0xbadbad" : "0x985a67",
        details: details
    });

    const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/telemetry',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = http.request(options, (res) => {
        // console.log(`STATUS: ${res.statusCode}`);
    });

    req.on('error', (e) => {
        // ignore errors
    });

    req.write(data);
    req.end();
};

// Send Initial Data
sendPacket(); sendPacket(); sendPacket(); sendPacket(); sendPacket();

// Blast interval
setInterval(sendPacket, 800);
