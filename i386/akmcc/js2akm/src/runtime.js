/**
 * AKM Runtime Library
 * 
 * This file defines the AKM global object and its API that modules use.
 * It's not included in the compiled output - it serves as documentation
 * and type definitions for module authors.
 */

// Capability constants
const CAPS = {
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
    ALL:        0xFFFFFFFF,
    
    // Combinations
    get BASIC() { return this.LOG | this.MEMORY | this.SYSINFO; },
    get DEVICE_DRIVER() { return this.BASIC | this.DRIVER | this.IRQ | this.IO_PORT | this.PCI; },
    get NET_DRIVER() { return this.DEVICE_DRIVER | this.NETWORK; },
    get FS_MODULE() { return this.BASIC | this.FILESYSTEM; },
    get SHELL_MODULE() { return this.BASIC | this.COMMAND | this.ENVVAR; }
};

// Driver types
const DRV_TYPE = {
    CHAR:       1,
    BLOCK:      2,
    NET:        3,
    INPUT:      4,
    DISPLAY:    5,
    SOUND:      6,
    STORAGE:    7,
    BUS:        8
};

// Log levels
const LOG_LEVEL = {
    EMERG:      0,
    ALERT:      1,
    CRIT:       2,
    ERR:        3,
    WARNING:    4,
    NOTICE:     5,
    INFO:       6,
    DEBUG:      7
};

// File open flags
const O = {
    RDONLY:     0x0000,
    WRONLY:     0x0001,
    RDWR:       0x0002,
    CREAT:      0x0040,
    TRUNC:      0x0200,
    APPEND:     0x0400
};

// Seek modes
const SEEK = {
    SET:        0,
    CUR:        1,
    END:        2
};

/**
 * The AKM global object - available to all modules
 */
const AKM = {
    // Constants
    CAPS: CAPS,
    DRV_TYPE: DRV_TYPE,
    LOG_LEVEL: LOG_LEVEL,
    O: O,
    SEEK: SEEK,

    // =========================================================================
    // MODULE DECLARATION
    // =========================================================================

    /**
     * Declare module metadata
     * @param {Object} config Module configuration
     * @param {string} config.name Module name (max 32 chars)
     * @param {string} config.version Semantic version
     * @param {string} [config.author] Author name
     * @param {string} [config.description] Module description
     * @param {string} [config.license] License identifier
     * @param {number} [config.capabilities] Required capabilities
     * @param {string[]} [config.dependencies] Module dependencies
     */
    module(config) {},

    /**
     * Register a shell command
     * @param {Object} cmdConfig Command configuration
     * @param {string} cmdConfig.name Command name
     * @param {string} cmdConfig.syntax Usage syntax
     * @param {string} cmdConfig.description Help text
     * @param {string} cmdConfig.category Command category
     * @param {Function} handler Command handler function
     */
    command(cmdConfig, handler) {},

    // =========================================================================
    // LOGGING
    // =========================================================================

    /**
     * Log a message with level
     * @param {number} level Log level
     * @param {string} message Message to log
     */
    log(level, message) {},

    /**
     * Log info message
     * @param {string} message Message to log
     */
    info(message) {},

    /**
     * Log warning message
     * @param {string} message Message to log
     */
    warn(message) {},

    /**
     * Log error message
     * @param {string} message Message to log
     */
    error(message) {},

    /**
     * Log debug message (requires DEBUG capability)
     * @param {string} message Message to log
     */
    debug(message) {},

    /**
     * Dump data in hex format (requires DEBUG capability)
     * @param {*} data Data to dump
     * @param {number} length Number of bytes
     */
    hexdump(data, length) {},

    // =========================================================================
    // MEMORY
    // =========================================================================

    /**
     * Allocate memory
     * @param {number} size Size in bytes
     * @returns {number} Pointer or null
     */
    malloc(size) {},

    /**
     * Allocate zeroed memory
     * @param {number} count Number of elements
     * @param {number} size Size of each element
     * @returns {number} Pointer or null
     */
    calloc(count, size) {},

    /**
     * Reallocate memory
     * @param {number} ptr Existing pointer
     * @param {number} size New size
     * @returns {number} New pointer or null
     */
    realloc(ptr, size) {},

    /**
     * Free memory
     * @param {number} ptr Pointer to free
     */
    free(ptr) {},

    /**
     * Allocate a page of memory
     * @returns {number} Page pointer or null
     */
    allocPage() {},

    /**
     * Free a page of memory
     * @param {number} page Page pointer
     */
    freePage(page) {},

    // =========================================================================
    // ENVIRONMENT VARIABLES
    // =========================================================================

    /**
     * Get environment variable
     * @param {string} name Variable name
     * @returns {string|null} Value or null if not set
     */
    getenv(name) {},

    /**
     * Set environment variable
     * @param {string} name Variable name
     * @param {string} value Value
     * @returns {number} 0 on success, negative on error
     */
    setenv(name, value) {},

    /**
     * Unset environment variable
     * @param {string} name Variable name
     * @returns {number} 0 on success, negative on error
     */
    unsetenv(name) {},

    // =========================================================================
    // TIMERS
    // =========================================================================

    /**
     * Create a timer
     * @param {number} intervalMs Interval in milliseconds
     * @param {Function} callback Timer callback
     * @param {*} data User data passed to callback
     * @returns {number} Timer handle or null
     */
    createTimer(intervalMs, callback, data) {},

    /**
     * Start a timer
     * @param {number} timer Timer handle
     */
    startTimer(timer) {},

    /**
     * Stop a timer
     * @param {number} timer Timer handle
     */
    stopTimer(timer) {},

    /**
     * Destroy a timer
     * @param {number} timer Timer handle
     */
    destroyTimer(timer) {},

    /**
     * Get current tick count
     * @returns {number} Tick count
     */
    getTicks() {},

    /**
     * Sleep for milliseconds
     * @param {number} ms Milliseconds to sleep
     */
    sleep(ms) {},

    // =========================================================================
    // PCI
    // =========================================================================

    /**
     * Find PCI device by vendor/device ID
     * @param {number} vendorId Vendor ID
     * @param {number} deviceId Device ID
     * @returns {Object|null} PCI device info or null
     */
    pciFindDevice(vendorId, deviceId) {},

    /**
     * Find PCI device by class
     * @param {number} classCode Class code
     * @param {number} subclass Subclass
     * @returns {Object|null} PCI device info or null
     */
    pciFindClass(classCode, subclass) {},

    /**
     * Read PCI config register
     * @param {Object} device PCI device
     * @param {number} offset Register offset
     * @returns {number} Value read
     */
    pciReadConfig(device, offset) {},

    /**
     * Write PCI config register
     * @param {Object} device PCI device
     * @param {number} offset Register offset
     * @param {number} value Value to write
     */
    pciWriteConfig(device, offset, value) {},

    /**
     * Enable bus mastering for device
     * @param {Object} device PCI device
     */
    pciEnableBusmaster(device) {},

    // =========================================================================
    // I/O PORTS
    // =========================================================================

    /**
     * Write byte to I/O port
     * @param {number} port Port number
     * @param {number} value Byte value
     */
    outb(port, value) {},

    /**
     * Write word to I/O port
     * @param {number} port Port number
     * @param {number} value Word value
     */
    outw(port, value) {},

    /**
     * Write dword to I/O port
     * @param {number} port Port number
     * @param {number} value Dword value
     */
    outl(port, value) {},

    /**
     * Read byte from I/O port
     * @param {number} port Port number
     * @returns {number} Byte value
     */
    inb(port) {},

    /**
     * Read word from I/O port
     * @param {number} port Port number
     * @returns {number} Word value
     */
    inw(port) {},

    /**
     * Read dword from I/O port
     * @param {number} port Port number
     * @returns {number} Dword value
     */
    inl(port) {},

    /**
     * Wait for I/O completion
     */
    ioWait() {},

    // =========================================================================
    // IRQ
    // =========================================================================

    /**
     * Register IRQ handler
     * @param {number} irq IRQ number
     * @param {Function} handler Handler function
     * @param {*} data User data
     * @returns {number} 0 on success
     */
    registerIRQ(irq, handler, data) {},

    /**
     * Unregister IRQ handler
     * @param {number} irq IRQ number
     * @returns {number} 0 on success
     */
    unregisterIRQ(irq) {},

    /**
     * Enable IRQ
     * @param {number} irq IRQ number
     */
    enableIRQ(irq) {},

    /**
     * Disable IRQ
     * @param {number} irq IRQ number
     */
    disableIRQ(irq) {},

    // =========================================================================
    // SYSTEM INFO
    // =========================================================================

    /**
     * Get system information
     * @returns {Object} System info object
     */
    getSysinfo() {},

    /**
     * Get kernel version
     * @returns {number} Version number (major<<16 | minor<<8 | patch)
     */
    getKernelVersion() {},

    // =========================================================================
    // PROCESSES
    // =========================================================================

    /**
     * Spawn a new process
     * @param {string} name Process name
     * @param {Function} entry Entry point
     * @param {number} priority Priority level
     * @returns {number} PID or negative on error
     */
    spawn(name, entry, priority) {},

    /**
     * Kill a process
     * @param {number} pid Process ID
     * @param {number} signal Signal number
     * @returns {number} 0 on success
     */
    kill(pid, signal) {},

    /**
     * Get current process ID
     * @returns {number} PID
     */
    getpid() {},

    /**
     * Yield CPU to other processes
     */
    yield() {},

    // =========================================================================
    // IPC
    // =========================================================================

    /**
     * Send IPC message
     * @param {number} destPid Destination PID
     * @param {*} message Message data
     * @param {number} length Message length
     * @returns {number} 0 on success
     */
    ipcSend(destPid, message, length) {},

    /**
     * Receive IPC message
     * @param {*} buffer Buffer for message
     * @param {number} maxLength Maximum length
     * @returns {number} Bytes received or negative on error
     */
    ipcReceive(buffer, maxLength) {},

    /**
     * Create IPC channel
     * @param {string} name Channel name
     * @returns {number} Channel ID or negative on error
     */
    ipcCreateChannel(name) {},

    /**
     * Destroy IPC channel
     * @param {number} channelId Channel ID
     * @returns {number} 0 on success
     */
    ipcDestroyChannel(channelId) {},

    // =========================================================================
    // CRYPTO
    // =========================================================================

    /**
     * Calculate SHA-256 hash
     * @param {*} data Data to hash
     * @param {number} length Data length
     * @param {*} output Output buffer (32 bytes)
     */
    sha256(data, length, output) {},

    /**
     * Generate random bytes
     * @param {*} buffer Output buffer
     * @param {number} length Number of bytes
     */
    randomBytes(buffer, length) {},

    // =========================================================================
    // DRIVERS
    // =========================================================================

    /**
     * Register a driver
     * @param {Object} driver Driver configuration
     * @returns {number} 0 on success
     */
    registerDriver(driver) {},

    /**
     * Unregister a driver
     * @param {string} name Driver name
     * @returns {number} 0 on success
     */
    unregisterDriver(name) {},

    // =========================================================================
    // FILESYSTEM
    // =========================================================================

    /**
     * Register a filesystem
     * @param {Object} fs Filesystem configuration
     * @returns {number} 0 on success
     */
    registerFS(fs) {},

    /**
     * Unregister a filesystem
     * @param {string} name Filesystem name
     * @returns {number} 0 on success
     */
    unregisterFS(name) {},

    /**
     * Open a file
     * @param {string} path File path
     * @param {number} flags Open flags
     * @returns {number} File descriptor or negative on error
     */
    open(path, flags) {},

    /**
     * Close a file
     * @param {number} fd File descriptor
     * @returns {number} 0 on success
     */
    close(fd) {},

    /**
     * Read from file
     * @param {number} fd File descriptor
     * @param {*} buffer Buffer
     * @param {number} size Bytes to read
     * @returns {number} Bytes read or negative on error
     */
    read(fd, buffer, size) {},

    /**
     * Write to file
     * @param {number} fd File descriptor
     * @param {*} buffer Buffer
     * @param {number} size Bytes to write
     * @returns {number} Bytes written or negative on error
     */
    write(fd, buffer, size) {},

    /**
     * Seek in file
     * @param {number} fd File descriptor
     * @param {number} offset Offset
     * @param {number} whence SEEK_SET, SEEK_CUR, or SEEK_END
     * @returns {number} New position or negative on error
     */
    seek(fd, offset, whence) {},

    // =========================================================================
    // NETWORK
    // =========================================================================

    /**
     * Register network interface
     * @param {string} name Interface name
     * @param {Object} ops Interface operations
     * @returns {Object|null} Interface handle or null
     */
    registerNetif(name, ops) {},

    /**
     * Unregister network interface
     * @param {Object} iface Interface handle
     * @returns {number} 0 on success
     */
    unregisterNetif(iface) {},

    /**
     * Receive packet on interface
     * @param {Object} iface Interface handle
     * @param {*} packet Packet data
     * @param {number} length Packet length
     * @returns {number} 0 on success
     */
    netifReceive(iface, packet, length) {},

    // =========================================================================
    // USER MANAGEMENT
    // =========================================================================

    /**
     * Get current user ID
     * @returns {number} UID
     */
    getCurrentUID() {},

    /**
     * Get username for UID
     * @param {number} uid User ID
     * @returns {string|null} Username or null
     */
    getUsername(uid) {},

    /**
     * Check permission
     * @param {string} resource Resource name
     * @param {number} permission Permission bits
     * @returns {number} 0 if allowed, negative if denied
     */
    checkPermission(resource, permission) {}
};

// Export for use in modules
if (typeof module !== 'undefined') {
    module.exports = { AKM, CAPS, DRV_TYPE, LOG_LEVEL };
}
