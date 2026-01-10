/**
 * AKMCompiler - Main compiler class
 * 
 * Compiles JavaScript source code to AKM bytecode for the aOS kernel.
 */

const { AKMParser } = require('./parser');
const { AKMCodeGen } = require('./codegen');
const { AKMOptimizer } = require('./optimizer');
const { AKMBinaryWriter } = require('./binary');
const { CAPABILITIES, API_FUNCTIONS } = require('./constants');

class AKMCompiler {
    constructor(options = {}) {
        this.options = {
            debug: options.debug || false,
            optimize: options.optimize || false,
            verbose: options.verbose || false,
            capabilities: this.parseCapabilities(options.capabilities),
            apiVersion: 0x0200,  // API version 2.0 (major.minor as uint16)
            targetKernel: { min: 0x00080000, max: 0 }  // 0.8.0+
        };

        this.parser = new AKMParser(this.options);
        this.codegen = new AKMCodeGen(this.options);
        this.optimizer = new AKMOptimizer(this.options);
        this.binaryWriter = new AKMBinaryWriter(this.options);
    }

    /**
     * Parse capability string to bitmask
     */
    parseCapabilities(caps) {
        if (!caps) return null;

        // If already a number
        if (typeof caps === 'number') return caps;

        // If hex string
        if (caps.startsWith('0x')) {
            return parseInt(caps, 16);
        }

        // If comma-separated names
        let result = 0;
        const names = caps.split(',').map(s => s.trim().toUpperCase());
        for (const name of names) {
            if (CAPABILITIES[name] !== undefined) {
                result |= CAPABILITIES[name];
            }
        }
        return result;
    }

    /**
     * Parse JavaScript source code
     */
    parse(source, filename = 'module.js') {
        return this.parser.parse(source, filename);
    }

    /**
     * Compile parsed AST to binary
     */
    compile(parseResult) {
        // Validate module structure
        this.validateModule(parseResult);

        // Extract module info
        const moduleInfo = this.extractModuleInfo(parseResult);

        // Generate intermediate code
        let ir = this.codegen.generate(parseResult);

        // Optimize if requested
        if (this.options.optimize) {
            ir = this.optimizer.optimize(ir);
        }

        // Generate binary
        const binary = this.binaryWriter.write(ir, moduleInfo);

        return {
            binary: binary,
            info: moduleInfo,
            codeSize: ir.codeSize,
            dataSize: ir.dataSize,
            commands: ir.commands,
            ir: this.options.debug ? ir : null
        };
    }

    /**
     * Validate that the module has required structure
     */
    validateModule(parseResult) {
        const { moduleConfig, functions } = parseResult;

        if (!moduleConfig) {
            throw new Error('Module must declare configuration using AKM.module()');
        }

        if (!moduleConfig.name) {
            throw new Error('Module must have a name');
        }

        if (!functions.init) {
            throw new Error('Module must have an init() function');
        }

        if (!functions.exit) {
            throw new Error('Module must have an exit() function');
        }
    }

    /**
     * Extract module info from parsed result
     */
    extractModuleInfo(parseResult) {
        const config = parseResult.moduleConfig;

        return {
            name: config.name || 'unnamed',
            version: config.version || '1.0.0',
            author: config.author || '',
            description: config.description || '',
            license: config.license || 'MIT',
            capabilities: this.options.capabilities || config.capabilities || 0,
            apiVersion: this.options.apiVersion,
            kernelMinVersion: this.options.targetKernel.min,
            kernelMaxVersion: this.options.targetKernel.max,
            dependencies: config.dependencies || [],
            securityLevel: config.securityLevel || 0
        };
    }
}

module.exports = { AKMCompiler };
