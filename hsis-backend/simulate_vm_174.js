const http = require('http');

const agentIp = '54.175.174.244';
console.log(`=== Pushing Telemetry for Cloud VM: ${agentIp} ===`);

const syscall_types = ['SYS_EXECVE', 'SYS_MPROTECT', 'SYS_PTRACE', 'MEMORY_TAMPER', 'SYSCALL_ANOMALY'];

const sendPacket = () => {
    const type = syscall_types[Math.floor(Math.random() * syscall_types.length)];
    
    let details = "Monitoring standard deviation.";
    if (type === 'MEMORY_TAMPER') details = "RX segment checksum mismatch detected!";
    if (type === 'SYSCALL_ANOMALY') details = "ptrace RWX hook anomaly";

    const data = JSON.stringify({
        agent_id: `aws-ec2-${agentIp}`,
        syscall_type: type,
        expected_hash: "0x985a67",
        actual_hash: type === 'MEMORY_TAMPER' ? "0xbadbad" : "0x985a67",
        details: details
    });

    const options = {
        hostname: '127.0.0.1', // Dashboard IP (local for testing, change to public if running remotely)
        port: 5000,
        path: '/api/telemetry',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = http.request(options, (res) => {});
    req.on('error', (e) => {
        // console.log("Error:", e.message);
    });
    req.write(data);
    req.end();
};

setInterval(sendPacket, 800);
