#!/usr/bin/env node

/**
 * AKMCC - aOS Kernel Module Compiler
 * 
 * Compiles JavaScript modules to .akm binary format for the aOS kernel.
 * 
 * Usage:
 *   akmcc <input.akm.js> [-o output.akm] [options]
 * 
 * Options:
 *   -o, --output <file>    Output file name
 *   -v, --verbose          Verbose output
 *   -d, --debug            Include debug information
 *   -O, --optimize         Optimize output
 *   --version              Show version
 *   --help                 Show help
 */

const { AKMCompiler } = require('../src/compiler');
const { AKMParser } = require('../src/parser');
const { AKMCodeGen } = require('../src/codegen');
const fs = require('fs');
const path = require('path');

const VERSION = '2.0.0';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function error(msg) {
    console.error(`${colors.red}Error: ${msg}${colors.reset}`);
}

function warn(msg) {
    console.warn(`${colors.yellow}Warning: ${msg}${colors.reset}`);
}

function showHelp() {
    log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════╗
║                    AKMCC - aOS Kernel Module Compiler           ║
║                              Version ${VERSION}                        ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}USAGE:${colors.reset}
    akmcc <input.akm.js> [options]

${colors.bright}OPTIONS:${colors.reset}
    -o, --output <file>    Output file name (default: <input>.akm)
    -v, --verbose          Verbose output
    -d, --debug            Include debug information in output
    -O, --optimize         Optimize output bytecode
    -c, --caps <caps>      Set required capabilities (hex or comma-separated)
    -i, --info             Inspect an existing .akm file
    --dry-run              Parse and validate without generating output
    --emit-ir              Emit intermediate representation
    --version              Show version
    --help                 Show this help

${colors.bright}EXAMPLES:${colors.reset}
    akmcc hello.akm.js                    # Compile to hello.akm
    akmcc mymodule.js -o custom.akm       # Compile with custom output name
    akmcc driver.akm.js -v -d             # Verbose + debug symbols
    akmcc module.js --caps=0x1F           # Set capabilities mask
    akmcc hello.akm --info                # Inspect compiled module

${colors.bright}CAPABILITIES:${colors.reset}
    COMMAND     = 0x00000001    DRIVER      = 0x00000002
    FILESYSTEM  = 0x00000004    NETWORK     = 0x00000008
    ENVVAR      = 0x00000010    PROCESS     = 0x00000020
    MEMORY      = 0x00000040    IRQ         = 0x00000080
    IO_PORT     = 0x00000100    PCI         = 0x00000200
    TIMER       = 0x00000400    LOG         = 0x00000800
    SYSINFO     = 0x00001000    USER        = 0x00002000
    SECURITY    = 0x00004000    PANIC       = 0x00008000
    DEBUG       = 0x00010000    IPC         = 0x00020000
    CRYPTO      = 0x00040000    ACPI        = 0x00080000

${colors.bright}MODULE TEMPLATE:${colors.reset}
    See examples/hello.akm.js for a complete module template.

${colors.cyan}Documentation: https://github.com/axrxvm/aos/docs/modules${colors.reset}
`);
}

function showVersion() {
    log(`akmcc version ${VERSION}`);
    log(`aOS Kernel Module Compiler`);
    log(`Copyright (c) 2024-2026 Aarav Mehta`);
}

/**
 * Show information about a compiled .akm file
 */
function showModuleInfo(filepath) {
    if (!fs.existsSync(filepath)) {
        error(`File not found: ${filepath}`);
        process.exit(1);
    }

    const data = fs.readFileSync(filepath);
    
    if (data.length < 512) {
        error('Invalid AKM file: too small');
        process.exit(1);
    }

    // Read header
    const magic = data.readUInt32LE(0);
    if (magic !== 0x324D4B41) { // "AKM2"
        error(`Invalid magic: expected 0x324D4B41 (AKM2), got 0x${magic.toString(16).toUpperCase()}`);
        process.exit(1);
    }

    const formatVersion = data.readUInt16LE(4);
    const flags = data.readUInt16LE(6);
    const headerSize = data.readUInt32LE(8);
    const totalSize = data.readUInt32LE(12);
    
    // Module info
    const name = data.toString('utf8', 16, 48).replace(/\0.*$/, '');
    const version = data.toString('utf8', 48, 64).replace(/\0.*$/, '');
    const author = data.toString('utf8', 64, 96).replace(/\0.*$/, '');
    const apiVersion = data.readUInt16LE(96);
    
    // Kernel compatibility
    const kernelMin = data.readUInt32LE(100);
    const kernelMax = data.readUInt32LE(104);
    const capabilities = data.readUInt32LE(108);
    
    // Section info
    const codeOffset = data.readUInt32LE(116);
    const codeSize = data.readUInt32LE(120);
    const dataOffset = data.readUInt32LE(124);
    const dataSize = data.readUInt32LE(128);
    const rodataOffset = data.readUInt32LE(132);
    const rodataSize = data.readUInt32LE(136);
    const bssSize = data.readUInt32LE(140);
    
    // Entry points
    const initOffset = data.readUInt32LE(164);
    const cleanupOffset = data.readUInt32LE(168);
    
    // Symbol/string tables
    const symtabOffset = data.readUInt32LE(180);
    const symtabSize = data.readUInt32LE(184);
    const strtabOffset = data.readUInt32LE(188);
    const strtabSize = data.readUInt32LE(192);
    
    // Dependencies
    const depCount = data.readUInt8(212);
    const dependencies = [];
    for (let i = 0; i < depCount && i < 4; i++) {
        const dep = data.toString('utf8', 216 + i * 32, 216 + (i + 1) * 32).replace(/\0.*$/, '');
        if (dep) dependencies.push(dep);
    }
    
    // Security
    const securityLevel = data.readUInt8(344);
    const signatureType = data.readUInt8(345);
    const headerChecksum = data.readUInt32LE(348);
    const contentChecksum = data.readUInt32LE(352);
    
    // Format version string
    const kernelMinStr = `${(kernelMin >> 16) & 0xFF}.${(kernelMin >> 8) & 0xFF}.${kernelMin & 0xFF}`;
    const kernelMaxStr = kernelMax === 0 ? 'any' : `${(kernelMax >> 16) & 0xFF}.${(kernelMax >> 8) & 0xFF}.${kernelMax & 0xFF}`;
    const apiVersionStr = `${(apiVersion >> 8) & 0xFF}.${apiVersion & 0xFF}`;

    // Parse capabilities
    const capNames = [];
    const capDefs = {
        0x00000001: 'COMMAND', 0x00000002: 'DRIVER', 0x00000004: 'FILESYSTEM',
        0x00000008: 'NETWORK', 0x00000010: 'ENVVAR', 0x00000020: 'PROCESS',
        0x00000040: 'MEMORY', 0x00000080: 'IRQ', 0x00000100: 'IO_PORT',
        0x00000200: 'PCI', 0x00000400: 'TIMER', 0x00000800: 'LOG',
        0x00001000: 'SYSINFO', 0x00002000: 'USER', 0x00004000: 'SECURITY',
        0x00008000: 'PANIC', 0x00010000: 'DEBUG', 0x00020000: 'IPC',
        0x00040000: 'CRYPTO', 0x00080000: 'ACPI'
    };
    for (const [bit, capName] of Object.entries(capDefs)) {
        if (capabilities & parseInt(bit)) {
            capNames.push(capName);
        }
    }

    // Parse flags
    const flagNames = [];
    if (flags & 0x0001) flagNames.push('DEBUG');
    if (flags & 0x0002) flagNames.push('NATIVE');
    if (flags & 0x0004) flagNames.push('REQUIRED');
    if (flags & 0x0008) flagNames.push('AUTOLOAD');

    log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════╗
║                      AKM Module Information                     ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}FILE:${colors.reset} ${filepath}
${colors.bright}SIZE:${colors.reset} ${data.length} bytes

${colors.bright}═══ Header ═══${colors.reset}
  Magic:          AKM2 (0x324D4B41)
  Format Version: ${formatVersion}
  Header Size:    ${headerSize} bytes
  Total Size:     ${totalSize} bytes
  Flags:          0x${flags.toString(16).padStart(4, '0')} [${flagNames.join(', ') || 'none'}]

${colors.bright}═══ Module Info ═══${colors.reset}
  Name:           ${colors.green}${name}${colors.reset}
  Version:        ${version}
  Author:         ${author || '(none)'}
  API Version:    ${apiVersionStr}

${colors.bright}═══ Compatibility ═══${colors.reset}
  Kernel Min:     ${kernelMinStr}
  Kernel Max:     ${kernelMaxStr}
  Capabilities:   0x${capabilities.toString(16).padStart(8, '0').toUpperCase()}
                  [${capNames.join(', ') || 'none'}]

${colors.bright}═══ Sections ═══${colors.reset}
  Code:           offset=0x${codeOffset.toString(16)} size=${codeSize} bytes
  Data:           offset=0x${dataOffset.toString(16)} size=${dataSize} bytes
  RO Data:        offset=0x${rodataOffset.toString(16)} size=${rodataSize} bytes
  BSS:            size=${bssSize} bytes

${colors.bright}═══ Entry Points ═══${colors.reset}
  Init:           offset=0x${initOffset.toString(16)}
  Cleanup:        offset=0x${cleanupOffset.toString(16)}

${colors.bright}═══ Tables ═══${colors.reset}
  Symbol Table:   offset=0x${symtabOffset.toString(16)} size=${symtabSize} bytes
  String Table:   offset=0x${strtabOffset.toString(16)} size=${strtabSize} bytes

${colors.bright}═══ Dependencies ═══${colors.reset}
  Count:          ${depCount}
  Modules:        ${dependencies.length > 0 ? dependencies.join(', ') : '(none)'}

${colors.bright}═══ Security ═══${colors.reset}
  Level:          ${['none', 'basic', 'strict'][securityLevel] || securityLevel}
  Signature:      ${['none', 'sha256'][signatureType] || signatureType}
  Header CRC:     0x${headerChecksum.toString(16).toUpperCase()}
  Content CRC:    0x${contentChecksum.toString(16).toUpperCase()}
`);
}

function parseArgs(args) {
    const options = {
        input: null,
        output: null,
        verbose: false,
        debug: false,
        optimize: false,
        dryRun: false,
        emitIR: false,
        capabilities: null,
        info: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        } else if (arg === '--version') {
            showVersion();
            process.exit(0);
        } else if (arg === '-o' || arg === '--output') {
            options.output = args[++i];
        } else if (arg === '-v' || arg === '--verbose') {
            options.verbose = true;
        } else if (arg === '-d' || arg === '--debug') {
            options.debug = true;
        } else if (arg === '-O' || arg === '--optimize') {
            options.optimize = true;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--emit-ir') {
            options.emitIR = true;
        } else if (arg === '-i' || arg === '--info') {
            options.info = true;
        } else if (arg.startsWith('--caps=') || arg.startsWith('-c=')) {
            options.capabilities = arg.split('=')[1];
        } else if (arg === '-c' || arg === '--caps') {
            options.capabilities = args[++i];
        } else if (!arg.startsWith('-')) {
            options.input = arg;
        } else {
            error(`Unknown option: ${arg}`);
            process.exit(1);
        }
    }

    return options;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        showHelp();
        process.exit(1);
    }

    const options = parseArgs(args);

    if (!options.input) {
        error('No input file specified');
        showHelp();
        process.exit(1);
    }

    // Info mode - inspect an existing .akm file
    if (options.info) {
        showModuleInfo(options.input);
        process.exit(0);
    }

    // Check input file exists
    if (!fs.existsSync(options.input)) {
        error(`Input file not found: ${options.input}`);
        process.exit(1);
    }

    // Determine output file
    if (!options.output) {
        const ext = path.extname(options.input);
        if (ext === '.js') {
            options.output = options.input.replace(/\.akm\.js$|\.js$/, '.akm');
        } else {
            options.output = options.input + '.akm';
        }
    }

    // Read input file
    const sourceCode = fs.readFileSync(options.input, 'utf8');

    if (options.verbose) {
        log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
        log(`${colors.bright}AKMCC - aOS Kernel Module Compiler v${VERSION}${colors.reset}`);
        log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
        log(`Input:  ${options.input}`, 'green');
        log(`Output: ${options.output}`, 'green');
        log(`Debug:  ${options.debug}`, 'blue');
        log(`Optimize: ${options.optimize}`, 'blue');
        log('');
    }

    try {
        // Create compiler instance
        const compiler = new AKMCompiler({
            debug: options.debug,
            optimize: options.optimize,
            verbose: options.verbose,
            capabilities: options.capabilities
        });

        // Parse source
        if (options.verbose) log('Parsing source...', 'cyan');
        const parseResult = compiler.parse(sourceCode, options.input);

        if (parseResult.errors.length > 0) {
            for (const err of parseResult.errors) {
                error(`${err.file}:${err.line}:${err.column}: ${err.message}`);
            }
            process.exit(1);
        }

        if (parseResult.warnings.length > 0) {
            for (const warning of parseResult.warnings) {
                warn(`${warning.file}:${warning.line}: ${warning.message}`);
            }
        }

        // Emit IR if requested
        if (options.emitIR) {
            const irFile = options.output.replace(/\.akm$/, '.ir');
            fs.writeFileSync(irFile, JSON.stringify(parseResult.ir, null, 2));
            if (options.verbose) log(`IR written to: ${irFile}`, 'green');
        }

        // Stop if dry run
        if (options.dryRun) {
            log('Dry run complete - no output generated', 'yellow');
            process.exit(0);
        }

        // Generate code
        if (options.verbose) log('Generating bytecode...', 'cyan');
        const compiled = compiler.compile(parseResult);

        // Write output
        fs.writeFileSync(options.output, compiled.binary);

        if (options.verbose) {
            log('', 'reset');
            log(`${colors.green}═══════════════════════════════════════════════════${colors.reset}`);
            log(`${colors.bright}Compilation successful!${colors.reset}`, 'green');
            log(`${colors.green}═══════════════════════════════════════════════════${colors.reset}`);
            log('');
            log(`Module: ${compiled.info.name} v${compiled.info.version}`, 'cyan');
            log(`Author: ${compiled.info.author}`, 'cyan');
            log(`Description: ${compiled.info.description}`, 'cyan');
            log(`Capabilities: 0x${compiled.info.capabilities.toString(16).toUpperCase().padStart(8, '0')}`, 'cyan');
            log('');
            log(`Code size:  ${compiled.codeSize} bytes`, 'blue');
            log(`Data size:  ${compiled.dataSize} bytes`, 'blue');
            log(`Total size: ${compiled.binary.length} bytes`, 'blue');
            log(`Commands:   ${compiled.commands.length}`, 'blue');
            log('');
            log(`Output: ${options.output}`, 'green');
        } else {
            log(`Compiled: ${options.input} -> ${options.output} (${compiled.binary.length} bytes)`);
        }

    } catch (e) {
        error(e.message);
        if (options.verbose) {
            console.error(e.stack);
        }
        process.exit(1);
    }
}

main();
