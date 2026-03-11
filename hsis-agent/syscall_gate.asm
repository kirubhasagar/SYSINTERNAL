; syscall_gate.asm
; Layer 1/2 Assembly Stubs for Hardened System Integrity Suite (HSIS)

section .text
global save_regs_and_call
global crc32_hash_buffer

; ==============================================================================
; save_regs_and_call: 
; Safely saves volatile registers before delegating to C-level inspection logic
; to ensure zero-drift integrity of the monitored process states.
; Prototype: void save_regs_and_call(void (*callback)(struct user_regs_struct*), struct user_regs_struct *regs);
; ==============================================================================
save_regs_and_call:
    ; RDI = callback function pointer
    ; RSI = regs pointer
    
    ; Save caller-saved registers that we care about
    push rax
    push rcx
    push rdx
    push r8
    push r9
    push r10
    push r11

    ; Move regs pointer to RDI (first argument for callback)
    mov rdi, rsi
    
    ; Call the C inspection logic
    call rax

    ; Restore registers exactly as they were
    pop r11
    pop r10
    pop r9
    pop r8
    pop rdx
    pop rcx
    pop rax
    
    ret


; ==============================================================================
; crc32_hash_buffer: 
; Ultra-fast hardware-accelerated CRC32 implementation using SSE4.2 instructions
; for hashing memory segments parsed from /proc/self/maps. 
; This ensures incredibly fast Layer-2 checksumming.
; Prototype: uint32_t crc32_hash_buffer(const uint8_t *buffer, size_t length);
; ==============================================================================
crc32_hash_buffer:
    ; RDI = buffer pointer
    ; RSI = length
    
    xor eax, eax            ; Clear accumulators
    mov ecx, esi            ; length into rcx (counter)
    test rcx, rcx           ; handle 0 length
    jz .done

    ; Initial CRC value (standard starting point)
    mov eax, 0xFFFFFFFF
    
.align_loop:
    cmp rcx, 8              ; Can we do 8 bytes at once?
    jl .byte_loop
    
    ; Hardware accelerated 64-bit CRC32
    crc32 rax, qword [rdi]
    add rdi, 8
    sub rcx, 8
    jmp .align_loop

.byte_loop:
    test rcx, rcx
    jz .done

    ; Hardware accelerated 8-bit CRC32 for remaining bytes
    crc32 eax, byte [rdi]
    inc rdi
    dec rcx
    jmp .byte_loop

.done:
    not eax                 ; Finalize CRC32 protocol
    ret
