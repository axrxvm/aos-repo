/**
 * Hello World - aOS Kernel Module Example
 * 
 * This is a simple example demonstrating the basics of writing
 * an aOS kernel module using the AKMCC JavaScript compiler.
 * 
 * Compile with: akmcc hello.akm.js -o hello.akm
 */

// ============================================================================
//                          MODULE DECLARATION
// ============================================================================
// Every module must declare its metadata using AKM.module()

AKM.module({
    name: "hello",
    version: "1.0.0",
    author: "Aarav Mehta",
    description: "Hello World kernel module example",
    license: "MIT",
    
    // Capabilities this module needs
    // These are automatically inferred from API usage, but can be explicit
    capabilities: AKM.CAPS.COMMAND | AKM.CAPS.LOG,
    
    // Dependencies (other modules that must be loaded first)
    dependencies: []
});

// ============================================================================
//                          COMMAND HANDLER
// ============================================================================
// This function handles the "hello" shell command

function cmdHello(args) {
    if (args && args.length > 0) {
        AKM.info(`Hello, ${args}!`);
    } else {
        AKM.info("Hello, World!");
    }
}

// Register the command
AKM.command({
    name: "hello",
    syntax: "hello [name]",
    description: "Say hello from the kernel module",
    category: "Module"
}, cmdHello);

// ============================================================================
//                          INIT FUNCTION
// ============================================================================
// Called when the module is loaded

function init(ctx) {
    AKM.info("Hello module loaded!");
    AKM.info("Type 'hello' to greet the world.");
    
    // Return 0 for success, negative for error
    return 0;
}

// ============================================================================
//                          EXIT FUNCTION
// ============================================================================
// Called when the module is unloaded

function exit(ctx) {
    AKM.info("Hello module unloading...");
    AKM.info("Goodbye, World!");
}

// Export init and exit (required)
export { init, exit };
