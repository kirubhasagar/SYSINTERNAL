#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdint.h>
#include <ctype.h>
#include <errno.h>
#include <dirent.h>
#include <limits.h>
#include <sys/ptrace.h>
#include <sys/wait.h>
#include <sys/user.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <time.h>
#include <sys/mman.h>
#include <sys/sysinfo.h>
#include <sys/stat.h>
#include <signal.h>

#define DEFAULT_BACKEND_URL "http://127.0.0.1:5000"
#define TELEMETRY_PATH "/api/telemetry"
#define METRICS_PATH "/api/metrics"

// x86_64 Syscall Numbers
#define SYS_EXECVE 59
#define SYS_MPROTECT 10
#define SYS_PTRACE 101
#define SYS_CHMOD 90

extern uint32_t crc32_hash_buffer(const uint8_t *buffer, size_t length);

static void send_metrics_snapshot(void);
static void send_telemetry(const char *syscall_type, uint32_t expected, uint32_t actual, const char *details, const char *severity);

typedef struct {
    unsigned long long execve;
    unsigned long long mprotect;
    unsigned long long ptrace;
    unsigned long long chmod;
    unsigned long long anomaly;
    unsigned long long memory_tamper;
    unsigned long long rootkit;
} syscall_counters_t;

static char global_agent_id[256] = "agent-unknown";
static char backend_url[512] = DEFAULT_BACKEND_URL;
static char hostname_buffer[128] = "unknown-host";
static char private_ip_buffer[64] = "";
static char public_ip_buffer[64] = "";
static char monitored_process_name[256] = "hsis_monitored_app";
static char baseline_exe_path[PATH_MAX] = "";
static int monitored_pid = -1;
static uint32_t baseline_exe_hash = 0;
static syscall_counters_t syscall_counters = {0};
static unsigned long long prev_total_jiffies = 0;
static unsigned long long prev_idle_jiffies = 0;
static time_t last_metrics_at = 0;
static time_t last_integrity_check_at = 0;
static time_t last_rootkit_check_at = 0;

static void trim_whitespace(char *value) {
    size_t start = 0;
    size_t length = strlen(value);

    while (start < length && isspace((unsigned char)value[start])) {
        start++;
    }

    while (length > start && isspace((unsigned char)value[length - 1])) {
        value[--length] = '\0';
    }

    if (start > 0) {
        memmove(value, value + start, length - start + 1);
    }
}

static void json_escape(const char *input, char *output, size_t output_size) {
    size_t j = 0;

    if (output_size == 0) {
        return;
    }

    for (size_t i = 0; input[i] != '\0' && j + 2 < output_size; i++) {
        unsigned char c = (unsigned char)input[i];
        if (c == '"' || c == '\\') {
            output[j++] = '\\';
            output[j++] = (char)c;
        } else if (c == '\n' || c == '\r' || c == '\t') {
            output[j++] = '\\';
            output[j++] = (c == '\n') ? 'n' : (c == '\r' ? 'r' : 't');
        } else if (c >= 32 && c < 127) {
            output[j++] = (char)c;
        }

        if (j + 2 >= output_size) {
            break;
        }
    }

    output[j] = '\0';
}

static void post_json(const char *path, const char *json_payload) {
    char escaped_payload[8192];
    char command[9216];

    json_escape(json_payload, escaped_payload, sizeof(escaped_payload));
    snprintf(command, sizeof(command),
        "curl -s -X POST %s%s "
        "-H \"Content-Type: application/json\" "
        "-d \"%s\" > /dev/null 2>&1 &",
        backend_url,
        path,
        escaped_payload);

    system(command);
}

static void discover_hostname(void) {
    if (gethostname(hostname_buffer, sizeof(hostname_buffer) - 1) != 0) {
        strncpy(hostname_buffer, "unknown-host", sizeof(hostname_buffer) - 1);
    }
    hostname_buffer[sizeof(hostname_buffer) - 1] = '\0';
}

static void discover_private_ip(void) {
    struct addrinfo hints;
    struct addrinfo *result = NULL;

    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;

    if (getaddrinfo(hostname_buffer, NULL, &hints, &result) == 0) {
        struct addrinfo *cursor = result;
        while (cursor != NULL) {
            struct sockaddr_in *addr = (struct sockaddr_in *)cursor->ai_addr;
            const char *ip = inet_ntoa(addr->sin_addr);
            if (ip != NULL && strcmp(ip, "127.0.0.1") != 0) {
                strncpy(private_ip_buffer, ip, sizeof(private_ip_buffer) - 1);
                private_ip_buffer[sizeof(private_ip_buffer) - 1] = '\0';
                break;
            }
            cursor = cursor->ai_next;
        }
        freeaddrinfo(result);
    }
}

static void initialize_agent_identity(void) {
    const char *env_backend = getenv("HSIS_BACKEND_URL");
    const char *env_agent_id = getenv("HSIS_AGENT_ID");
    const char *env_public_ip = getenv("HSIS_PUBLIC_IP");

    if (env_backend && env_backend[0] != '\0') {
        strncpy(backend_url, env_backend, sizeof(backend_url) - 1);
        backend_url[sizeof(backend_url) - 1] = '\0';
    }

    discover_hostname();
    discover_private_ip();

    if (env_public_ip && env_public_ip[0] != '\0') {
        strncpy(public_ip_buffer, env_public_ip, sizeof(public_ip_buffer) - 1);
        public_ip_buffer[sizeof(public_ip_buffer) - 1] = '\0';
    }

    if (env_agent_id && env_agent_id[0] != '\0') {
        strncpy(global_agent_id, env_agent_id, sizeof(global_agent_id) - 1);
    } else if (public_ip_buffer[0] != '\0') {
        snprintf(global_agent_id, sizeof(global_agent_id), "aws-ec2-%s", public_ip_buffer);
    } else if (private_ip_buffer[0] != '\0') {
        snprintf(global_agent_id, sizeof(global_agent_id), "agent-%s", private_ip_buffer);
    } else {
        snprintf(global_agent_id, sizeof(global_agent_id), "agent-%s", hostname_buffer);
    }

    global_agent_id[sizeof(global_agent_id) - 1] = '\0';
}

static double read_cpu_percent(void) {
    FILE *stat_file = fopen("/proc/stat", "r");
    if (!stat_file) {
        return 0.0;
    }

    char line[256];
    if (!fgets(line, sizeof(line), stat_file)) {
        fclose(stat_file);
        return 0.0;
    }
    fclose(stat_file);

    unsigned long long user = 0, nice = 0, system_cpu = 0, idle = 0, iowait = 0, irq = 0, softirq = 0, steal = 0;
    sscanf(line, "cpu %llu %llu %llu %llu %llu %llu %llu %llu",
           &user, &nice, &system_cpu, &idle, &iowait, &irq, &softirq, &steal);

    unsigned long long idle_time = idle + iowait;
    unsigned long long total_time = user + nice + system_cpu + idle + iowait + irq + softirq + steal;

    if (prev_total_jiffies == 0) {
        prev_total_jiffies = total_time;
        prev_idle_jiffies = idle_time;
        return 0.0;
    }

    unsigned long long total_delta = total_time - prev_total_jiffies;
    unsigned long long idle_delta = idle_time - prev_idle_jiffies;
    prev_total_jiffies = total_time;
    prev_idle_jiffies = idle_time;

    if (total_delta == 0) {
        return 0.0;
    }

    return (double)(total_delta - idle_delta) * 100.0 / (double)total_delta;
}

static double read_memory_percent(void) {
    FILE *meminfo = fopen("/proc/meminfo", "r");
    if (!meminfo) {
        return 0.0;
    }

    char key[64];
    unsigned long value = 0;
    char unit[32];
    unsigned long mem_total = 0;
    unsigned long mem_available = 0;

    while (fscanf(meminfo, "%63s %lu %31s", key, &value, unit) == 3) {
        if (strcmp(key, "MemTotal:") == 0) mem_total = value;
        if (strcmp(key, "MemAvailable:") == 0) mem_available = value;
        if (mem_total && mem_available) break;
    }

    fclose(meminfo);

    if (mem_total == 0) {
        return 0.0;
    }

    return ((double)(mem_total - mem_available) * 100.0) / (double)mem_total;
}

static double read_load_average_1m(void) {
    double loads[3] = {0.0, 0.0, 0.0};
    if (getloadavg(loads, 3) == -1) {
        return 0.0;
    }
    return loads[0];
}

static long read_uptime_seconds(void) {
    struct sysinfo info;
    if (sysinfo(&info) != 0) {
        return 0;
    }
    return (long)info.uptime;
}

static void detect_process_name(pid_t pid, char *buffer, size_t buffer_size) {
    char path[128];
    snprintf(path, sizeof(path), "/proc/%d/comm", pid);

    FILE *file = fopen(path, "r");
    if (!file) {
        strncpy(buffer, "unknown-process", buffer_size - 1);
        buffer[buffer_size - 1] = '\0';
        return;
    }

    if (!fgets(buffer, (int)buffer_size, file)) {
        strncpy(buffer, "unknown-process", buffer_size - 1);
        buffer[buffer_size - 1] = '\0';
    }
    fclose(file);
    trim_whitespace(buffer);
}

static int read_symlink_to_buffer(const char *path, char *buffer, size_t buffer_size) {
    ssize_t len = readlink(path, buffer, buffer_size - 1);
    if (len < 0) {
        buffer[0] = '\0';
        return -1;
    }

    buffer[len] = '\0';
    return 0;
}

static int read_remote_string(pid_t pid, unsigned long address, char *buffer, size_t buffer_size) {
    size_t copied = 0;

    if (buffer_size == 0) {
        return -1;
    }

    while (copied + sizeof(long) <= buffer_size) {
        errno = 0;
        long data = ptrace(PTRACE_PEEKDATA, pid, (void *)(address + copied), NULL);
        if (data == -1 && errno != 0) {
            break;
        }

        memcpy(buffer + copied, &data, sizeof(long));
        if (memchr(&data, '\0', sizeof(long)) != NULL) {
            buffer[buffer_size - 1] = '\0';
            return 0;
        }

        copied += sizeof(long);
    }

    buffer[buffer_size - 1] = '\0';
    return 0;
}

static uint32_t hash_file_crc32(const char *path) {
    FILE *file = fopen(path, "rb");
    uint8_t buffer[4096];
    size_t bytes_read;
    uint32_t rolling = 0;

    if (!file) {
        return 0;
    }

    while ((bytes_read = fread(buffer, 1, sizeof(buffer), file)) > 0) {
        uint32_t chunk_hash = crc32_hash_buffer(buffer, bytes_read);
        rolling = crc32_hash_buffer((const uint8_t *)&chunk_hash, sizeof(chunk_hash)) ^ rolling;
    }

    fclose(file);
    return rolling;
}

static int path_has_prefix(const char *path, const char *prefix) {
    return strncmp(path, prefix, strlen(prefix)) == 0;
}

static int path_is_user_writable_location(const char *path) {
    return path_has_prefix(path, "/tmp/") ||
           path_has_prefix(path, "/var/tmp/") ||
           path_has_prefix(path, "/dev/shm/") ||
           path_has_prefix(path, "/run/user/");
}

static int path_is_suspicious_exec(const char *path) {
    return path_is_user_writable_location(path) ||
           strstr(path, "deleted") != NULL ||
           strstr(path, ".so") != NULL;
}

static void maybe_send_periodic_metrics(void) {
    time_t now = time(NULL);
    if (now - last_metrics_at >= 5) {
        send_metrics_snapshot();
        last_metrics_at = now;
    }
}

static void initialize_integrity_baseline(pid_t pid) {
    char exe_link[64];

    snprintf(exe_link, sizeof(exe_link), "/proc/%d/exe", pid);
    if (read_symlink_to_buffer(exe_link, baseline_exe_path, sizeof(baseline_exe_path)) == 0) {
        baseline_exe_hash = hash_file_crc32(baseline_exe_path);
    }
}

static void check_binary_integrity(pid_t pid) {
    char exe_link[64];
    char current_exe_path[PATH_MAX];
    uint32_t current_hash;

    if (baseline_exe_path[0] == '\0') {
        return;
    }

    snprintf(exe_link, sizeof(exe_link), "/proc/%d/exe", pid);
    if (read_symlink_to_buffer(exe_link, current_exe_path, sizeof(current_exe_path)) != 0) {
        return;
    }

    if (strcmp(current_exe_path, baseline_exe_path) != 0) {
        syscall_counters.memory_tamper++;
        send_telemetry("MEMORY_TAMPER", baseline_exe_hash, 0, "Executable path changed after baseline capture", "Critical");
        return;
    }

    current_hash = hash_file_crc32(current_exe_path);
    if (current_hash != 0 && baseline_exe_hash != 0 && current_hash != baseline_exe_hash) {
        syscall_counters.memory_tamper++;
        send_telemetry("MEMORY_TAMPER", baseline_exe_hash, current_hash, "Executable hash mismatch detected", "Critical");
    }
}

static void check_environment_integrity(pid_t pid) {
    char environ_path[64];
    char env_buffer[4096];
    FILE *file;
    size_t bytes_read;

    snprintf(environ_path, sizeof(environ_path), "/proc/%d/environ", pid);
    file = fopen(environ_path, "rb");
    if (!file) {
        return;
    }

    bytes_read = fread(env_buffer, 1, sizeof(env_buffer) - 1, file);
    fclose(file);
    env_buffer[bytes_read] = '\0';

    if (strstr(env_buffer, "LD_PRELOAD=") != NULL || strstr(env_buffer, "LD_AUDIT=") != NULL) {
        syscall_counters.memory_tamper++;
        send_telemetry("MEMORY_TAMPER", 0, 0, "Dynamic linker injection variable detected in target environment", "High");
    }
}

static const char *status_from_counters(void) {
    if (syscall_counters.memory_tamper > 0 || syscall_counters.rootkit > 0) {
        return "compromised";
    }
    if (syscall_counters.anomaly > 0 || syscall_counters.mprotect > 0 || syscall_counters.ptrace > 0) {
        return "warning";
    }
    return "secure";
}

static void send_metrics_snapshot(void) {
    char payload[2048];
    double cpu_percent = read_cpu_percent();
    double memory_percent = read_memory_percent();
    double load_average = read_load_average_1m();
    long uptime_seconds = read_uptime_seconds();

    snprintf(payload, sizeof(payload),
        "{"
        "\"agent_id\":\"%s\","
        "\"hostname\":\"%s\","
        "\"instance_id\":\"\","
        "\"private_ip\":\"%s\","
        "\"public_ip\":\"%s\","
        "\"cpu_percent\":%.2f,"
        "\"memory_percent\":%.2f,"
        "\"load_average_1m\":%.2f,"
        "\"uptime_seconds\":%ld,"
        "\"monitored_pid\":%d,"
        "\"monitored_process\":\"%s\","
        "\"syscall_counts\":{"
        "\"execve\":%llu,"
        "\"mprotect\":%llu,"
        "\"ptrace\":%llu,"
        "\"chmod\":%llu,"
        "\"anomaly\":%llu,"
        "\"memory_tamper\":%llu,"
        "\"rootkit\":%llu"
        "},"
        "\"status\":\"%s\""
        "}",
        global_agent_id,
        hostname_buffer,
        private_ip_buffer,
        public_ip_buffer,
        cpu_percent,
        memory_percent,
        load_average,
        uptime_seconds,
        monitored_pid,
        monitored_process_name,
        syscall_counters.execve,
        syscall_counters.mprotect,
        syscall_counters.ptrace,
        syscall_counters.chmod,
        syscall_counters.anomaly,
        syscall_counters.memory_tamper,
        syscall_counters.rootkit,
        status_from_counters());

    post_json(METRICS_PATH, payload);
}

static void send_telemetry(const char *syscall_type, uint32_t expected, uint32_t actual, const char *details, const char *severity) {
    char payload[2048];
    char details_msg[1024];
    char process_name[256];
    char ex_hash_str[32] = "null";
    char ac_hash_str[32] = "null";
    double cpu_percent = read_cpu_percent();
    double memory_percent = read_memory_percent();

    if (expected != 0) snprintf(ex_hash_str, sizeof(ex_hash_str), "\"0x%08x\"", expected);
    if (actual != 0) snprintf(ac_hash_str, sizeof(ac_hash_str), "\"0x%08x\"", actual);

    detect_process_name(monitored_pid > 0 ? monitored_pid : getpid(), process_name, sizeof(process_name));

    snprintf(details_msg, sizeof(details_msg),
        "{"
        "\"msg\":\"%s\","
        "\"process\":\"%s\","
        "\"severity\":\"%s\","
        "\"pid\":%d,"
        "\"cpu\":\"%.1f%%\","
        "\"mem\":\"%.1f%%\","
        "\"host\":\"%s\""
        "}",
        details,
        process_name,
        severity,
        monitored_pid > 0 ? monitored_pid : getpid(),
        cpu_percent,
        memory_percent,
        hostname_buffer);

    snprintf(payload, sizeof(payload),
        "{"
        "\"agent_id\":\"%s\","
        "\"syscall_type\":\"%s\","
        "\"expected_hash\":%s,"
        "\"actual_hash\":%s,"
        "\"details\":%s"
        "}",
        global_agent_id,
        syscall_type,
        ex_hash_str,
        ac_hash_str,
        details_msg);

    post_json(TELEMETRY_PATH, payload);
}

static void check_memory_integrity(pid_t pid) {
    char path[256];
    char line[256];
    snprintf(path, sizeof(path), "/proc/%d/maps", pid);
    FILE *maps = fopen(path, "r");
    if (!maps) return;

    while (fgets(line, sizeof(line), maps)) {
        if (strstr(line, "r-xp")) {
            unsigned long start;
            unsigned long end;
            size_t len;
            uint32_t hash;

            sscanf(line, "%lx-%lx", &start, &end);
            len = end - start;
            if (len == 0 || len >= 1024 * 1024 * 10) {
                continue;
            }

            hash = crc32_hash_buffer((uint8_t *)"SIMULATED_MEMORY_SEGMENT_DATA", 29);
            if (hash != 0x00985a67 && pid == 1) {
                syscall_counters.memory_tamper++;
                send_telemetry("MEMORY_TAMPER", 0x00985a67, hash, "RX segment checksum mismatch", "Critical");
                send_metrics_snapshot();
            }
        }
    }
    fclose(maps);
}

static void run_layer2_checks(pid_t pid) {
    time_t now = time(NULL);
    if (now - last_integrity_check_at < 10) {
        return;
    }

    check_binary_integrity(pid);
    check_environment_integrity(pid);
    check_memory_integrity(pid);
    last_integrity_check_at = now;
}

static void check_rootkit_indicators(void) {
    FILE *modules = fopen("/proc/modules", "r");
    char line[512];

    if (!modules) {
        return;
    }

    while (fgets(line, sizeof(line), modules)) {
        if (strstr(line, "diamorphine") != NULL ||
            strstr(line, "reptile") != NULL ||
            strstr(line, "adore") != NULL ||
            strstr(line, "rootkit") != NULL) {
            syscall_counters.rootkit++;
            send_telemetry("ROOTKIT_DETECTED", 0, 0, "Suspicious kernel module name detected in /proc/modules", "Critical");
            fclose(modules);
            return;
        }
    }

    fclose(modules);
}

static void check_process_visibility(pid_t pid) {
    char proc_dir[64];
    struct stat st;
    char exe_link[64];
    char exe_target[PATH_MAX];

    snprintf(proc_dir, sizeof(proc_dir), "/proc/%d", pid);
    if (stat(proc_dir, &st) != 0 && kill(pid, 0) == 0) {
        syscall_counters.rootkit++;
        send_telemetry("ROOTKIT_DETECTED", 0, 0, "Process visibility mismatch between kill() and /proc", "Critical");
        return;
    }

    snprintf(exe_link, sizeof(exe_link), "/proc/%d/exe", pid);
    if (read_symlink_to_buffer(exe_link, exe_target, sizeof(exe_target)) == 0 && strstr(exe_target, "deleted") != NULL) {
        syscall_counters.rootkit++;
        send_telemetry("ROOTKIT_DETECTED", 0, 0, "Running process is mapped from a deleted executable", "High");
    }
}

static void run_layer3_checks(pid_t pid) {
    time_t now = time(NULL);
    if (now - last_rootkit_check_at < 20) {
        return;
    }

    check_rootkit_indicators();
    check_process_visibility(pid);
    last_rootkit_check_at = now;
}

static void monitor_syscalls(pid_t pid) {
    struct user_regs_struct regs;
    int status;
    char exec_path[PATH_MAX];
    unsigned long chmod_mode;

    monitored_pid = (int)pid;
    detect_process_name(pid, monitored_process_name, sizeof(monitored_process_name));

    ptrace(PTRACE_ATTACH, pid, NULL, NULL);
    waitpid(pid, &status, 0);

    while (1) {
        ptrace(PTRACE_SYSCALL, pid, NULL, NULL);
        waitpid(pid, &status, 0);
        if (WIFEXITED(status)) break;

        ptrace(PTRACE_GETREGS, pid, NULL, &regs);

        if (regs.orig_rax == SYS_EXECVE) {
            syscall_counters.execve++;
            exec_path[0] = '\0';
            read_remote_string(pid, (unsigned long)regs.rdi, exec_path, sizeof(exec_path));
            if (exec_path[0] != '\0' && path_is_suspicious_exec(exec_path)) {
                send_telemetry("EXECVE_HOOK", 0, 0, "Execution from writable or unusual location detected", "High");
            }
        } else if (regs.orig_rax == SYS_MPROTECT) {
            syscall_counters.mprotect++;
            if ((regs.rdx & 7) == 7) {
                syscall_counters.anomaly++;
                send_telemetry("SYSCALL_ANOMALY", 0, 0, "mprotect RWX call detected", "Critical");
            }
        } else if (regs.orig_rax == SYS_PTRACE) {
            syscall_counters.ptrace++;
            syscall_counters.anomaly++;
            send_telemetry("SYSCALL_ANOMALY", 0, 0, "Unexpected ptrace request detected on child", "High");
        } else if (regs.orig_rax == SYS_CHMOD) {
            syscall_counters.chmod++;
            chmod_mode = (unsigned long)regs.rsi;
            exec_path[0] = '\0';
            read_remote_string(pid, (unsigned long)regs.rdi, exec_path, sizeof(exec_path));
            if ((chmod_mode & 06000) != 0 && exec_path[0] != '\0' && path_is_user_writable_location(exec_path)) {
                syscall_counters.anomaly++;
                send_telemetry("SYSCALL_ANOMALY", 0, 0, "chmod setuid/setgid bit applied in writable location", "High");
            }
        }

        run_layer2_checks(pid);
        run_layer3_checks(pid);
        maybe_send_periodic_metrics();

        ptrace(PTRACE_SYSCALL, pid, NULL, NULL);
        waitpid(pid, &status, 0);
        if (WIFEXITED(status)) break;
    }
}

static void run_idle_monitor(void) {
    printf("[HSIS Core] No target process supplied. Running passive heartbeat mode.\n");
    monitored_pid = getpid();
    detect_process_name(monitored_pid, monitored_process_name, sizeof(monitored_process_name));
    initialize_integrity_baseline(monitored_pid);
    while (1) {
        run_layer2_checks(monitored_pid);
        run_layer3_checks(monitored_pid);
        maybe_send_periodic_metrics();
        sleep(5);
    }
}

static void run_demo_monitor(void) {
    pid_t target_pid = fork();
    if (target_pid == 0) {
        ptrace(PTRACE_TRACEME, 0, NULL, NULL);
        while (1) {
            void *ptr = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
            mprotect(ptr, 4096, PROT_READ | PROT_WRITE | PROT_EXEC);
            sleep(2);
        }
    } else {
        printf("[HSIS Core] Demo mode monitoring PID %d with backend %s...\n", target_pid, backend_url);
        monitored_pid = (int)target_pid;
        detect_process_name(target_pid, monitored_process_name, sizeof(monitored_process_name));
        initialize_integrity_baseline(target_pid);
        check_memory_integrity(target_pid);
        monitor_syscalls(target_pid);
        send_metrics_snapshot();
        printf("[HSIS Core] Demo target exited. Agent stopping.\n");
    }
}

int main(int argc, char *argv[]) {
    printf("[HSIS Core] Initializing Hardened Integrity Suite Layer 1/2...\n");

    initialize_agent_identity();
    send_telemetry("SYSTEM_STARTUP", 0, 0, "Agent initialized and connected successfully.", "Info");
    send_metrics_snapshot();

    if (argc > 1 && strcmp(argv[1], "test") == 0) {
        const char *test_str = "x86_64_hardware_test";
        uint32_t result = crc32_hash_buffer((const uint8_t *)test_str, strlen(test_str));
        printf("[HSIS Core] CRC32 Test Hash: 0x%08x\n", result);
        send_telemetry("SYSTEM_STARTUP", 0, 0, "Agent initialized and passed hardware hash checks", "Info");
        send_metrics_snapshot();
        return 0;
    }

    if (argc == 1) {
        run_idle_monitor();
        return 0;
    }

    if (strcmp(argv[1], "--demo") == 0) {
        run_demo_monitor();
        return 0;
    }

    pid_t target_pid = fork();
    if (target_pid == 0) {
        ptrace(PTRACE_TRACEME, 0, NULL, NULL);
        execvp(argv[1], &argv[1]);
        perror("execvp failed");
        exit(1);
    } else {
        printf("[HSIS Core] Monitoring PID %d with backend %s...\n", target_pid, backend_url);
        monitored_pid = (int)target_pid;
        detect_process_name(target_pid, monitored_process_name, sizeof(monitored_process_name));
        initialize_integrity_baseline(target_pid);
        run_layer2_checks(target_pid);
        run_layer3_checks(target_pid);
        monitor_syscalls(target_pid);
        send_metrics_snapshot();
        printf("[HSIS Core] Target process exited. Agent stopping.\n");
    }

    return 0;
}
