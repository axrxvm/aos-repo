/**
 * System Monitor - aOS Kernel Module Example
 * 
 * A comprehensive system monitoring module that demonstrates
 * multiple kernel APIs working together.
 * 
 * Compile with: akmcc sysmon.akm.js -o sysmon.akm
 */

AKM.module({
    name: "sysmon",
    version: "1.0.0",
    author: "Aarav Mehta",
    description: "System monitoring and diagnostics module",
    license: "MIT",
    capabilities: AKM.CAPS.COMMAND | AKM.CAPS.LOG | AKM.CAPS.SYSINFO | 
                  AKM.CAPS.TIMER | AKM.CAPS.MEMORY | AKM.CAPS.ENVVAR
});

// Monitoring state
let monitorTimer = null;
let monitorInterval = 5000;  // 5 seconds default
let snapshotCount = 0;
let lastMemFree = 0;
let alertThreshold = 80;  // Memory usage alert at 80%

// Collect system snapshot
function collectSnapshot() {
    const info = AKM.getSysinfo();
    if (!info) {
        AKM.error("Failed to get system info");
        return null;
    }
    
    snapshotCount++;
    
    return {
        timestamp: AKM.getTicks(),
        kernelVersion: info.kernelVersion,
        totalMemory: info.totalMemory,
        freeMemory: info.freeMemory,
        usedMemory: info.totalMemory - info.freeMemory,
        memoryPercent: Math.round(((info.totalMemory - info.freeMemory) / info.totalMemory) * 100),
        uptime: info.uptimeSeconds,
        processCount: info.processCount,
        moduleCount: info.moduleCount
    };
}

// Monitor callback
function onMonitorTick(data) {
    const snapshot = collectSnapshot();
    if (!snapshot) return;
    
    // Check for memory alerts
    if (snapshot.memoryPercent >= alertThreshold) {
        AKM.warn(`[ALERT] Memory usage at ${snapshot.memoryPercent}%!`);
    }
    
    // Check for memory leak (free memory decreasing)
    if (lastMemFree > 0 && snapshot.freeMemory < lastMemFree * 0.9) {
        AKM.warn(`[ALERT] Free memory dropped significantly!`);
    }
    lastMemFree = snapshot.freeMemory;
    
    // Log snapshot
    AKM.debug(`[Snapshot #${snapshotCount}] Mem: ${snapshot.memoryPercent}% ` +
              `Procs: ${snapshot.processCount} Mods: ${snapshot.moduleCount}`);
}

// Commands
function cmdSysInfo(args) {
    const snapshot = collectSnapshot();
    if (!snapshot) return;
    
    AKM.info("=== System Information ===");
    AKM.info(`Kernel Version: ${(snapshot.kernelVersion >> 16) & 0xFF}.` +
             `${(snapshot.kernelVersion >> 8) & 0xFF}.` +
             `${snapshot.kernelVersion & 0xFF}`);
    AKM.info(`Uptime: ${snapshot.uptime} seconds`);
    AKM.info("");
    AKM.info("=== Memory ===");
    AKM.info(`Total: ${Math.round(snapshot.totalMemory / 1024)} KB`);
    AKM.info(`Used:  ${Math.round(snapshot.usedMemory / 1024)} KB (${snapshot.memoryPercent}%)`);
    AKM.info(`Free:  ${Math.round(snapshot.freeMemory / 1024)} KB`);
    AKM.info("");
    AKM.info("=== Activity ===");
    AKM.info(`Processes: ${snapshot.processCount}`);
    AKM.info(`Modules:   ${snapshot.moduleCount}`);
    AKM.info(`Snapshots: ${snapshotCount}`);
}

function cmdMonStart(args) {
    if (monitorTimer) {
        AKM.warn("Monitor already running!");
        return;
    }
    
    // Parse interval from args
    if (args && args.length > 0) {
        const interval = parseInt(args);
        if (interval > 0) {
            monitorInterval = interval * 1000;
        }
    }
    
    monitorTimer = AKM.createTimer(monitorInterval, onMonitorTick, null);
    AKM.startTimer(monitorTimer);
    AKM.info(`System monitor started (interval: ${monitorInterval / 1000}s)`);
    
    // Store in env var for persistence
    AKM.setenv("SYSMON_ACTIVE", "1");
    AKM.setenv("SYSMON_INTERVAL", (monitorInterval / 1000).toString());
}

function cmdMonStop(args) {
    if (!monitorTimer) {
        AKM.warn("Monitor not running!");
        return;
    }
    
    AKM.stopTimer(monitorTimer);
    AKM.destroyTimer(monitorTimer);
    monitorTimer = null;
    AKM.info(`System monitor stopped (${snapshotCount} snapshots collected)`);
    
    AKM.setenv("SYSMON_ACTIVE", "0");
}

function cmdMonStatus(args) {
    AKM.info("=== Monitor Status ===");
    AKM.info(`Active: ${monitorTimer ? 'Yes' : 'No'}`);
    AKM.info(`Interval: ${monitorInterval / 1000} seconds`);
    AKM.info(`Snapshots: ${snapshotCount}`);
    AKM.info(`Alert threshold: ${alertThreshold}%`);
}

function cmdMonAlert(args) {
    if (!args || args.length === 0) {
        AKM.info(`Current alert threshold: ${alertThreshold}%`);
        return;
    }
    
    const threshold = parseInt(args);
    if (threshold >= 0 && threshold <= 100) {
        alertThreshold = threshold;
        AKM.info(`Alert threshold set to ${alertThreshold}%`);
        AKM.setenv("SYSMON_ALERT", alertThreshold.toString());
    } else {
        AKM.error("Threshold must be between 0 and 100");
    }
}

// Register commands
AKM.command({
    name: "sysinfo",
    syntax: "sysinfo",
    description: "Display system information",
    category: "Monitor"
}, cmdSysInfo);

AKM.command({
    name: "mon-start",
    syntax: "mon-start [interval-seconds]",
    description: "Start system monitoring",
    category: "Monitor"
}, cmdMonStart);

AKM.command({
    name: "mon-stop",
    syntax: "mon-stop",
    description: "Stop system monitoring",
    category: "Monitor"
}, cmdMonStop);

AKM.command({
    name: "mon-status",
    syntax: "mon-status",
    description: "Show monitor status",
    category: "Monitor"
}, cmdMonStatus);

AKM.command({
    name: "mon-alert",
    syntax: "mon-alert [threshold]",
    description: "Set/show memory alert threshold",
    category: "Monitor"
}, cmdMonAlert);

// Init/Exit
function init(ctx) {
    AKM.info("System Monitor module loaded");
    AKM.info("Commands: sysinfo, mon-start, mon-stop, mon-status, mon-alert");
    
    // Restore previous settings from env vars
    const wasActive = AKM.getenv("SYSMON_ACTIVE");
    const savedInterval = AKM.getenv("SYSMON_INTERVAL");
    const savedAlert = AKM.getenv("SYSMON_ALERT");
    
    if (savedInterval) {
        monitorInterval = parseInt(savedInterval) * 1000;
    }
    if (savedAlert) {
        alertThreshold = parseInt(savedAlert);
    }
    if (wasActive === "1") {
        AKM.info("Restoring previous monitor state...");
        cmdMonStart("");
    }
    
    return 0;
}

function exit(ctx) {
    if (monitorTimer) {
        AKM.stopTimer(monitorTimer);
        AKM.destroyTimer(monitorTimer);
        monitorTimer = null;
    }
    AKM.info("System Monitor module unloaded");
}

export { init, exit };
