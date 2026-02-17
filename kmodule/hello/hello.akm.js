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
function cmdHello(args) {
    if (args && args.length > 0) {
        AKM.info(`Hello, ${args}!`);
        AKM.print(`Hello, ${args}!`);
    } else {
        AKM.info("Hello, World!");
        AKM.print("Hello, World!");
    }
}
AKM.command({
    name: "hello",
    syntax: "hello [name]",
    description: "Say hello from the kernel module",
    category: "Module"
}, cmdHello);

function init(ctx) {
    AKM.info("Hello module loaded!");
    AKM.info("Type 'hello' to greet the world.");
    
    // Return 0 for success, negative for error
    return 0;
}

function exit(ctx) {
    AKM.info("Hello module unloading...");
    AKM.info("Goodbye, World!");
}

// Export init and exit (required)
export { init, exit };
