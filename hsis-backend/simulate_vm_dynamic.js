const http = require('http');
const https = require('https');

console.log("=== Pushing Telemetry with Dynamic IP (Mimicking new C Agent) ===");

https.get('https://api.ipify.org', (res) => {
    let publicIp = '';
    res.on('data', chunk => publicIp += chunk);
    res.on('end', () => {
        publicIp = publicIp.trim();
        console.log(`Fetched Public IP: ${publicIp}`);
        
        const syscall_types = ['SYS_EXECVE', 'SYS_MPROTECT', 'SYS_PTRACE', 'MEMORY_TAMPER', 'SYSCALL_ANOMALY'];

        const sendPacket = () => {
            const type = syscall_types[Math.floor(Math.random() * syscall_types.length)];
            
            let details = "Monitoring standard deviation.";
            if (type === 'MEMORY_TAMPER') details = "RX segment checksum mismatch detected!";
            if (type === 'SYSCALL_ANOMALY') details = "ptrace RWX hook anomaly";

            const data = JSON.stringify({
                // Using the exact format the C agent will use
                agent_id: `aws-ec2-${publicIp}`,
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

            const req = http.request(options, (res) => {});
            req.on('error', (e) => {});
            req.write(data);
            req.end();
        };

        setInterval(sendPacket, 800);
    });
}).on('error', console.error);
