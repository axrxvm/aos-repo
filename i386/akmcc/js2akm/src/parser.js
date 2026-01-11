/**
 * AKMParser - JavaScript to AKM IR Parser
 * 
 * Parses JavaScript source code and extracts module structure,
 * API calls, and generates intermediate representation.
 */

const acorn = require('acorn');
const { CAPABILITIES, API_FUNCTIONS, OPCODES } = require('./constants');

class AKMParser {
    constructor(options = {}) {
        this.options = options;
        this.errors = [];
        this.warnings = [];
        this.currentFile = '';
    }

    /**
     * Parse JavaScript source code
     */
    parse(source, filename = 'module.js') {
        this.currentFile = filename;
        this.errors = [];
        this.warnings = [];

        let ast;
        try {
            ast = acorn.parse(source, {
                ecmaVersion: 2020,
                sourceType: 'module',
                locations: true,
                ranges: true
            });
        } catch (e) {
            this.errors.push({
                file: filename,
                line: e.loc ? e.loc.line : 0,
                column: e.loc ? e.loc.column : 0,
                message: e.message
            });
            return {
                errors: this.errors,
                warnings: this.warnings
            };
        }

        // Extract module configuration
        const moduleConfig = this.extractModuleConfig(ast);

        // Extract functions
        const functions = this.extractFunctions(ast);

        // Extract commands
        const commands = this.extractCommands(ast);

        // Extract API calls
        const apiCalls = this.extractAPICalls(ast);

        // Compute required capabilities from API usage
        const requiredCaps = this.computeRequiredCapabilities(apiCalls, commands);

        // Merge with declared capabilities
        if (moduleConfig.capabilities) {
            moduleConfig.capabilities |= requiredCaps;
        } else {
            moduleConfig.capabilities = requiredCaps;
        }

        // Generate IR
        const ir = this.generateIR(ast, functions, commands, apiCalls);

        return {
            ast: ast,
            moduleConfig: moduleConfig,
            functions: functions,
            commands: commands,
            apiCalls: apiCalls,
            ir: ir,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    /**
     * Extract AKM.module() configuration
     */
    extractModuleConfig(ast) {
        let config = {};

        this.walkAST(ast, (node) => {
            if (node.type === 'CallExpression' &&
                node.callee.type === 'MemberExpression' &&
                node.callee.object.name === 'AKM' &&
                node.callee.property.name === 'module') {

                if (node.arguments.length > 0 && node.arguments[0].type === 'ObjectExpression') {
                    config = this.parseObjectExpression(node.arguments[0]);
                }
            }
        });

        return config;
    }

    /**
     * Extract function declarations
     */
    extractFunctions(ast) {
        const functions = {};

        this.walkAST(ast, (node) => {
            // Regular function declarations
            if (node.type === 'FunctionDeclaration' && node.id) {
                functions[node.id.name] = {
                    name: node.id.name,
                    node: node,
                    params: node.params.map(p => p.name),
                    loc: node.loc,
                    isExport: false
                };
            }

            // Export function declarations
            if (node.type === 'ExportNamedDeclaration' && 
                node.declaration && 
                node.declaration.type === 'FunctionDeclaration') {
                const func = node.declaration;
                functions[func.id.name] = {
                    name: func.id.name,
                    node: func,
                    params: func.params.map(p => p.name),
                    loc: func.loc,
                    isExport: true
                };
            }

            // Arrow functions assigned to variables
            if (node.type === 'VariableDeclaration') {
                for (const decl of node.declarations) {
                    if (decl.init && 
                        (decl.init.type === 'ArrowFunctionExpression' ||
                         decl.init.type === 'FunctionExpression')) {
                        functions[decl.id.name] = {
                            name: decl.id.name,
                            node: decl.init,
                            params: decl.init.params.map(p => p.name || p.left?.name),
                            loc: decl.loc,
                            isExport: false
                        };
                    }
                }
            }
        });

        return functions;
    }

    /**
     * Extract AKM.command() registrations
     */
    extractCommands(ast) {
        const commands = [];

        this.walkAST(ast, (node) => {
            if (node.type === 'CallExpression' &&
                node.callee.type === 'MemberExpression' &&
                node.callee.object.name === 'AKM' &&
                node.callee.property.name === 'command') {

                if (node.arguments.length >= 2) {
                    const cmdConfig = this.parseObjectExpression(node.arguments[0]);
                    const handler = node.arguments[1];

                    commands.push({
                        name: cmdConfig.name || 'unknown',
                        syntax: cmdConfig.syntax || cmdConfig.name,
                        description: cmdConfig.description || '',
                        category: cmdConfig.category || 'Module',
                        handler: handler.name || handler.id?.name || null,
                        handlerNode: handler,
                        loc: node.loc
                    });
                }
            }
        });

        return commands;
    }

    /**
     * Extract all AKM.* API calls
     */
    extractAPICalls(ast) {
        const calls = [];

        this.walkAST(ast, (node) => {
            if (node.type === 'CallExpression' &&
                node.callee.type === 'MemberExpression' &&
                node.callee.object.name === 'AKM') {

                const method = node.callee.property.name;

                // Skip module/command declarations
                if (method === 'module' || method === 'command') return;

                calls.push({
                    method: method,
                    args: node.arguments,
                    loc: node.loc
                });
            }
        });

        return calls;
    }

    /**
     * Compute required capabilities from API usage
     */
    computeRequiredCapabilities(apiCalls, commands) {
        let caps = 0;

        // Commands require COMMAND capability
        if (commands.length > 0) {
            caps |= CAPABILITIES.COMMAND;
        }

        // Check API calls
        for (const call of apiCalls) {
            const apiInfo = API_FUNCTIONS[call.method];
            if (apiInfo) {
                caps |= apiInfo.capability;
            } else {
                this.warnings.push({
                    file: this.currentFile,
                    line: call.loc.start.line,
                    message: `Unknown API method: AKM.${call.method}`
                });
            }
        }

        // Always need LOG capability for module logging
        caps |= CAPABILITIES.LOG;

        return caps;
    }

    /**
     * Generate intermediate representation
     */
    generateIR(ast, functions, commands, apiCalls) {
        const ir = {
            globals: [],
            strings: [],
            functions: [],
            commands: [],
            apiCalls: [],
            initFunc: null,
            exitFunc: null,
            codeSize: 0,
            dataSize: 0
        };

        // String table
        const stringTable = new Map();
        const addString = (s) => {
            if (!stringTable.has(s)) {
                const idx = stringTable.size;
                stringTable.set(s, idx);
                ir.strings.push(s);
            }
            return stringTable.get(s);
        };

        // Process commands
        for (const cmd of commands) {
            ir.commands.push({
                nameIdx: addString(cmd.name),
                syntaxIdx: addString(cmd.syntax),
                descIdx: addString(cmd.description),
                categoryIdx: addString(cmd.category),
                handler: cmd.handler
            });
        }

        // Process functions
        for (const [name, func] of Object.entries(functions)) {
            const irFunc = {
                name: name,
                nameIdx: addString(name),
                params: func.params,
                instructions: [],
                locals: [],
                isInit: name === 'init',
                isExit: name === 'exit'
            };

            // Generate bytecode for function body
            this.generateFunctionIR(func.node, irFunc, addString);

            // If this is the init function, inject command registration calls
            if (name === 'init' && commands.length > 0) {
                // Find the return statement and insert before it
                const returnIdx = irFunc.instructions.findIndex(i => i.op === OPCODES.RET);
                const insertIdx = returnIdx >= 0 ? returnIdx : irFunc.instructions.length;
                
                // Generate registration calls for each command
                for (const cmd of commands) {
                    const regCalls = [
                        // Push arguments: name, syntax, description, category, handler
                        { op: OPCODES.PUSH_STR, value: cmd.name },
                        { op: OPCODES.PUSH_STR, value: cmd.syntax },
                        { op: OPCODES.PUSH_STR, value: cmd.description },
                        { op: OPCODES.PUSH_STR, value: cmd.category },
                        { op: OPCODES.PUSH, value: 0 },  // handler offset (placeholder for now)
                        // Call AKM.registerCommand API
                        { op: OPCODES.CALL_API, method: 'registerCommand', argc: 5 },
                        // Pop result
                        { op: OPCODES.POP }
                    ];
                    irFunc.instructions.splice(insertIdx, 0, ...regCalls);
                }
            }

            ir.functions.push(irFunc);

            if (name === 'init') ir.initFunc = irFunc;
            if (name === 'exit') ir.exitFunc = irFunc;
        }

        // Process API calls
        for (const call of apiCalls) {
            ir.apiCalls.push({
                method: call.method,
                methodIdx: addString(call.method),
                argCount: call.args.length
            });
        }

        return ir;
    }

    /**
     * Generate IR for a function body
     */
    generateFunctionIR(node, irFunc, addString) {
        const body = node.body;
        const instructions = irFunc.instructions;

        // Simple bytecode generation
        // In a full implementation, this would compile to actual bytecode

        this.walkAST(body, (n) => {
            switch (n.type) {
                case 'CallExpression':
                    if (n.callee.type === 'MemberExpression' &&
                        n.callee.object.name === 'AKM') {
                        // AKM API call
                        const method = n.callee.property.name;
                        
                        // Push arguments (actual values, not references)
                        for (let i = 0; i < n.arguments.length; i++) {
                            const arg = n.arguments[i];
                            const value = this.evaluateLiteral(arg);
                            
                            if (typeof value === 'string') {
                                // Add string to table and push its offset
                                addString(value);
                                instructions.push({
                                    op: OPCODES.PUSH_STR,
                                    value: value
                                });
                            } else if (typeof value === 'number') {
                                instructions.push({
                                    op: OPCODES.PUSH,
                                    value: value
                                });
                            } else if (arg.type === 'Identifier') {
                                // Variable reference - load from local
                                instructions.push({
                                    op: OPCODES.LOAD_LOCAL,
                                    name: arg.name
                                });
                            } else {
                                // Default to pushing 0
                                instructions.push({
                                    op: OPCODES.PUSH,
                                    value: 0
                                });
                            }
                        }

                        instructions.push({
                            op: OPCODES.CALL_API,
                            method: method,
                            argc: n.arguments.length
                        });
                    } else if (n.callee.type === 'Identifier') {
                        // Regular function call
                        instructions.push({
                            op: OPCODES.CALL,
                            func: n.callee.name,
                            argc: n.arguments.length
                        });
                    }
                    break;

                case 'ReturnStatement':
                    if (n.argument) {
                        instructions.push({
                            op: OPCODES.PUSH,
                            value: this.evaluateLiteral(n.argument)
                        });
                    }
                    instructions.push({ op: OPCODES.RET });
                    break;

                case 'VariableDeclaration':
                    for (const decl of n.declarations) {
                        irFunc.locals.push(decl.id.name);
                        if (decl.init) {
                            instructions.push({
                                op: OPCODES.STORE_LOCAL,
                                name: decl.id.name,
                                value: this.evaluateLiteral(decl.init)
                            });
                        }
                    }
                    break;
            }
        });

        // Ensure function ends with return
        if (instructions.length === 0 || 
            instructions[instructions.length - 1].op !== OPCODES.RET) {
            instructions.push({ op: OPCODES.RET });
        }
    }

    /**
     * Evaluate a literal expression
     */
    evaluateLiteral(node) {
        if (!node) return null;

        switch (node.type) {
            case 'Literal':
                return node.value;
            case 'TemplateLiteral':
                return node.quasis.map(q => q.value.raw).join('');
            case 'Identifier':
                return { ref: node.name };
            case 'UnaryExpression':
                if (node.operator === '-') {
                    return -this.evaluateLiteral(node.argument);
                }
                break;
            case 'BinaryExpression':
                // Could evaluate simple constant expressions
                break;
        }
        return null;
    }

    /**
     * Parse an ObjectExpression to a plain object
     */
    parseObjectExpression(node) {
        const obj = {};

        if (node.type !== 'ObjectExpression') return obj;

        for (const prop of node.properties) {
            const key = prop.key.name || prop.key.value;
            const value = this.evaluateLiteral(prop.value);

            if (prop.value.type === 'ObjectExpression') {
                obj[key] = this.parseObjectExpression(prop.value);
            } else if (prop.value.type === 'ArrayExpression') {
                obj[key] = prop.value.elements.map(e => this.evaluateLiteral(e));
            } else {
                obj[key] = value;
            }
        }

        return obj;
    }

    /**
     * Walk the AST and call visitor for each node
     */
    walkAST(node, visitor) {
        if (!node) return;

        visitor(node);

        for (const key in node) {
            if (key === 'loc' || key === 'range' || key === 'start' || key === 'end') {
                continue;
            }

            const child = node[key];
            if (child && typeof child === 'object') {
                if (Array.isArray(child)) {
                    for (const item of child) {
                        if (item && typeof item === 'object') {
                            this.walkAST(item, visitor);
                        }
                    }
                } else if (child.type) {
                    this.walkAST(child, visitor);
                }
            }
        }
    }
}

module.exports = { AKMParser };
