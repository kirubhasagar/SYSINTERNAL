#!/bin/bash
# Hardened System Integrity Suite (HSIS) 
# AWS EC2 Layer 1 & 2 Installation Script

echo "====================================================="
echo "  Deploying HSIS Layer 1/2 Agent                 "
echo "====================================================="

# Ensure running as root
if [ "$EUID" -ne 0 ]; then
  echo "[!] Please run as root (sudo ./install.sh)"
  exit 1
fi

DASHBOARD_HOST=${1:-"32ca-49-47-219-228.ngrok-free.app"}
DASHBOARD_PORT=${2:-80}

echo "[+] Target Dashboard Configured: $DASHBOARD_HOST:$DASHBOARD_PORT"

echo "[+] Installing toolchain requirements..."
yum update -y >/dev/null 2>&1 || apt-get update -y >/dev/null 2>&1
yum install -y gcc glibc-static nasm make >/dev/null 2>&1 || apt-get install -y gcc nasm make libc6-dev >/dev/null 2>&1

echo "[+] Compiling C/Assembly core agent..."
make clean
make all

if [ ! -f "hsis_agent" ]; then
    echo "[-] Compilation failed. Check toolchain."
    exit 1
fi

echo "[+] Registering Agent daemon in /usr/local/bin..."
make install

cat <<EOF >/etc/systemd/system/hsis_agent.service
[Unit]
Description=Sysinternal Hardened System Integrity Suite Layer 1/2
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/hsis_agent
Restart=on-failure
RestartSec=5

# Dynamically injected by installer arguments
Environment="HSIS_DASHBOARD_HOST=$DASHBOARD_HOST"
Environment="HSIS_DASHBOARD_PORT=$DASHBOARD_PORT"

[Install]
WantedBy=multi-user.target
EOF

echo "[+] Reloading systemd and enabling HSIS core..."
systemctl daemon-reload
systemctl enable hsis_agent
systemctl restart hsis_agent

echo "====================================================="
echo "  Installation Complete.                         "
echo "  Check status: systemctl status hsis_agent      "
echo "====================================================="
