#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <unistd.h>

int main() {
    printf("[*] Starting Simulated Attack Payload...\n");
    
    // Test 1: Trigger SYSCALL_ANOMALY (RWX Memory Mprotect Tampering)
    printf("[*] Test 1: Allocating RWX memory (should trigger mprotect alert)...\n");
    void *ptr = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (ptr != MAP_FAILED) {
        mprotect(ptr, 4096, PROT_READ | PROT_WRITE | PROT_EXEC);
    }
    sleep(1);

    // Test 2: Trigger EXECVE_HOOK (Executing a new shell)
    printf("[*] Test 2: Executing suspicious binary (should trigger execve alert)...\n");
    char *args[] = {"/bin/ls", NULL};
    execve("/bin/ls", args, NULL);

    return 0;
}
