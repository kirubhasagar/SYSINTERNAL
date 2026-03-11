const http = require('http');

console.log("=== Pushing Telemetry for 54.175.174.244 ===");

const sendPacket = () => {
    const data = JSON.stringify({
        agent_id: `aws-ec2-54.175.174.244`,
        syscall_type: 'SYSTEM_STARTUP',
        expected_hash: "0x985a67",
        actual_hash: "0x985a67",
        details: JSON.stringify({
            msg: "Agent initialized and connected successfully.",
            process: "hsis_agent",
            severity: "Low",
            pid: 1024,
            cpu: "0.1%",
            mem: "0.5%"
        })
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

    // Send a periodic execve to keep the chart moving
    setTimeout(() => {
        const pingData = JSON.stringify({
            agent_id: `aws-ec2-54.175.174.244`,
            syscall_type: 'execve',
            expected_hash: "0x0",
            actual_hash: "0x0",
            details: JSON.stringify({
                msg: "Monitoring standard deviation.",
                process: "/usr/sbin/sshd",
                severity: "Low",
                pid: 2048,
                cpu: "1.0%",
                mem: "2.0%"
            })
        });
        const req2 = http.request(options, (res) => {});
        req2.on('error', (e) => {});
        req2.write(pingData);
        req2.end();
    }, 1000);
};

sendPacket();
setInterval(sendPacket, 3000);
