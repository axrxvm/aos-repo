# AKMCC - aOS Kernel Module Compiler (Javascript Version)

**Version 2.0.0** | **aOS 0.8.7+**

Compile JavaScript modules to `.akm` binary format for the aOS kernel.

```
╔════════════════════════════════════════════════════════════════╗
║               AKMCC - aOS Kernel Module Compiler               ║
║                        Version 2.0.0                           ║
╚════════════════════════════════════════════════════════════════╝
```

## Features

- **JavaScript to AKM** - Write kernel modules in a familiar language
- **Full Kernel API Access** - Commands, drivers, timers, PCI, network, etc.
- **Capability System** - Fine-grained security permissions
- **Optimizing Compiler** - Dead code elimination, constant folding
- **Debug Support** - Source maps and debug symbols
- **Zero Dependencies at Runtime** - Compiles to standalone `.akm` files

## Installation

```bash
cd tools/akmcc
npm install
```

## Quick Start

1. Create a module file `hello.akm.js`:

```javascript
AKM.module({
    name: "hello",
    version: "1.0.0",
    author: "Your Name",
    description: "Hello World module",
    license: "CC-BY-NC-4.0"
});

function cmdHello(args) {
    AKM.info("Hello, World!");
}

AKM.command({
    name: "hello",
    syntax: "hello",
    description: "Say hello",
    category: "Demo"
}, cmdHello);

function init(ctx) {
    AKM.info("Module loaded!");
    return 0;
}

function exit(ctx) {
    AKM.info("Module unloaded!");
}

export { init, exit };
```

1. Compile it:

```bash
./bin/akmcc.js hello.akm.js -o hello.akm
```

1. Load in aOS:

```
aOS> modload /path/to/hello.akm
aOS> hello
Hello, World!
```

## Usage

```
akmcc <input.js> [options]

Options:
  -o, --output <file>    Output file name
  -v, --verbose          Verbose output
  -d, --debug            Include debug information
  -O, --optimize         Optimize output
  -c, --caps <caps>      Set required capabilities
  --dry-run              Parse without generating output
  --emit-ir              Emit intermediate representation
  --version              Show version
  --help                 Show help
```

## API Reference

### Module Declaration

```javascript
AKM.module({
    name: "module_name",           // Required: Module name (max 32 chars)
    version: "1.0.0",              // Required: Semantic version
    author: "Author Name",         // Optional: Author name
    description: "Description",    // Optional: Module description
    license: "CC-BY-NC-4.0",       // Optional: License
    capabilities: AKM.CAPS.LOG,    // Optional: Required capabilities
    dependencies: ["other_mod"]    // Optional: Module dependencies
});
```

### Logging

```javascript
AKM.log(level, message);    // Log with level
AKM.info(message);          // Info level
AKM.warn(message);          // Warning level
AKM.error(message);         // Error level
AKM.debug(message);         // Debug level (requires DEBUG cap)
AKM.hexdump(data, length);  // Hex dump (requires DEBUG cap)
```

### Commands

```javascript
AKM.command({
    name: "cmd_name",
    syntax: "cmd_name [args]",
    description: "Help text",
    category: "Category"
}, handlerFunction);
```

### Environment Variables

```javascript
const value = AKM.getenv("VAR_NAME");
AKM.setenv("VAR_NAME", "value");
AKM.unsetenv("VAR_NAME");
```

### Memory

```javascript
const ptr = AKM.malloc(size);
const ptr = AKM.calloc(count, size);
const ptr = AKM.realloc(ptr, newSize);
AKM.free(ptr);
const page = AKM.allocPage();
AKM.freePage(page);
```

### Timers

```javascript
const timer = AKM.createTimer(intervalMs, callback, data);
AKM.startTimer(timer);
AKM.stopTimer(timer);
AKM.destroyTimer(timer);
const ticks = AKM.getTicks();
AKM.sleep(milliseconds);
```

### PCI

```javascript
const dev = AKM.pciFindDevice(vendorId, deviceId);
const dev = AKM.pciFindClass(classCode, subclass);
const value = AKM.pciReadConfig(device, offset);
AKM.pciWriteConfig(device, offset, value);
AKM.pciEnableBusmaster(device);
```

### I/O Ports

```javascript
AKM.outb(port, value);
AKM.outw(port, value);
AKM.outl(port, value);
const byte = AKM.inb(port);
const word = AKM.inw(port);
const dword = AKM.inl(port);
AKM.ioWait();
```

### System Info

```javascript
const info = AKM.getSysinfo();
// info.kernelVersion, info.totalMemory, info.freeMemory,
// info.uptimeSeconds, info.processCount, info.moduleCount
const ver = AKM.getKernelVersion();
```

### IRQ (Interrupts)

```javascript
AKM.registerIRQ(irqNumber, handler, data);
AKM.unregisterIRQ(irqNumber);
AKM.enableIRQ(irqNumber);
AKM.disableIRQ(irqNumber);
```

### Drivers

```javascript
AKM.registerDriver({
    name: "driver_name",
    type: AKM.DRV_TYPE.CHAR,
    vendorId: 0x1234,
    deviceId: 0x5678,
    ops: driverOps
});
AKM.unregisterDriver("driver_name");
```

### Processes

```javascript
const pid = AKM.spawn("name", entryFunction, priority);
AKM.kill(pid, signal);
const myPid = AKM.getpid();
AKM.yield();
```

### IPC

```javascript
AKM.ipcSend(destPid, message, length);
const msg = AKM.ipcReceive(buffer, maxLength);
const channel = AKM.ipcCreateChannel("name");
AKM.ipcDestroyChannel(channelId);
```

### Crypto

```javascript
AKM.sha256(data, length, hashOutput);
AKM.randomBytes(buffer, length);
```

## Capabilities

| Capability | Value | Description |
|------------|-------|-------------|
| `COMMAND` | 0x00000001 | Register shell commands |
| `DRIVER` | 0x00000002 | Register device drivers |
| `FILESYSTEM` | 0x00000004 | Register filesystems |
| `NETWORK` | 0x00000008 | Access network stack |
| `ENVVAR` | 0x00000010 | Read/write env vars |
| `PROCESS` | 0x00000020 | Manage processes |
| `MEMORY` | 0x00000040 | Allocate kernel memory |
| `IRQ` | 0x00000080 | Register IRQ handlers |
| `IO_PORT` | 0x00000100 | Access I/O ports |
| `PCI` | 0x00000200 | Access PCI devices |
| `TIMER` | 0x00000400 | Register timers |
| `LOG` | 0x00000800 | Write to kernel log |
| `SYSINFO` | 0x00001000 | Access system info |
| `USER` | 0x00002000 | Access user management |
| `SECURITY` | 0x00004000 | Modify security settings |
| `PANIC` | 0x00008000 | Trigger kernel panic |
| `DEBUG` | 0x00010000 | Use debug facilities |
| `IPC` | 0x00020000 | Use IPC mechanisms |
| `CRYPTO` | 0x00040000 | Use crypto APIs |
| `ACPI` | 0x00080000 | Access ACPI tables |

### Capability Combinations

```javascript
AKM.CAPS.BASIC = LOG | MEMORY | SYSINFO
AKM.CAPS.DEVICE_DRIVER = BASIC | DRIVER | IRQ | IO_PORT | PCI
AKM.CAPS.NET_DRIVER = DEVICE_DRIVER | NETWORK
AKM.CAPS.FS_MODULE = BASIC | FILESYSTEM
AKM.CAPS.SHELL_MODULE = BASIC | COMMAND | ENVVAR
```

## Examples

See the `examples/` directory for complete examples:

- **hello.akm.js** - Basic "Hello World" module
- **timer-demo.akm.js** - Timer usage demonstration
- **envvar-manager.akm.js** - Environment variable management
- **pci-scanner.akm.js** - PCI device enumeration
- **sysmon.akm.js** - System monitoring module

## Binary Format

AKMCC generates AKM v2 format binaries with the following structure:

```
┌─────────────────────────────────┐
│ Header (512 bytes)              │
│   - Magic: "AKM2" (0x324D4B41)  │
│   - Module info                 │
│   - Section offsets             │
│   - Capabilities                │
│   - Checksums                   │
├─────────────────────────────────┤
│ Code Section                    │
│   - AKM bytecode                │
├─────────────────────────────────┤
│ Data Section                    │
│   - String table                │
│   - Command stubs               │
│   - Initialized data            │
├─────────────────────────────────┤
│ Symbol Table                    │
│   - Function symbols            │
│   - Exported symbols            │
├─────────────────────────────────┤
│ String Table                    │
│   - Symbol names                │
└─────────────────────────────────┘
```

## Security Model

Modules operate under a capability-based security model:

1. **Capability Declaration** - Modules declare needed capabilities
2. **Load-time Verification** - Kernel verifies capabilities are allowed
3. **Runtime Enforcement** - API calls check capabilities
4. **Resource Tracking** - Kernel tracks module resource usage
5. **Automatic Cleanup** - Resources freed on module unload

## Development

### Building the Compiler

```bash
npm install
npm test
```

### Running Tests

```bash
node test/test-compiler.js
```

## License

The compiler with it's code is licensed under the CC-BY-NC-4.0 License whereas the examples of modules are licensed under the MIT License.

CC-BY-NC-4.0 - Copyright (c) 2024-2026 Aarav Mehta and aOS Contributors
MIT - Copyright (c) 2026 Aarav Mehta
