
/**
 * Timer Demo - aOS Kernel Module Example
 * 
 * Demonstrates using timers in kernel modules.
 * 
 * Compile with: akmcc timer-demo.akm.js -o timer-demo.akm
 */

AKM.module({
    name: "timer_demo",
    version: "1.0.0",
    author: "Aarav Mehta",
    description: "Timer demonstration module",
    license: "MIT",
    capabilities: AKM.CAPS.COMMAND | AKM.CAPS.LOG | AKM.CAPS.TIMER
});

// Timer handle
let tickTimer = null;
let tickCount = 0;

// Timer callback - called every second
function onTick(data) {
    tickCount++;
    AKM.info(`Tick #${tickCount}`);
}

// Commands
function cmdTimerStart(args) {
    if (tickTimer) {
        AKM.warn("Timer already running!");
        return;
    }
    
    tickCount = 0;
    tickTimer = AKM.createTimer(1000, onTick, null);  // 1000ms = 1 second
    AKM.startTimer(tickTimer);
    AKM.info("Timer started - will tick every second");
}

function cmdTimerStop(args) {
    if (!tickTimer) {
        AKM.warn("Timer not running!");
        return;
    }
    
    AKM.stopTimer(tickTimer);
    AKM.destroyTimer(tickTimer);
    tickTimer = null;
    AKM.info(`Timer stopped after ${tickCount} ticks`);
}

function cmdTimerStatus(args) {
    if (tickTimer) {
        AKM.info(`Timer running - ${tickCount} ticks`);
    } else {
        AKM.info("Timer not running");
    }
}

// Register commands
AKM.command({
    name: "timer-start",
    syntax: "timer-start",
    description: "Start the demo timer",
    category: "Timer Demo"
}, cmdTimerStart);

AKM.command({
    name: "timer-stop",
    syntax: "timer-stop",
    description: "Stop the demo timer",
    category: "Timer Demo"
}, cmdTimerStop);

AKM.command({
    name: "timer-status",
    syntax: "timer-status",
    description: "Show timer status",
    category: "Timer Demo"
}, cmdTimerStatus);

// Init/Exit
function init(ctx) {
    AKM.info("Timer demo module loaded");
    AKM.info("Commands: timer-start, timer-stop, timer-status");
    return 0;
}

function exit(ctx) {
    if (tickTimer) {
        AKM.stopTimer(tickTimer);
        AKM.destroyTimer(tickTimer);
        tickTimer = null;
    }
    AKM.info("Timer demo module unloaded");
}

export { init, exit };
