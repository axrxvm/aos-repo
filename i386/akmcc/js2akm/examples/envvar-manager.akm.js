/**
 * Environment Variable Manager - aOS Kernel Module Example
 * 
 * Demonstrates reading and writing environment variables from a kernel module.
 * 
 * Compile with: akmcc envvar-manager.akm.js -o envvar-manager.akm
 */

AKM.module({
    name: "envmgr",
    version: "1.0.0",
    author: "Aarav Mehta",
    description: "Environment variable management module",
    license: "MIT",
    capabilities: AKM.CAPS.COMMAND | AKM.CAPS.LOG | AKM.CAPS.ENVVAR
});

// Module-specific env var prefix
const PREFIX = "ENVMGR_";

// Commands
function cmdEnvGet(args) {
    if (!args || args.length === 0) {
        AKM.error("Usage: envmgr-get <name>");
        return;
    }
    
    const name = args.split(' ')[0];
    const value = AKM.getenv(name);
    
    if (value) {
        AKM.info(`${name} = ${value}`);
    } else {
        AKM.warn(`${name} is not set`);
    }
}

function cmdEnvSet(args) {
    if (!args || args.length === 0) {
        AKM.error("Usage: envmgr-set <name> <value>");
        return;
    }
    
    const parts = args.split(' ');
    if (parts.length < 2) {
        AKM.error("Usage: envmgr-set <name> <value>");
        return;
    }
    
    const name = parts[0];
    const value = parts.slice(1).join(' ');
    
    if (AKM.setenv(name, value) === 0) {
        AKM.info(`Set ${name} = ${value}`);
    } else {
        AKM.error(`Failed to set ${name}`);
    }
}

function cmdEnvUnset(args) {
    if (!args || args.length === 0) {
        AKM.error("Usage: envmgr-unset <name>");
        return;
    }
    
    const name = args.split(' ')[0];
    
    if (AKM.unsetenv(name) === 0) {
        AKM.info(`Unset ${name}`);
    } else {
        AKM.error(`Failed to unset ${name}`);
    }
}

function cmdEnvStats(args) {
    // Get module load count from our custom env var
    const loadCount = AKM.getenv(`${PREFIX}LOAD_COUNT`) || "0";
    const lastLoad = AKM.getenv(`${PREFIX}LAST_LOAD`) || "unknown";
    
    AKM.info("Environment Manager Stats:");
    AKM.info(`  Load count: ${loadCount}`);
    AKM.info(`  Last load: ${lastLoad}`);
}

// Register commands
AKM.command({
    name: "envmgr-get",
    syntax: "envmgr-get <name>",
    description: "Get an environment variable",
    category: "Environment"
}, cmdEnvGet);

AKM.command({
    name: "envmgr-set",
    syntax: "envmgr-set <name> <value>",
    description: "Set an environment variable",
    category: "Environment"
}, cmdEnvSet);

AKM.command({
    name: "envmgr-unset",
    syntax: "envmgr-unset <name>",
    description: "Unset an environment variable",
    category: "Environment"
}, cmdEnvUnset);

AKM.command({
    name: "envmgr-stats",
    syntax: "envmgr-stats",
    description: "Show environment manager stats",
    category: "Environment"
}, cmdEnvStats);

// Init/Exit
function init(ctx) {
    AKM.info("Environment Manager module loaded");
    
    // Track load count
    let count = parseInt(AKM.getenv(`${PREFIX}LOAD_COUNT`) || "0");
    count++;
    AKM.setenv(`${PREFIX}LOAD_COUNT`, count.toString());
    AKM.setenv(`${PREFIX}LAST_LOAD`, "now");  // Would use actual timestamp
    
    AKM.info("Commands: envmgr-get, envmgr-set, envmgr-unset, envmgr-stats");
    return 0;
}

function exit(ctx) {
    AKM.info("Environment Manager module unloaded");
}

export { init, exit };
