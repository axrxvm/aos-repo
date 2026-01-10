/**
 * AKMCodeGen - Bytecode Generator
 * 
 * Generates AKM bytecode from intermediate representation.
 */

const { OPCODES, API_FUNCTIONS } = require('./constants');

class AKMCodeGen {
    constructor(options = {}) {
        this.options = options;
        this.code = [];
        this.data = [];
        this.labels = new Map();
        this.fixups = [];
        this.currentOffset = 0;
    }

    /**
     * Generate bytecode from IR
     */
    generate(parseResult) {
        this.code = [];
        this.data = [];
        this.labels = new Map();
        this.fixups = [];
        this.currentOffset = 0;

        const { ir, commands, functions } = parseResult;

        // Build string table
        const stringTable = this.buildStringTable(ir.strings);

        // Generate code for each function
        const functionOffsets = new Map();
        
        for (const func of ir.functions) {
            functionOffsets.set(func.name, this.currentOffset);
            this.generateFunction(func, stringTable);
        }

        // Generate command registration stubs
        const commandStubs = this.generateCommandStubs(commands, stringTable, functionOffsets);

        // Resolve label fixups
        this.resolveFixups();

        // Build data section
        const dataSection = this.buildDataSection(stringTable, commandStubs);

        return {
            code: Buffer.from(this.code),
            data: dataSection,
            strings: ir.strings,
            functions: functionOffsets,
            commands: ir.commands,
            initOffset: functionOffsets.get('init') || 0,
            exitOffset: functionOffsets.get('exit') || 0,
            codeSize: this.code.length,
            dataSize: dataSection.length
        };
    }

    /**
     * Build string table
     */
    buildStringTable(strings) {
        const table = {
            entries: [],
            offsets: new Map(),
            totalSize: 0
        };

        let offset = 0;
        for (let i = 0; i < strings.length; i++) {
            const str = strings[i];
            const encoded = Buffer.from(str + '\0', 'utf8');
            
            table.entries.push({
                string: str,
                offset: offset,
                length: encoded.length
            });
            table.offsets.set(str, offset);
            table.offsets.set(i, offset);  // Also index by position
            offset += encoded.length;
        }
        table.totalSize = offset;

        return table;
    }

    /**
     * Generate bytecode for a function
     */
    generateFunction(func, stringTable) {
        // Function entry
        this.labels.set(func.name, this.currentOffset);

        // Prologue
        this.emit(OPCODES.NOP);  // Alignment/hook point

        // Local variable allocation
        for (const local of func.locals) {
            this.emit(OPCODES.PUSH);
            this.emitInt32(0);  // Initialize to 0
        }

        // Generate body
        for (const instr of func.instructions) {
            this.generateInstruction(instr, stringTable, func);
        }
    }

    /**
     * Generate bytecode for a single instruction
     */
    generateInstruction(instr, stringTable, func) {
        switch (instr.op) {
            case OPCODES.PUSH:
                this.emit(OPCODES.PUSH);
                this.emitValue(instr.value, stringTable);
                break;

            case OPCODES.PUSH_ARG:
                this.emit(OPCODES.PUSH_ARG);
                this.emit(instr.arg);
                break;

            case OPCODES.PUSH_STR:
                this.emit(OPCODES.PUSH_STR);
                this.emitInt32(stringTable.offsets.get(instr.value) || 0);
                break;

            case OPCODES.STORE_LOCAL:
                const localIdx = func.locals.indexOf(instr.name);
                this.emit(OPCODES.PUSH);
                this.emitValue(instr.value, stringTable);
                this.emit(OPCODES.STORE_LOCAL);
                this.emit(localIdx);
                break;

            case OPCODES.LOAD_LOCAL:
                this.emit(OPCODES.LOAD_LOCAL);
                this.emit(func.locals.indexOf(instr.name));
                break;

            case OPCODES.CALL:
                this.emit(OPCODES.CALL);
                this.addFixup(instr.func);
                this.emitInt32(0);  // Placeholder
                this.emit(instr.argc);
                break;

            case OPCODES.CALL_API:
                this.emit(OPCODES.CALL_API);
                this.emit(this.getAPIIndex(instr.method));
                this.emit(instr.argc);
                break;

            case OPCODES.RET:
                this.emit(OPCODES.RET);
                break;

            case OPCODES.JMP:
                this.emit(OPCODES.JMP);
                if (instr.label) {
                    this.addFixup(instr.label);
                }
                this.emitInt32(instr.target || 0);
                break;

            case OPCODES.JZ:
                this.emit(OPCODES.JZ);
                if (instr.label) {
                    this.addFixup(instr.label);
                }
                this.emitInt32(instr.target || 0);
                break;

            case OPCODES.JNZ:
                this.emit(OPCODES.JNZ);
                if (instr.label) {
                    this.addFixup(instr.label);
                }
                this.emitInt32(instr.target || 0);
                break;

            // Arithmetic
            case OPCODES.ADD:
            case OPCODES.SUB:
            case OPCODES.MUL:
            case OPCODES.DIV:
            case OPCODES.MOD:
            case OPCODES.NEG:
            case OPCODES.INC:
            case OPCODES.DEC:
            // Bitwise
            case OPCODES.AND:
            case OPCODES.OR:
            case OPCODES.XOR:
            case OPCODES.NOT:
            case OPCODES.SHL:
            case OPCODES.SHR:
            // Comparison
            case OPCODES.EQ:
            case OPCODES.NE:
            case OPCODES.LT:
            case OPCODES.LE:
            case OPCODES.GT:
            case OPCODES.GE:
            // Stack
            case OPCODES.POP:
            case OPCODES.DUP:
            case OPCODES.SWAP:
            case OPCODES.NOP:
            case OPCODES.HALT:
                this.emit(instr.op);
                break;

            default:
                // Unknown opcode, emit NOP
                this.emit(OPCODES.NOP);
        }
    }

    /**
     * Get API function index
     */
    getAPIIndex(method) {
        const apiNames = Object.keys(API_FUNCTIONS);
        const idx = apiNames.indexOf(method);
        return idx >= 0 ? idx : 0xFF;  // 0xFF = unknown
    }

    /**
     * Emit a single byte
     */
    emit(byte) {
        this.code.push(byte & 0xFF);
        this.currentOffset++;
    }

    /**
     * Emit a 32-bit integer (little-endian)
     */
    emitInt32(value) {
        this.code.push(value & 0xFF);
        this.code.push((value >> 8) & 0xFF);
        this.code.push((value >> 16) & 0xFF);
        this.code.push((value >> 24) & 0xFF);
        this.currentOffset += 4;
    }

    /**
     * Emit a 16-bit integer (little-endian)
     */
    emitInt16(value) {
        this.code.push(value & 0xFF);
        this.code.push((value >> 8) & 0xFF);
        this.currentOffset += 2;
    }

    /**
     * Emit a value (number, string ref, etc.)
     */
    emitValue(value, stringTable) {
        if (typeof value === 'number') {
            this.emitInt32(value);
        } else if (typeof value === 'string') {
            this.emitInt32(stringTable.offsets.get(value) || 0);
        } else if (value && value.ref) {
            // Variable reference - placeholder
            this.emitInt32(0);
        } else {
            this.emitInt32(0);
        }
    }

    /**
     * Add a fixup to be resolved later
     */
    addFixup(label) {
        this.fixups.push({
            offset: this.currentOffset,
            label: label
        });
    }

    /**
     * Resolve all fixups
     */
    resolveFixups() {
        for (const fixup of this.fixups) {
            const target = this.labels.get(fixup.label);
            if (target !== undefined) {
                // Write the target address at the fixup offset
                this.code[fixup.offset] = target & 0xFF;
                this.code[fixup.offset + 1] = (target >> 8) & 0xFF;
                this.code[fixup.offset + 2] = (target >> 16) & 0xFF;
                this.code[fixup.offset + 3] = (target >> 24) & 0xFF;
            }
        }
    }

    /**
     * Generate command registration stubs
     */
    generateCommandStubs(commands, stringTable, functionOffsets) {
        const stubs = [];

        for (const cmd of commands) {
            const handlerOffset = functionOffsets.get(cmd.handler) || 0;
            
            stubs.push({
                nameOffset: stringTable.offsets.get(cmd.name) || 0,
                syntaxOffset: stringTable.offsets.get(cmd.syntax) || 0,
                descOffset: stringTable.offsets.get(cmd.description) || 0,
                categoryOffset: stringTable.offsets.get(cmd.category) || 0,
                handlerOffset: handlerOffset
            });
        }

        return stubs;
    }

    /**
     * Build the data section
     */
    buildDataSection(stringTable, commandStubs) {
        const parts = [];

        // String table
        for (const entry of stringTable.entries) {
            parts.push(Buffer.from(entry.string + '\0', 'utf8'));
        }

        // Command stubs (each 20 bytes: 4 uint32 offsets + 4 byte handler offset)
        for (const stub of commandStubs) {
            const buf = Buffer.alloc(20);
            buf.writeUInt32LE(stub.nameOffset, 0);
            buf.writeUInt32LE(stub.syntaxOffset, 4);
            buf.writeUInt32LE(stub.descOffset, 8);
            buf.writeUInt32LE(stub.categoryOffset, 12);
            buf.writeUInt32LE(stub.handlerOffset, 16);
            parts.push(buf);
        }

        return Buffer.concat(parts);
    }
}

module.exports = { AKMCodeGen };
