// parser.js - Recursive descent parser -> AST
import { TokenType } from './lexer.js';

export class ParseError extends Error {
    constructor(message, line) {
        super(message);
        this.line = line;
    }
}

export class Parser {
    parse(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.instructions = [];
        this.directives = [];
        this.labels = {};
        this.equates = {};
        this.currentSection = 'text'; // Track current section

        while (!this.isAtEnd()) {
            this.skipNewlines();
            if (this.isAtEnd()) break;
            this.parseLine();
        }

        return {
            instructions: this.instructions,
            directives: this.directives,
            labels: this.labels,
            equates: this.equates
        };
    }

    parseLine() {
        // Label definition
        while (this.check(TokenType.LABEL_DEF)) {
            const label = this.advance();
            this.labels[label.value] = { index: this.instructions.length, line: label.line, section: this.currentSection };
        }

        this.skipNewlines();
        if (this.isAtEnd()) return;

        // Directive
        if (this.check(TokenType.DIRECTIVE)) {
            this.parseDirective();
            return;
        }

        // Instruction
        if (this.check(TokenType.MNEMONIC)) {
            this.parseInstruction();
            return;
        }

        // Skip to next line if we don't understand
        while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
            this.advance();
        }
    }

    parseDirective() {
        const dir = this.advance();
        const line = dir.line;

        switch (dir.value) {
            case '.equ':
            case '.set': {
                const name = this.expect(TokenType.LABEL_REF, 'Expected name after .equ').value;
                this.expect(TokenType.COMMA, 'Expected comma');
                const val = this.parseImmediateValue();
                this.equates[name] = val;
                break;
            }
            case '.byte':
            case '.hword':
            case '.word':
            case '.quad': {
                const values = [this.parseImmediateValue()];
                while (this.match(TokenType.COMMA)) {
                    values.push(this.parseImmediateValue());
                }
                this.directives.push({ type: dir.value, values, line, instrIndex: this.instructions.length, section: this.currentSection });
                break;
            }
            case '.ascii':
            case '.asciz':
            case '.string': {
                const str = this.expect(TokenType.STRING, 'Expected string').value;
                this.directives.push({
                    type: dir.value,
                    value: str,
                    line,
                    instrIndex: this.instructions.length,
                    section: this.currentSection
                });
                break;
            }
            case '.text':
                this.currentSection = 'text';
                if (this.check(TokenType.LABEL_REF)) this.advance();
                break;
            case '.data':
                this.currentSection = 'data';
                if (this.check(TokenType.LABEL_REF)) this.advance();
                break;
            case '.global':
            case '.globl':
                // Skip operand if present
                if (this.check(TokenType.LABEL_REF)) this.advance();
                break;
            case '.align':
            case '.balign':
            case '.skip':
            case '.space':
                this.parseImmediateValue();
                if (this.match(TokenType.COMMA)) this.parseImmediateValue();
                break;
            default:
                // Skip unknown directive
                while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) this.advance();
        }
    }

    parseInstruction() {
        const mnemonic = this.advance();
        const line = mnemonic.line;
        const mn = mnemonic.value;

        let node = { mnemonic: mn, operands: [], line };

        // Handle B.cond
        if (mn.startsWith('B.')) {
            node.mnemonic = 'B.cond';
            node.condition = mn.substring(2);
            node.operands.push(this.parseOperand());
            this.instructions.push(node);
            return;
        }

        switch (mn) {
            case 'NOP':
            case 'RET':
                // RET can optionally have a register
                if (mn === 'RET' && this.check(TokenType.REGISTER)) {
                    node.operands.push(this.parseOperand());
                }
                break;

            case 'B':
            case 'BL':
                node.operands.push(this.parseOperand());
                break;

            case 'BR':
            case 'BLR':
                node.operands.push(this.parseOperand());
                break;

            case 'SVC':
            case 'BRK':
                this.match(TokenType.HASH);
                node.operands.push(this.parseOperand());
                break;

            case 'CBZ':
            case 'CBNZ':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            case 'TBZ':
            case 'TBNZ':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                this.match(TokenType.HASH);
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            case 'MOV':
            case 'MOVZ':
            case 'MOVK':
            case 'MOVN':
            case 'MVN':
            case 'NEG':
            case 'NEGS':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                // Optional shift for MOVZ/MOVK/MOVN: LSL #16/32/48
                if (this.match(TokenType.COMMA)) {
                    node.operands.push(this.parseShiftOrExtend());
                }
                break;

            case 'CMP':
            case 'CMN':
            case 'TST':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                if (this.match(TokenType.COMMA)) {
                    node.operands.push(this.parseShiftOrExtend());
                }
                break;

            case 'ADD': case 'ADDS': case 'SUB': case 'SUBS':
            case 'AND': case 'ANDS': case 'ORR': case 'EOR':
            case 'BIC': case 'BICS': case 'ORN': case 'EON':
            case 'ADC': case 'ADCS': case 'SBC': case 'SBCS':
            case 'LSL': case 'LSR': case 'ASR': case 'ROR':
            case 'MUL': case 'SDIV': case 'UDIV':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                if (this.match(TokenType.COMMA)) {
                    node.operands.push(this.parseOperand());
                }
                // Optional shift
                if (this.match(TokenType.COMMA)) {
                    node.operands.push(this.parseShiftOrExtend());
                }
                break;

            case 'MADD':
            case 'MSUB':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            case 'CSEL':
            case 'CSINC':
            case 'CSINV':
            case 'CSNEG':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseCondition());
                break;

            case 'CSET':
            case 'CSETM':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseCondition());
                break;

            case 'CINC':
            case 'CINV':
            case 'CNEG':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseCondition());
                break;

            case 'LDR': case 'STR':
            case 'LDRB': case 'STRB':
            case 'LDRH': case 'STRH':
            case 'LDRSB': case 'LDRSH': case 'LDRSW':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseMemoryOperand());
                break;

            case 'LDP': case 'STP':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseMemoryOperand());
                break;

            case 'ADR':
            case 'ADRP':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            case 'MSR':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            case 'MRS':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            // NEON: LD1/ST1 {Vt.T}, [Xn]
            case 'LD1': case 'ST1':
                node.operands.push(this.parseRegisterList());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseMemoryOperand());
                break;

            // NEON: DUP Vd.T, Xn or DUP Vd.T, Vn.T[idx]
            case 'DUP':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            // NEON: INS Vd.T[idx], Xn or INS Vd.T[idx], Vn.T[idx]
            case 'INS':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            // NEON: UMOV Xd, Vn.T[idx]
            case 'UMOV':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            // NEON: MOVI Vd.T, #imm
            case 'MOVI':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                this.match(TokenType.HASH);
                node.operands.push(this.parseOperand());
                break;

            // NEON: ADDV Sd, Vn.T
            case 'ADDV':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            // NEON: CMEQ/CMGT/CMGE Vd.T, Vn.T, Vm.T or #0
            case 'CMEQ': case 'CMGT': case 'CMGE':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            // NEON: FADD/FSUB/FMUL/FDIV Vd.T, Vn.T, Vm.T
            case 'FADD': case 'FSUB': case 'FMUL': case 'FDIV':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            // NEON: NOT Vd.T, Vn.T (alias MVN for vectors)
            case 'NOT':
                node.operands.push(this.parseOperand());
                this.expect(TokenType.COMMA, 'Expected comma');
                node.operands.push(this.parseOperand());
                break;

            default:
                // Generic: parse comma-separated operands
                while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
                    node.operands.push(this.parseOperand());
                    if (!this.match(TokenType.COMMA)) break;
                }
        }

        this.instructions.push(node);
    }

    parseOperand() {
        if (this.check(TokenType.VECTOR_REGISTER)) {
            const vreg = this.advance();
            return {
                type: 'vector_register',
                reg: vreg.value.reg,
                index: vreg.value.index,
                arrangement: vreg.value.arrangement,
                elemIndex: vreg.value.elemIndex,
                scalar: vreg.value.scalar || null,
                line: vreg.line
            };
        }

        if (this.check(TokenType.REGISTER)) {
            const reg = this.advance();
            return { type: 'register', value: reg.value, line: reg.line };
        }

        if (this.check(TokenType.HASH)) {
            this.advance();
            return this.parseImmediateOperand();
        }

        if (this.check(TokenType.IMMEDIATE)) {
            const imm = this.advance();
            return { type: 'immediate', value: this.parseNumericValue(imm.value), line: imm.line };
        }

        if (this.check(TokenType.LABEL_REF)) {
            const label = this.advance();
            if (label.value.toUpperCase() === 'NZCV') {
                return { type: 'sysreg', value: 'NZCV', line: label.line };
            }
            return { type: 'label', value: label.value, line: label.line };
        }

        // Condition codes can also be label names (e.g., a label called "eq")
        if (this.check(TokenType.CONDITION)) {
            const cond = this.advance();
            return { type: 'label', value: cond.originalValue || cond.value, line: cond.line };
        }

        const tok = this.peek();
        throw new ParseError(`Unexpected token: ${tok.value} (${tok.type})`, tok.line);
    }

    parseImmediateOperand() {
        if (this.check(TokenType.IMMEDIATE)) {
            const imm = this.advance();
            return { type: 'immediate', value: this.parseNumericValue(imm.value), line: imm.line };
        }
        if (this.check(TokenType.LABEL_REF)) {
            const label = this.advance();
            // Could be an equate reference
            return { type: 'label', value: label.value, line: label.line };
        }
        const tok = this.peek();
        throw new ParseError(`Expected immediate value, got ${tok.value}`, tok.line);
    }

    parseCondition() {
        if (this.check(TokenType.CONDITION)) {
            const cond = this.advance();
            return { type: 'condition', value: cond.value, line: cond.line };
        }
        if (this.check(TokenType.LABEL_REF)) {
            const ref = this.advance();
            const upper = ref.value.toUpperCase();
            // May be a condition used as identifier
            return { type: 'condition', value: upper, line: ref.line };
        }
        const tok = this.peek();
        throw new ParseError(`Expected condition code, got ${tok.value}`, tok.line);
    }

    parseShiftOrExtend() {
        if (this.check(TokenType.SHIFT)) {
            const shift = this.advance();
            this.match(TokenType.HASH);
            const amount = this.check(TokenType.IMMEDIATE) ? this.parseNumericValue(this.advance().value) : 0;
            return { type: 'shift', shift: shift.value, amount, line: shift.line };
        }
        if (this.check(TokenType.EXTEND)) {
            const ext = this.advance();
            let amount = 0;
            if (this.match(TokenType.HASH) || this.check(TokenType.IMMEDIATE)) {
                amount = this.parseNumericValue(this.advance().value);
            }
            return { type: 'extend', extend: ext.value, amount, line: ext.line };
        }
        // Might be LSL used as mnemonic token
        if (this.check(TokenType.MNEMONIC)) {
            const mn = this.peek();
            if (['LSL', 'LSR', 'ASR', 'ROR'].includes(mn.value)) {
                this.advance();
                this.match(TokenType.HASH);
                const amount = this.check(TokenType.IMMEDIATE) ? this.parseNumericValue(this.advance().value) : 0;
                return { type: 'shift', shift: mn.value, amount, line: mn.line };
            }
        }
        return this.parseOperand();
    }

    parseRegisterList() {
        this.expect(TokenType.LBRACE, 'Expected {');
        const regs = [];
        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            regs.push(this.parseOperand());
            if (!this.match(TokenType.COMMA)) break;
        }
        this.expect(TokenType.RBRACE, 'Expected }');
        return {
            type: 'register_list',
            registers: regs,
            line: regs.length > 0 ? regs[0].line : 0
        };
    }

    parseMemoryOperand() {
        this.expect(TokenType.LBRACKET, 'Expected [');
        const base = this.expect(TokenType.REGISTER, 'Expected base register');

        let result = {
            type: 'memory',
            base: base.value,
            offset: null,
            offsetReg: null,
            preIndex: false,
            postIndex: false,
            shift: null,
            extend: null,
            line: base.line
        };

        if (this.match(TokenType.RBRACKET)) {
            // [Xn] or [Xn], #imm (post-index)
            if (this.match(TokenType.COMMA)) {
                this.match(TokenType.HASH);
                if (this.check(TokenType.IMMEDIATE)) {
                    result.offset = this.parseNumericValue(this.advance().value);
                }
                result.postIndex = true;
            }
            return result;
        }

        this.expect(TokenType.COMMA, 'Expected comma or ]');

        // Check for register offset
        if (this.check(TokenType.REGISTER)) {
            const offsetReg = this.advance();
            result.offsetReg = offsetReg.value;

            // Optional extend/shift
            if (this.match(TokenType.COMMA)) {
                if (this.check(TokenType.EXTEND)) {
                    const ext = this.advance();
                    result.extend = ext.value;
                    if (this.match(TokenType.HASH) || this.check(TokenType.IMMEDIATE)) {
                        result.shift = { type: 'LSL', amount: this.parseNumericValue(this.advance().value) };
                    }
                } else if (this.check(TokenType.SHIFT) || (this.check(TokenType.MNEMONIC) && this.peek().value === 'LSL')) {
                    const sh = this.advance();
                    this.match(TokenType.HASH);
                    const amount = this.check(TokenType.IMMEDIATE) ? this.parseNumericValue(this.advance().value) : 0;
                    result.shift = { type: sh.value, amount };
                }
            }
        } else {
            // Immediate offset
            this.match(TokenType.HASH);
            if (this.check(TokenType.IMMEDIATE)) {
                result.offset = this.parseNumericValue(this.advance().value);
            } else {
                result.offset = 0;
            }
        }

        this.expect(TokenType.RBRACKET, 'Expected ]');

        // Pre-index?
        if (this.match(TokenType.EXCL)) {
            result.preIndex = true;
        }

        return result;
    }

    parseImmediateValue() {
        this.match(TokenType.HASH);
        if (this.check(TokenType.IMMEDIATE)) {
            return this.parseNumericValue(this.advance().value);
        }
        if (this.check(TokenType.LABEL_REF)) {
            return this.advance().value; // Return as string, resolve later
        }
        const tok = this.peek();
        throw new ParseError(`Expected immediate value, got ${tok.value}`, tok.line);
    }

    parseNumericValue(str) {
        str = str.trim();
        const negative = str.startsWith('-');
        if (negative) str = str.substring(1);
        let val;
        if (str.startsWith('0x') || str.startsWith('0X')) {
            val = parseInt(str, 16);
        } else if (str.startsWith('0b') || str.startsWith('0B')) {
            val = parseInt(str.substring(2), 2);
        } else {
            val = parseInt(str, 10);
        }
        return negative ? -val : val;
    }

    // Token helpers
    peek() {
        return this.tokens[this.pos];
    }

    advance() {
        const tok = this.tokens[this.pos];
        this.pos++;
        return tok;
    }

    check(type) {
        if (this.isAtEnd()) return false;
        return this.tokens[this.pos].type === type;
    }

    match(type) {
        if (this.check(type)) {
            this.advance();
            return true;
        }
        return false;
    }

    expect(type, message) {
        if (this.check(type)) return this.advance();
        const tok = this.peek();
        throw new ParseError(`${message} at line ${tok.line}, got '${tok.value}' (${tok.type})`, tok.line);
    }

    skipNewlines() {
        while (this.check(TokenType.NEWLINE)) this.advance();
    }

    isAtEnd() {
        return this.pos >= this.tokens.length || this.tokens[this.pos].type === TokenType.EOF;
    }
}
