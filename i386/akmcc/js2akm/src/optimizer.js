/**
 * AKMOptimizer - Bytecode Optimizer
 * 
 * Performs various optimizations on the intermediate representation.
 */

const { OPCODES } = require('./constants');

class AKMOptimizer {
    constructor(options = {}) {
        this.options = options;
    }

    /**
     * Optimize the IR
     */
    optimize(ir) {
        // Run optimization passes
        ir = this.deadCodeElimination(ir);
        ir = this.constantFolding(ir);
        ir = this.peepholeOptimization(ir);
        ir = this.stringDeduplication(ir);

        return ir;
    }

    /**
     * Dead code elimination
     * Remove unreachable code after unconditional jumps/returns
     */
    deadCodeElimination(ir) {
        for (const func of ir.functions) {
            const newInstructions = [];
            let reachable = true;
            let seenLabels = new Set();

            // First pass: find all jump targets
            for (const instr of func.instructions) {
                if (instr.label) {
                    seenLabels.add(instr.label);
                }
                if (instr.target) {
                    seenLabels.add(instr.target);
                }
            }

            // Second pass: eliminate dead code
            for (let i = 0; i < func.instructions.length; i++) {
                const instr = func.instructions[i];

                // Check if this is a jump target
                if (seenLabels.has(i)) {
                    reachable = true;
                }

                if (reachable) {
                    newInstructions.push(instr);

                    // Unconditional jumps and returns make following code unreachable
                    if (instr.op === OPCODES.RET || 
                        instr.op === OPCODES.JMP ||
                        instr.op === OPCODES.HALT) {
                        reachable = false;
                    }
                }
            }

            func.instructions = newInstructions;
        }

        return ir;
    }

    /**
     * Constant folding
     * Evaluate constant expressions at compile time
     */
    constantFolding(ir) {
        for (const func of ir.functions) {
            const newInstructions = [];

            for (let i = 0; i < func.instructions.length; i++) {
                const instr = func.instructions[i];

                // Look for patterns like PUSH const1, PUSH const2, ADD
                if (i < func.instructions.length - 2) {
                    const next1 = func.instructions[i + 1];
                    const next2 = func.instructions[i + 2];

                    if (instr.op === OPCODES.PUSH && 
                        typeof instr.value === 'number' &&
                        next1.op === OPCODES.PUSH && 
                        typeof next1.value === 'number') {
                        
                        let result = null;
                        switch (next2.op) {
                            case OPCODES.ADD:
                                result = instr.value + next1.value;
                                break;
                            case OPCODES.SUB:
                                result = instr.value - next1.value;
                                break;
                            case OPCODES.MUL:
                                result = instr.value * next1.value;
                                break;
                            case OPCODES.DIV:
                                if (next1.value !== 0) {
                                    result = Math.floor(instr.value / next1.value);
                                }
                                break;
                            case OPCODES.MOD:
                                if (next1.value !== 0) {
                                    result = instr.value % next1.value;
                                }
                                break;
                            case OPCODES.AND:
                                result = instr.value & next1.value;
                                break;
                            case OPCODES.OR:
                                result = instr.value | next1.value;
                                break;
                            case OPCODES.XOR:
                                result = instr.value ^ next1.value;
                                break;
                            case OPCODES.SHL:
                                result = instr.value << next1.value;
                                break;
                            case OPCODES.SHR:
                                result = instr.value >>> next1.value;
                                break;
                        }

                        if (result !== null) {
                            // Replace with single PUSH
                            newInstructions.push({
                                op: OPCODES.PUSH,
                                value: result
                            });
                            i += 2;  // Skip next two instructions
                            continue;
                        }
                    }
                }

                newInstructions.push(instr);
            }

            func.instructions = newInstructions;
        }

        return ir;
    }

    /**
     * Peephole optimization
     * Optimize small patterns of instructions
     */
    peepholeOptimization(ir) {
        for (const func of ir.functions) {
            const newInstructions = [];

            for (let i = 0; i < func.instructions.length; i++) {
                const instr = func.instructions[i];
                const next = func.instructions[i + 1];

                // Remove PUSH followed by POP (no net effect)
                if (instr.op === OPCODES.PUSH && next && next.op === OPCODES.POP) {
                    i++;  // Skip both
                    continue;
                }

                // Remove double negation
                if (instr.op === OPCODES.NEG && next && next.op === OPCODES.NEG) {
                    i++;  // Skip both
                    continue;
                }

                // Remove double NOT
                if (instr.op === OPCODES.NOT && next && next.op === OPCODES.NOT) {
                    i++;
                    continue;
                }

                // Remove NOP instructions
                if (instr.op === OPCODES.NOP && !instr.isEntry) {
                    continue;
                }

                // PUSH 0, ADD -> NOP
                if (instr.op === OPCODES.PUSH && instr.value === 0 &&
                    next && next.op === OPCODES.ADD) {
                    i++;
                    continue;
                }

                // PUSH 1, MUL -> NOP
                if (instr.op === OPCODES.PUSH && instr.value === 1 &&
                    next && next.op === OPCODES.MUL) {
                    i++;
                    continue;
                }

                // DUP, POP -> NOP
                if (instr.op === OPCODES.DUP && next && next.op === OPCODES.POP) {
                    i++;
                    continue;
                }

                newInstructions.push(instr);
            }

            func.instructions = newInstructions;
        }

        return ir;
    }

    /**
     * String deduplication
     * Remove duplicate strings from the string table
     */
    stringDeduplication(ir) {
        const uniqueStrings = [];
        const stringMap = new Map();

        for (let i = 0; i < ir.strings.length; i++) {
            const str = ir.strings[i];
            
            if (!stringMap.has(str)) {
                stringMap.set(str, uniqueStrings.length);
                uniqueStrings.push(str);
            }
        }

        // Update string indices
        // Note: In a full implementation, we'd need to update all references

        ir.strings = uniqueStrings;
        return ir;
    }
}

module.exports = { AKMOptimizer };
