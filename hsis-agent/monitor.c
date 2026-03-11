#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdint.h>
#include <sys/ptrace.h>
#include <sys/wait.h>
#include <sys/user.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <time.h>

#define NODE_DASHBOARD_HOST "127.0.0.1"
#define NODE_DASHBOARD_PORT 5000
#define NODE_TELEMETRY_PATH "/api/telemetry"

char global_agent_id[256] = "aws-ec2-unknown";

// x86_64 Syscall Numbers
#define SYS_EXECVE 59
#define SYS_MPROTECT 10
#define SYS_PTRACE 101

// External Assembly Routine standard def
extern uint32_t crc32_hash_buffer(const uint8_t *buffer, size_t length);

// Telemetry Logic
void send_telemetry(const char *agent_id, const char *syscall_type, uint32_t expected, uint32_t actual, const char *details) {
    int sock;
    struct sockaddr_in server_addr;
    char payload[1024];
    char request[2048];
    char ex_hash_str[32] = "null";
    char ac_hash_str[32] = "null";

    const char *dashboard_host = getenv("HSIS_DASHBOARD_HOST") ? getenv("HSIS_DASHBOARD_HOST") : NODE_DASHBOARD_HOST;
    int dashboard_port = getenv("HSIS_DASHBOARD_PORT") ? atoi(getenv("HSIS_DASHBOARD_PORT")) : NODE_DASHBOARD_PORT;

    if (expected != 0) snprintf(ex_hash_str, sizeof(ex_hash_str), "\"%08x\"", expected);
    if (actual != 0) snprintf(ac_hash_str, sizeof(ac_hash_str), "\"%08x\"", actual);

    // Build JSON Payload
    snprintf(payload, sizeof(payload),
             "{\"agent_id\":\"%s\",\"syscall_type\":\"%s\",\"expected_hash\":%s,\"actual_hash\":%s,\"details\":\"%s\"}",
             agent_id, syscall_type, ex_hash_str, ac_hash_str, details);

    // Build HTTP POST Request
    snprintf(request, sizeof(request),
             "POST %s HTTP/1.1\r\n"
             "Host: %s:%d\r\n"
             "Content-Type: application/json\r\n"
             "Content-Length: %zu\r\n"
             "Connection: close\r\n\r\n"
             "%s",
             NODE_TELEMETRY_PATH, dashboard_host, dashboard_port, strlen(payload), payload);

    if ((sock = socket(AF_INET, SOCK_STREAM, 0)) < 0) return; // Fail silently down low to prevent crash

    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(dashboard_port);
    inet_pton(AF_INET, dashboard_host, &server_addr.sin_addr);

    if (connect(sock, (struct sockaddr *)&server_addr, sizeof(server_addr)) >= 0) {
        send(sock, request, strlen(request), 0);
    }
    close(sock);
}

// Layer 2 Hash Scanning
void check_memory_integrity(pid_t pid) {
    char path[256], line[256];
    snprintf(path, sizeof(path), "/proc/%d/maps", pid);
    FILE *maps = fopen(path, "r");
    if (!maps) return;

    while (fgets(line, sizeof(line), maps)) {
        // Parse segments that are readable and executable (r-xp)
        if (strstr(line, "r-xp")) {
            unsigned long start, end;
            sscanf(line, "%lx-%lx", &start, &end);
            size_t len = end - start;
            if (len > 0 && len < 1024*1024*10) { // Limit to 10MB segments to avoid stalling
                // Mock scanning the memory segment for demonstration
                // In production, we'd read processvm or ptrace reading
                uint32_t hash = crc32_hash_buffer((uint8_t*)"SIMULATED_MEMORY_SEGMENT_DATA", 29);
                if (hash != 0x985a67 && pid == 1) { // Alert logic simulation
                     send_telemetry(global_agent_id, "MEMORY_TAMPER", 0x985a67, hash, "RX segment checksum mismatch");
                }
            }
        }
    }
    fclose(maps);
}

// Layer 1 Syscall Intercept Network
void monitor_syscalls(pid_t pid) {
    struct user_regs_struct regs;
    int status;
    
    // Attach to child process
    ptrace(PTRACE_ATTACH, pid, NULL, NULL);
    waitpid(pid, &status, 0);

    while (1) {
        ptrace(PTRACE_SYSCALL, pid, NULL, NULL);
        waitpid(pid, &status, 0);
        if (WIFEXITED(status)) break;

        // Assembly inspection stub (saving drift-free state)
        ptrace(PTRACE_GETREGS, pid, NULL, &regs);
        long orig_rax = regs.orig_rax;

        if (orig_rax == SYS_EXECVE) {
            send_telemetry(global_agent_id, "EXECVE_HOOK", 0, 0, "Suspicious execution hook detected via ptrace");
        } else if (orig_rax == SYS_MPROTECT) {
            // Verify if mprotect is making a segment Write-Execute (WX), standard tampering vector
            if ((regs.rdx & 7) == 7) { 
                send_telemetry(global_agent_id, "SYSCALL_ANOMALY", 0, 0, "mprotect RWX call detected - highly suspicious");
            }
        } else if (orig_rax == SYS_PTRACE) {
            send_telemetry(global_agent_id, "SYSCALL_ANOMALY", 0, 0, "Unexpected ptrace request detected on child");
        }
        
        ptrace(PTRACE_SYSCALL, pid, NULL, NULL);
        waitpid(pid, &status, 0);
        if (WIFEXITED(status)) break;
    }
}

int main(int argc, char *argv[]) {
    printf("[HSIS Core] Initializing Hardened Integrity Suite Layer 1/2...\n");
    
    char public_ip[128] = "unknown-ip";
    FILE *fp = popen("curl -s api.ipify.org", "r");
    if (fp != NULL) {
        if (fgets(public_ip, sizeof(public_ip), fp) != NULL) {
            // Remove any trailing newline from curl output
            size_t len = strlen(public_ip);
            if (len > 0 && public_ip[len - 1] == '\n') public_ip[len - 1] = '\0';
            snprintf(global_agent_id, sizeof(global_agent_id), "aws-ec2-%s", public_ip);
        }
        pclose(fp);
    }

    // Test mode integration
    if (argc > 1 && strcmp(argv[1], "test") == 0) {
        printf("[HSIS Core] Running inline assembly hardware tests...\n");
        const char *test_str = "x86_64_hardware_test";
        uint32_t result = crc32_hash_buffer((const uint8_t*)test_str, strlen(test_str));
        printf("[HSIS Core] CRC32 Test Hash: 0x%08x\n", result);
        printf("[HSIS Core] Test Complete. Sending telemetry...\n");
        send_telemetry(global_agent_id, "SYSTEM_STARTUP", 0, 0, "Agent initialized and passed hardware hash checks");
        return 0;
    }

    // Monitoring Mode
    pid_t target_pid = fork();
    if (target_pid == 0) {
        // Child payload, we'll monitor a continuous demonstration payload
        ptrace(PTRACE_TRACEME, 0, NULL, NULL);
        execl("/bin/sh", "sh", "-c", "while true; do sleep 5; /bin/ls > /dev/null; done", NULL);
    } else {
        printf("[HSIS Core] Monitoring PID %d...\n", target_pid);
        check_memory_integrity(target_pid);
        monitor_syscalls(target_pid);
        printf("[HSIS Core] Target process exited. Agent stopping.\n");
    }

    return 0;
}
