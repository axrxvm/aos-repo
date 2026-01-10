/**
 * Constants for the AKM Compiler
 */

// Capability flags (must match kmodule_api.h)
const CAPABILITIES = {
    NONE:       0x00000000,
    COMMAND:    0x00000001,
    DRIVER:     0x00000002,
    FILESYSTEM: 0x00000004,
    NETWORK:    0x00000008,
    ENVVAR:     0x00000010,
    PROCESS:    0x00000020,
    MEMORY:     0x00000040,
    IRQ:        0x00000080,
    IO_PORT:    0x00000100,
    PCI:        0x00000200,
    TIMER:      0x00000400,
    LOG:        0x00000800,
    SYSINFO:    0x00001000,
    USER:       0x00002000,
    SECURITY:   0x00004000,
    PANIC:      0x00008000,
    DEBUG:      0x00010000,
    IPC:        0x00020000,
    CRYPTO:     0x00040000,
    ACPI:       0x00080000,
    ALL:        0xFFFFFFFF
};

// Capability combinations
CAPABILITIES.BASIC = CAPABILITIES.LOG | CAPABILITIES.MEMORY | CAPABILITIES.SYSINFO;
CAPABILITIES.DEVICE_DRIVER = CAPABILITIES.BASIC | CAPABILITIES.DRIVER | CAPABILITIES.IRQ | CAPABILITIES.IO_PORT | CAPABILITIES.PCI;
CAPABILITIES.NET_DRIVER = CAPABILITIES.DEVICE_DRIVER | CAPABILITIES.NETWORK;
CAPABILITIES.FS_MODULE = CAPABILITIES.BASIC | CAPABILITIES.FILESYSTEM;
CAPABILITIES.SHELL_MODULE = CAPABILITIES.BASIC | CAPABILITIES.COMMAND | CAPABILITIES.ENVVAR;

// API functions and their required capabilities
const API_FUNCTIONS = {
    // Logging
    log:        { capability: CAPABILITIES.LOG, argCount: 2 },
    info:       { capability: CAPABILITIES.LOG, argCount: 1 },
    warn:       { capability: CAPABILITIES.LOG, argCount: 1 },
    error:      { capability: CAPABILITIES.LOG, argCount: 1 },
    debug:      { capability: CAPABILITIES.DEBUG, argCount: 1 },
    hexdump:    { capability: CAPABILITIES.DEBUG, argCount: 2 },

    // Memory
    malloc:     { capability: CAPABILITIES.MEMORY, argCount: 1 },
    calloc:     { capability: CAPABILITIES.MEMORY, argCount: 2 },
    realloc:    { capability: CAPABILITIES.MEMORY, argCount: 2 },
    free:       { capability: CAPABILITIES.MEMORY, argCount: 1 },
    allocPage:  { capability: CAPABILITIES.MEMORY, argCount: 0 },
    freePage:   { capability: CAPABILITIES.MEMORY, argCount: 1 },

    // Commands
    registerCommand:    { capability: CAPABILITIES.COMMAND, argCount: 1 },
    unregisterCommand:  { capability: CAPABILITIES.COMMAND, argCount: 1 },

    // Environment
    getenv:     { capability: CAPABILITIES.ENVVAR, argCount: 1 },
    setenv:     { capability: CAPABILITIES.ENVVAR, argCount: 2 },
    unsetenv:   { capability: CAPABILITIES.ENVVAR, argCount: 1 },

    // Drivers
    registerDriver:     { capability: CAPABILITIES.DRIVER, argCount: 1 },
    unregisterDriver:   { capability: CAPABILITIES.DRIVER, argCount: 1 },

    // Filesystem
    registerFS:     { capability: CAPABILITIES.FILESYSTEM, argCount: 1 },
    unregisterFS:   { capability: CAPABILITIES.FILESYSTEM, argCount: 1 },
    open:           { capability: CAPABILITIES.FILESYSTEM, argCount: 2 },
    close:          { capability: CAPABILITIES.FILESYSTEM, argCount: 1 },
    read:           { capability: CAPABILITIES.FILESYSTEM, argCount: 3 },
    write:          { capability: CAPABILITIES.FILESYSTEM, argCount: 3 },
    seek:           { capability: CAPABILITIES.FILESYSTEM, argCount: 3 },

    // Network
    registerNetif:      { capability: CAPABILITIES.NETWORK, argCount: 2 },
    unregisterNetif:    { capability: CAPABILITIES.NETWORK, argCount: 1 },
    netifReceive:       { capability: CAPABILITIES.NETWORK, argCount: 3 },

    // IRQ
    registerIRQ:    { capability: CAPABILITIES.IRQ, argCount: 3 },
    unregisterIRQ:  { capability: CAPABILITIES.IRQ, argCount: 1 },
    enableIRQ:      { capability: CAPABILITIES.IRQ, argCount: 1 },
    disableIRQ:     { capability: CAPABILITIES.IRQ, argCount: 1 },

    // I/O Ports
    outb:       { capability: CAPABILITIES.IO_PORT, argCount: 2 },
    outw:       { capability: CAPABILITIES.IO_PORT, argCount: 2 },
    outl:       { capability: CAPABILITIES.IO_PORT, argCount: 2 },
    inb:        { capability: CAPABILITIES.IO_PORT, argCount: 1 },
    inw:        { capability: CAPABILITIES.IO_PORT, argCount: 1 },
    inl:        { capability: CAPABILITIES.IO_PORT, argCount: 1 },
    ioWait:     { capability: CAPABILITIES.IO_PORT, argCount: 0 },

    // PCI
    pciFindDevice:  { capability: CAPABILITIES.PCI, argCount: 2 },
    pciFindClass:   { capability: CAPABILITIES.PCI, argCount: 2 },
    pciReadConfig:  { capability: CAPABILITIES.PCI, argCount: 2 },
    pciWriteConfig: { capability: CAPABILITIES.PCI, argCount: 3 },
    pciEnableBusmaster: { capability: CAPABILITIES.PCI, argCount: 1 },

    // Timers
    createTimer:    { capability: CAPABILITIES.TIMER, argCount: 3 },
    startTimer:     { capability: CAPABILITIES.TIMER, argCount: 1 },
    stopTimer:      { capability: CAPABILITIES.TIMER, argCount: 1 },
    destroyTimer:   { capability: CAPABILITIES.TIMER, argCount: 1 },
    getTicks:       { capability: CAPABILITIES.TIMER, argCount: 0 },
    sleep:          { capability: CAPABILITIES.TIMER, argCount: 1 },

    // Process
    spawn:          { capability: CAPABILITIES.PROCESS, argCount: 3 },
    kill:           { capability: CAPABILITIES.PROCESS, argCount: 2 },
    getpid:         { capability: CAPABILITIES.PROCESS, argCount: 0 },
    yield:          { capability: CAPABILITIES.PROCESS, argCount: 0 },

    // System Info
    getSysinfo:     { capability: CAPABILITIES.SYSINFO, argCount: 0 },
    getKernelVersion: { capability: CAPABILITIES.SYSINFO, argCount: 0 },

    // IPC
    ipcSend:        { capability: CAPABILITIES.IPC, argCount: 3 },
    ipcReceive:     { capability: CAPABILITIES.IPC, argCount: 2 },
    ipcCreateChannel:   { capability: CAPABILITIES.IPC, argCount: 1 },
    ipcDestroyChannel:  { capability: CAPABILITIES.IPC, argCount: 1 },

    // Crypto
    sha256:         { capability: CAPABILITIES.CRYPTO, argCount: 2 },
    randomBytes:    { capability: CAPABILITIES.CRYPTO, argCount: 2 },

    // User
    getCurrentUID:  { capability: CAPABILITIES.USER, argCount: 0 },
    getUsername:    { capability: CAPABILITIES.USER, argCount: 1 },
    checkPermission: { capability: CAPABILITIES.USER, argCount: 2 }
};

// AKM bytecode opcodes
const OPCODES = {
    // Stack operations
    NOP:        0x00,
    PUSH:       0x01,
    PUSH_STR:   0x02,
    PUSH_ARG:   0x03,
    POP:        0x04,
    DUP:        0x05,
    SWAP:       0x06,

    // Load/Store
    LOAD_LOCAL:     0x10,
    STORE_LOCAL:    0x11,
    LOAD_GLOBAL:    0x12,
    STORE_GLOBAL:   0x13,

    // Arithmetic
    ADD:        0x20,
    SUB:        0x21,
    MUL:        0x22,
    DIV:        0x23,
    MOD:        0x24,
    NEG:        0x25,
    INC:        0x26,
    DEC:        0x27,

    // Bitwise
    AND:        0x30,
    OR:         0x31,
    XOR:        0x32,
    NOT:        0x33,
    SHL:        0x34,
    SHR:        0x35,

    // Comparison
    EQ:         0x40,
    NE:         0x41,
    LT:         0x42,
    LE:         0x43,
    GT:         0x44,
    GE:         0x45,

    // Control flow
    JMP:        0x50,
    JZ:         0x51,
    JNZ:        0x52,
    CALL:       0x53,
    CALL_API:   0x54,
    RET:        0x55,

    // Memory
    LOAD8:      0x60,
    LOAD16:     0x61,
    LOAD32:     0x62,
    STORE8:     0x63,
    STORE16:    0x64,
    STORE32:    0x65,

    // Special
    SYSCALL:    0x70,
    BREAKPOINT: 0x71,
    HALT:       0x7F
};

// AKM file format constants
const AKM_FORMAT = {
    MAGIC_V1: 0x004D4B41,   // "AKM\0"
    MAGIC_V2: 0x324D4B41,   // "AKM2"
    FORMAT_VERSION: 2,
    HEADER_SIZE: 512,

    // Section types
    SECTION_CODE:   1,
    SECTION_DATA:   2,
    SECTION_RODATA: 3,
    SECTION_BSS:    4,
    SECTION_SYMTAB: 5,
    SECTION_STRTAB: 6,
    SECTION_RELTAB: 7,

    // Symbol types
    SYM_NOTYPE: 0,
    SYM_FUNC:   1,
    SYM_DATA:   2,
    SYM_SECTION: 3,

    // Symbol bindings
    BIND_LOCAL:     0,
    BIND_GLOBAL:    1,
    BIND_WEAK:      2,

    // Module flags
    FLAG_REQUIRED:  0x0001,
    FLAG_AUTOLOAD:  0x0002,
    FLAG_HOTPLUG:   0x0004,
    FLAG_DEBUG:     0x0008,
    FLAG_NATIVE:    0x0010
};

// License strings
const LICENSES = {
    PROPRIETARY: 'Proprietary',
    GPL: 'GPL',
    BSD: 'BSD',
    MIT: 'MIT',
    CCBYNC: 'CC-BY-NC-4.0',
    DUAL: 'Dual BSD/GPL'
};

module.exports = {
    CAPABILITIES,
    API_FUNCTIONS,
    OPCODES,
    AKM_FORMAT,
    LICENSES
};
