CC=gcc
ASM=nasm
CFLAGS=-Wall -Wextra -O2 -pthread -fPIC
LDFLAGS=

ASMFLAGS=-f elf64

SRC_C=monitor.c
SRC_ASM=syscall_gate.asm

OBJ_C=$(SRC_C:.c=.o)
OBJ_ASM=$(SRC_ASM:.asm=.o)

TARGET=hsis_agent

all: $(TARGET)

$(TARGET): $(OBJ_C) $(OBJ_ASM)
	$(CC) $(OBJ_C) $(OBJ_ASM) -o $(TARGET) $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

%.o: %.asm
	$(ASM) $(ASMFLAGS) $< -o $@

clean:
	rm -f *.o $(TARGET)

install: $(TARGET)
	@echo "Installing HSIS Agent to /usr/local/bin/"
	@cp $(TARGET) /usr/local/bin/
	@echo "Installation complete."

test: $(TARGET)
	@echo "Running local integrity checksum test..."
	./$(TARGET) test

.PHONY: all clean install test
