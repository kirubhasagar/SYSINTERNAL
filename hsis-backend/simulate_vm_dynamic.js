const https = require('https');

console.log("=== Pushing Telemetry for Multiple Simulated VMs ===");

const ips = ['54.175.122.10', '13.234.11.99', '18.100.45.12'];
const syscall_types = ['execve', 'mprotect', 'ptrace', 'chmod', 'MEMORY_TAMPER', 'ROOTKIT_DETECTED'];
const processes = ['/usr/sbin/sshd', '/bin/bash', '/usr/bin/python3', '/tmp/malware.elf', '/usr/bin/kworker'];

const sendPacket = () => {
    const publicIp = ips[Math.floor(Math.random() * ips.length)];
    const type = syscall_types[Math.floor(Math.random() * syscall_types.length)];
    const proc = processes[Math.floor(Math.random() * processes.length)];
    
    let details = "Monitoring standard deviation.";
    let severity = "Low";
    
    if (type === 'MEMORY_TAMPER') {
        details = "RX segment checksum mismatch detected!";
        severity = "Critical";
    }
    if (type === 'ROOTKIT_DETECTED') {
        details = "Suspicious kernel hook detected via LKM tracking";
        severity = "High";
    }
    if (type === 'ptrace' || type === 'mprotect') {
        severity = "Medium";
    }

    const data = JSON.stringify({
        agent_id: `aws-ec2-${publicIp}`,
        syscall_type: type,
        expected_hash: "0x985a67",
        actual_hash: type === 'MEMORY_TAMPER' ? "0xbadbad" : "0x985a67",
        details: JSON.stringify({
            msg: details,
            process: proc,
            severity: severity,
            pid: Math.floor(Math.random() * 50000) + 100,
            cpu: (Math.random() * 40).toFixed(1) + '%',
            mem: (Math.random() * 60).toFixed(1) + '%'
        })
    });

    const options = {
        hostname: '7202-106-195-35-55.ngrok-free.app',
        port: 443,
        path: '/api/telemetry',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = https.request(options, (res) => {});
    req.on('error', (e) => {});
    req.write(data);
    req.end();
};

setInterval(sendPacket, 800);
