/**
 * PCI Scanner - aOS Kernel Module Example
 * 
 * Demonstrates PCI device enumeration from a kernel module.
 * This is a read-only module that scans and displays PCI devices.
 * 
 * Compile with: akmcc pci-scanner.akm.js -o pci-scanner.akm
 */

AKM.module({
    name: "pciscan",
    version: "1.0.0",
    author: "Aarav Mehta",
    description: "PCI device scanner module",
    license: "MIT",
    capabilities: AKM.CAPS.COMMAND | AKM.CAPS.LOG | AKM.CAPS.PCI | AKM.CAPS.MEMORY
});

// PCI class codes
const PCI_CLASSES = {
    0x00: "Unclassified",
    0x01: "Mass Storage Controller",
    0x02: "Network Controller",
    0x03: "Display Controller",
    0x04: "Multimedia Controller",
    0x05: "Memory Controller",
    0x06: "Bridge",
    0x07: "Communication Controller",
    0x08: "System Peripheral",
    0x09: "Input Device Controller",
    0x0A: "Docking Station",
    0x0B: "Processor",
    0x0C: "Serial Bus Controller",
    0x0D: "Wireless Controller",
    0x0E: "Intelligent Controller",
    0x0F: "Satellite Controller",
    0x10: "Encryption Controller",
    0x11: "Signal Processing Controller"
};

// Known vendor IDs
const VENDORS = {
    0x8086: "Intel",
    0x1022: "AMD",
    0x10DE: "NVIDIA",
    0x1234: "QEMU/Bochs",
    0x1AF4: "Red Hat/Virtio",
    0x15AD: "VMware",
    0x80EE: "VirtualBox"
};

// Get vendor name
function getVendorName(vendorId) {
    return VENDORS[vendorId] || `Unknown (0x${vendorId.toString(16)})`;
}

// Get class name
function getClassName(classCode) {
    return PCI_CLASSES[classCode] || `Unknown (0x${classCode.toString(16)})`;
}

// Commands
function cmdPciScan(args) {
    AKM.info("Scanning PCI bus...");
    AKM.info("");
    
    let deviceCount = 0;
    
    // Scan all possible PCI devices
    for (let bus = 0; bus < 256; bus++) {
        for (let slot = 0; slot < 32; slot++) {
            for (let func = 0; func < 8; func++) {
                // Try to find device at this location
                // In real implementation, we'd use pci_read_config
                // This is simplified for the example
                const dev = AKM.pciFindDevice(bus, (slot << 3) | func);
                
                if (dev && dev.vendorId !== 0xFFFF) {
                    deviceCount++;
                    AKM.info(`[${bus.toString(16).padStart(2, '0')}:${slot.toString(16).padStart(2, '0')}.${func}] ` +
                            `${getVendorName(dev.vendorId)} ${getClassName(dev.classCode)}`);
                    AKM.info(`        Device: ${dev.deviceId.toString(16).padStart(4, '0')} ` +
                            `Rev: ${dev.revision.toString(16)}`);
                    
                    // Show BARs
                    for (let i = 0; i < 6; i++) {
                        if (dev.bar[i] !== 0) {
                            const isIO = dev.bar[i] & 1;
                            const addr = isIO ? (dev.bar[i] & 0xFFFFFFFC) : (dev.bar[i] & 0xFFFFFFF0);
                            AKM.info(`        BAR${i}: 0x${addr.toString(16)} (${isIO ? 'I/O' : 'Mem'})`);
                        }
                    }
                    AKM.info("");
                }
            }
        }
    }
    
    AKM.info(`Found ${deviceCount} PCI devices`);
}

function cmdPciFind(args) {
    if (!args || args.length === 0) {
        AKM.error("Usage: pci-find <vendor:device> or pci-find <class>");
        return;
    }
    
    const arg = args.trim();
    
    if (arg.includes(':')) {
        // Vendor:Device format
        const parts = arg.split(':');
        const vendor = parseInt(parts[0], 16);
        const device = parseInt(parts[1], 16);
        
        const dev = AKM.pciFindDevice(vendor, device);
        if (dev) {
            AKM.info(`Found: ${getVendorName(dev.vendorId)} ${dev.deviceId.toString(16)}`);
            AKM.info(`  Class: ${getClassName(dev.classCode)}`);
            AKM.info(`  Location: ${dev.bus}:${dev.device}.${dev.function}`);
        } else {
            AKM.warn("Device not found");
        }
    } else {
        // Class code
        const classCode = parseInt(arg, 16);
        const dev = AKM.pciFindClass(classCode, 0);
        if (dev) {
            AKM.info(`Found: ${getVendorName(dev.vendorId)} ${dev.deviceId.toString(16)}`);
            AKM.info(`  Class: ${getClassName(dev.classCode)}`);
        } else {
            AKM.warn("No device with that class found");
        }
    }
}

// Register commands
AKM.command({
    name: "pci-scan",
    syntax: "pci-scan",
    description: "Scan and list all PCI devices",
    category: "Hardware"
}, cmdPciScan);

AKM.command({
    name: "pci-find",
    syntax: "pci-find <vendor:device|class>",
    description: "Find a specific PCI device",
    category: "Hardware"
}, cmdPciFind);

// Init/Exit
function init(ctx) {
    AKM.info("PCI Scanner module loaded");
    AKM.info("Commands: pci-scan, pci-find");
    return 0;
}

function exit(ctx) {
    AKM.info("PCI Scanner module unloaded");
}

export { init, exit };
