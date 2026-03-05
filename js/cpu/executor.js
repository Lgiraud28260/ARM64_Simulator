// executor.js - Execute decoded instruction
import { MASK_64, MASK_32, signExtend, decodeBitmask, toSigned64, toSigned32, mask64, mask32 } from '../utils.js';
import { evaluateCondition } from './conditions.js';

const SHIFT_NAMES = ['LSL', 'LSR', 'ASR', 'ROR'];

export class ExecutionError extends Error {
    constructor(message) {
        super(message);
    }
}

export class Executor {
    constructor(registers, memory) {
        this.registers = registers;
        this.memory = memory;
        this.consoleOutput = null; // callback for SVC output
        this.halted = false;
        this.breakpoint = false;
        this.heap = null;    // set by UIController
        this.virtualFS = null; // set by UIController
    }

    execute(decoded, pc) {
        const regs = this.registers;
        const mem = this.memory;
        const type = decoded.type;

        // NEON instructions dispatch
        if (decoded.isNEON) {
            return this.executeNEON(decoded, pc);
        }

        switch (type) {
            case 'NOP': break;

            // Move instructions
            case 'MOV': return this.execMOV(decoded);
            case 'MOVZ': return this.execMOVZ(decoded);
            case 'MOVK': return this.execMOVK(decoded);
            case 'MOVN': return this.execMOVN(decoded);

            // Arithmetic
            case 'ADD': return this.execAddSub(decoded, false, false);
            case 'ADDS': return this.execAddSub(decoded, false, true);
            case 'SUB': return this.execAddSub(decoded, true, false);
            case 'SUBS': return this.execAddSub(decoded, true, true);
            case 'CMP': return this.execCMP(decoded);
            case 'CMN': return this.execCMN(decoded);
            case 'NEG': return this.execNEG(decoded, false);
            case 'NEGS': return this.execNEG(decoded, true);

            // ADC/SBC
            case 'ADC': return this.execADC(decoded, false, false);
            case 'ADCS': return this.execADC(decoded, false, true);
            case 'SBC': return this.execADC(decoded, true, false);
            case 'SBCS': return this.execADC(decoded, true, true);

            // Logical
            case 'AND': return this.execLogical(decoded, 'AND', false);
            case 'ANDS': return this.execLogical(decoded, 'AND', true);
            case 'ORR': return this.execLogical(decoded, 'ORR', false);
            case 'EOR': return this.execLogical(decoded, 'EOR', false);
            case 'BIC': return this.execLogical(decoded, 'BIC', false);
            case 'BICS': return this.execLogical(decoded, 'BIC', true);
            case 'ORN': return this.execLogical(decoded, 'ORN', false);
            case 'EON': return this.execLogical(decoded, 'EON', false);
            case 'MVN': return this.execMVN(decoded);
            case 'TST': return this.execTST(decoded);

            // Shift
            case 'LSL': case 'LSR': case 'ASR': case 'ROR':
                return this.execShift(decoded);

            // Multiply/Divide
            case 'MUL': return this.execMUL(decoded);
            case 'MADD': return this.execMADD(decoded);
            case 'MSUB': return this.execMSUB(decoded);
            case 'MNEG': return this.execMSUB(decoded); // MNEG is MSUB with Ra=XZR
            case 'SDIV': return this.execDIV(decoded, true);
            case 'UDIV': return this.execDIV(decoded, false);

            // Bitfield
            case 'UBFM': return this.execUBFM(decoded);
            case 'SBFM': return this.execSBFM(decoded);
            case 'BFM': return this.execBFM(decoded);
            case 'EXTR': return this.execEXTR(decoded);

            // Branch
            case 'B': return this.execB(decoded, pc);
            case 'BL': return this.execBL(decoded, pc);
            case 'B.cond': return this.execBcond(decoded, pc);
            case 'BR': return this.execBR(decoded);
            case 'BLR': return this.execBLR(decoded, pc);
            case 'RET': return this.execRET(decoded);
            case 'CBZ': return this.execCBZ(decoded, pc, false);
            case 'CBNZ': return this.execCBZ(decoded, pc, true);
            case 'TBZ': return this.execTBZ(decoded, pc, false);
            case 'TBNZ': return this.execTBZ(decoded, pc, true);

            // Load/Store
            case 'LDR': case 'LDRB': case 'LDRH':
            case 'LDRSB': case 'LDRSH': case 'LDRSW':
            case 'STR': case 'STRB': case 'STRH':
                return this.execLoadStore(decoded, pc);

            case 'LDP': case 'STP':
                return this.execLoadStorePair(decoded);

            // Conditional select
            case 'CSEL': return this.execCSEL(decoded);
            case 'CSINC': return this.execCSINC(decoded);
            case 'CSINV': return this.execCSINV(decoded);
            case 'CSNEG': return this.execCSNEG(decoded);
            case 'CSET': return this.execCSET(decoded);
            case 'CSETM': return this.execCSETM(decoded);
            case 'CINC': return this.execCINC(decoded);
            case 'CINV': return this.execCINV(decoded);
            case 'CNEG': return this.execCNEG(decoded);

            // PC-relative
            case 'ADR': return this.execADR(decoded, pc);
            case 'ADRP': return this.execADRP(decoded, pc);

            // System
            case 'SVC': return this.execSVC(decoded);
            case 'BRK': this.breakpoint = true; break;
            case 'MSR': return this.execMSR(decoded);
            case 'MRS': return this.execMRS(decoded);

            default:
                throw new ExecutionError(`Unimplemented instruction: ${type}`);
        }
    }

    // --- Helpers ---
    getReg(index, sf) {
        if (sf) return this.registers.getX(index);
        return this.registers.getW(index);
    }

    setReg(index, value, sf) {
        if (sf) this.registers.setX(index, value);
        else this.registers.setW(index, value);
    }

    applyShift(value, shiftType, amount, sf) {
        if (amount === 0) return value;
        const bits = sf ? 64 : 32;
        const mask = sf ? MASK_64 : MASK_32;
        value = BigInt(value) & mask;

        switch (shiftType) {
            case 0: // LSL
                return (value << BigInt(amount)) & mask;
            case 1: // LSR
                return (value >> BigInt(amount)) & mask;
            case 2: { // ASR
                const signBit = sf ? (1n << 63n) : (1n << 31n);
                if (value & signBit) {
                    const extended = value | ~mask;
                    return (extended >> BigInt(amount)) & mask;
                }
                return (value >> BigInt(amount)) & mask;
            }
            case 3: { // ROR
                const n = BigInt(amount % bits);
                return ((value >> n) | (value << BigInt(bits) - n)) & mask;
            }
            default: return value;
        }
    }

    addWithCarry(a, b, carryIn, sf) {
        const bits = sf ? 64n : 32n;
        const mask = (1n << bits) - 1n;
        a = BigInt(a) & mask;
        b = BigInt(b) & mask;
        const carry = carryIn ? 1n : 0n;

        const result = (a + b + carry) & mask;
        const signBit = 1n << (bits - 1n);

        const N = !!(result & signBit);
        const Z = result === 0n;
        // Carry: unsigned overflow
        const C = (a + b + carry) > mask;
        // Overflow: signed overflow
        const sameSign = !((a ^ b) & signBit);
        const V = sameSign && !!((a ^ result) & signBit);

        return { result, N, Z, C, V };
    }

    // --- Instruction implementations ---

    execMOV(decoded) {
        const { sf, rd, rn, rm, shift, imm6, isShiftedReg, isLogicalImm, N, immr, imms } = decoded;

        if (isLogicalImm) {
            // MOV from bitmask immediate (alias of ORR Rd, XZR, #imm)
            const regSize = sf ? 64 : 32;
            const value = decodeBitmask(N, imms, immr, regSize);
            if (value !== null) this.setReg(rd, value, sf);
            return;
        }

        if (isShiftedReg) {
            // MOV Rd, Rm (alias of ORR Rd, XZR, Rm)
            let value = this.getReg(rm, sf);
            if (shift && imm6) {
                value = this.applyShift(value, shift, imm6, sf);
            }
            this.setReg(rd, value, sf);
            return;
        }

        // Should not reach here normally
        if (decoded.rm !== undefined) {
            this.setReg(rd, this.getReg(decoded.rm, sf), sf);
        }
    }

    execMOVZ(decoded) {
        const { sf, rd, imm16, hw } = decoded;
        const value = BigInt(imm16) << BigInt(hw * 16);
        this.setReg(rd, value, sf);
    }

    execMOVK(decoded) {
        const { sf, rd, imm16, hw } = decoded;
        const mask = sf ? MASK_64 : MASK_32;
        const shiftAmt = BigInt(hw * 16);
        const clearMask = ~(0xFFFFn << shiftAmt) & mask;
        const current = this.getReg(rd, sf);
        const value = (current & clearMask) | (BigInt(imm16) << shiftAmt);
        this.setReg(rd, value, sf);
    }

    execMOVN(decoded) {
        const { sf, rd, imm16, hw } = decoded;
        const mask = sf ? MASK_64 : MASK_32;
        const value = ~(BigInt(imm16) << BigInt(hw * 16)) & mask;
        this.setReg(rd, value, sf);
    }

    execAddSub(decoded, isSub, setFlags) {
        const { sf, rd, rn, isImm, isShiftedReg } = decoded;

        let operand2;
        if (isImm) {
            operand2 = BigInt(decoded.imm);
        } else if (isShiftedReg) {
            operand2 = this.getReg(decoded.rm, sf);
            if (decoded.shift || decoded.imm6) {
                operand2 = this.applyShift(operand2, decoded.shift || 0, decoded.imm6 || 0, sf);
            }
        } else {
            operand2 = BigInt(decoded.imm || 0);
        }

        const a = this.getReg(rn, sf);
        const b = isSub ? (~operand2 & (sf ? MASK_64 : MASK_32)) : operand2;
        const carryIn = isSub; // SUB = ADD with inverted operand and carry=1

        const { result, N, Z, C, V } = this.addWithCarry(a, b, carryIn, sf);

        if (rd !== 31 || !setFlags) {
            this.setReg(rd, result, sf);
        }

        if (setFlags) {
            this.registers.N = N;
            this.registers.Z = Z;
            this.registers.C = C;
            this.registers.V = V;
        }
    }

    execCMP(decoded) {
        // CMP is SUBS with Rd=XZR
        decoded.rd = 31;
        this.execAddSub(decoded, true, true);
    }

    execCMN(decoded) {
        decoded.rd = 31;
        this.execAddSub(decoded, false, true);
    }

    execNEG(decoded, setFlags) {
        const { sf, rd, rm } = decoded;
        const a = 0n;
        const b = (~this.getReg(rm || decoded.rn, sf)) & (sf ? MASK_64 : MASK_32);
        const { result, N, Z, C, V } = this.addWithCarry(a, b, true, sf);
        this.setReg(rd, result, sf);
        if (setFlags) {
            this.registers.N = N;
            this.registers.Z = Z;
            this.registers.C = C;
            this.registers.V = V;
        }
    }

    execADC(decoded, isSub, setFlags) {
        const { sf, rd, rn, rm } = decoded;
        const a = this.getReg(rn, sf);
        let b = this.getReg(rm, sf);
        if (isSub) b = (~b) & (sf ? MASK_64 : MASK_32);
        const { result, N, Z, C, V } = this.addWithCarry(a, b, isSub ? this.registers.C : this.registers.C, sf);
        this.setReg(rd, result, sf);
        if (setFlags) {
            this.registers.N = N;
            this.registers.Z = Z;
            this.registers.C = C;
            this.registers.V = V;
        }
    }

    execLogical(decoded, op, setFlags) {
        const { sf, rd, rn, rm, isLogicalImm, isShiftedReg, N, immr, imms, opc } = decoded;

        let operand2;
        if (isLogicalImm) {
            const regSize = sf ? 64 : 32;
            operand2 = decodeBitmask(N, imms, immr, regSize);
            if (operand2 === null) throw new ExecutionError('Invalid bitmask immediate');
        } else {
            operand2 = this.getReg(rm, sf);
            if (decoded.shift || decoded.imm6) {
                operand2 = this.applyShift(operand2, decoded.shift || 0, decoded.imm6 || 0, sf);
            }
        }

        const a = this.getReg(rn, sf);
        const mask = sf ? MASK_64 : MASK_32;
        let result;

        switch (op) {
            case 'AND': result = a & operand2; break;
            case 'ORR': result = a | operand2; break;
            case 'EOR': result = a ^ operand2; break;
            case 'BIC': result = a & (~operand2 & mask); break;
            case 'ORN': result = a | (~operand2 & mask); break;
            case 'EON': result = a ^ (~operand2 & mask); break;
            default: result = a & operand2;
        }

        result = result & mask;
        this.setReg(rd, result, sf);

        if (setFlags) {
            const signBit = sf ? (1n << 63n) : (1n << 31n);
            this.registers.N = !!(result & signBit);
            this.registers.Z = result === 0n;
            this.registers.C = false;
            this.registers.V = false;
        }
    }

    execMVN(decoded) {
        const { sf, rd, rm, rn } = decoded;
        let value = this.getReg(rm || rn, sf);
        if (decoded.shift && decoded.imm6) {
            value = this.applyShift(value, decoded.shift, decoded.imm6, sf);
        }
        const mask = sf ? MASK_64 : MASK_32;
        this.setReg(rd, (~value) & mask, sf);
    }

    execTST(decoded) {
        decoded.rd = 31;
        this.execLogical(decoded, 'AND', true);
    }

    execShift(decoded) {
        const { sf, rd, rn, rm, isDP2, isBitfield, imm } = decoded;

        if (isBitfield) {
            // Immediate shift (from UBFM/SBFM alias)
            const value = this.getReg(rn, sf);
            const bits = sf ? 64 : 32;
            const mask = sf ? MASK_64 : MASK_32;
            let shiftType;
            switch (decoded.type) {
                case 'LSL': shiftType = 0; break;
                case 'LSR': shiftType = 1; break;
                case 'ASR': shiftType = 2; break;
                case 'ROR': shiftType = 3; break;
            }
            this.setReg(rd, this.applyShift(value, shiftType, imm, sf), sf);
            return;
        }

        // Register shift
        const value = this.getReg(rn, sf);
        const amount = Number(this.getReg(rm, sf)) & (sf ? 63 : 31);
        let shiftType;
        switch (decoded.type) {
            case 'LSL': shiftType = 0; break;
            case 'LSR': shiftType = 1; break;
            case 'ASR': shiftType = 2; break;
            case 'ROR': shiftType = 3; break;
        }
        this.setReg(rd, this.applyShift(value, shiftType, amount, sf), sf);
    }

    execMUL(decoded) {
        const { sf, rd, rn, rm } = decoded;
        const mask = sf ? MASK_64 : MASK_32;
        const result = (this.getReg(rn, sf) * this.getReg(rm, sf)) & mask;
        this.setReg(rd, result, sf);
    }

    execMADD(decoded) {
        const { sf, rd, rn, rm, ra } = decoded;
        const mask = sf ? MASK_64 : MASK_32;
        const result = (this.getReg(ra, sf) + this.getReg(rn, sf) * this.getReg(rm, sf)) & mask;
        this.setReg(rd, result, sf);
    }

    execMSUB(decoded) {
        const { sf, rd, rn, rm, ra } = decoded;
        const mask = sf ? MASK_64 : MASK_32;
        const addend = (ra === 31 || ra === undefined) ? 0n : this.getReg(ra, sf);
        const result = (addend - this.getReg(rn, sf) * this.getReg(rm, sf)) & mask;
        this.setReg(rd, result, sf);
    }

    execDIV(decoded, signed) {
        const { sf, rd, rn, rm } = decoded;
        const mask = sf ? MASK_64 : MASK_32;
        let dividend = this.getReg(rn, sf);
        let divisor = this.getReg(rm, sf);

        if (divisor === 0n) {
            this.setReg(rd, 0n, sf);
            return;
        }

        if (signed) {
            dividend = sf ? toSigned64(dividend) : toSigned32(dividend);
            divisor = sf ? toSigned64(divisor) : toSigned32(divisor);
            let result = dividend / divisor;
            // Truncate toward zero (JS BigInt already does this)
            this.setReg(rd, result & mask, sf);
        } else {
            this.setReg(rd, (dividend / divisor) & mask, sf);
        }
    }

    execUBFM(decoded) {
        const { sf, rd, rn, immr, imms } = decoded;
        const bits = sf ? 64 : 32;
        const mask = sf ? MASK_64 : MASK_32;
        const src = this.getReg(rn, sf);

        // UBFM semantics: extract bit field
        if (imms >= immr) {
            // Simple extraction
            const width = imms - immr + 1;
            const fieldMask = (1n << BigInt(width)) - 1n;
            const result = (src >> BigInt(immr)) & fieldMask;
            this.setReg(rd, result, sf);
        } else {
            // Rotation
            const low = (src & ((1n << BigInt(imms + 1)) - 1n)) << BigInt(bits - immr);
            const high = src >> BigInt(immr);
            this.setReg(rd, (low | high) & mask, sf);
        }
    }

    execSBFM(decoded) {
        const { sf, rd, rn, immr, imms } = decoded;
        const bits = sf ? 64 : 32;
        const mask = sf ? MASK_64 : MASK_32;
        const src = this.getReg(rn, sf);

        if (imms >= immr) {
            const width = imms - immr + 1;
            const fieldMask = (1n << BigInt(width)) - 1n;
            let result = (src >> BigInt(immr)) & fieldMask;
            // Sign extend
            result = signExtend(result, width);
            if (!sf) result &= MASK_32;
            this.setReg(rd, result & mask, sf);
        } else {
            const low = (src & ((1n << BigInt(imms + 1)) - 1n)) << BigInt(bits - immr);
            const high = src >> BigInt(immr);
            this.setReg(rd, (low | high) & mask, sf);
        }
    }

    execBFM(decoded) {
        const { sf, rd, rn, immr, imms } = decoded;
        const bits = sf ? 64 : 32;
        const mask = sf ? MASK_64 : MASK_32;
        const src = this.getReg(rn, sf);
        const dst = this.getReg(rd, sf);

        if (imms >= immr) {
            const width = imms - immr + 1;
            const fieldMask = (1n << BigInt(width)) - 1n;
            const field = (src >> BigInt(immr)) & fieldMask;
            const clearMask = ~fieldMask & mask;
            this.setReg(rd, (dst & clearMask) | field, sf);
        } else {
            // Rotation case
            this.setReg(rd, dst, sf);
        }
    }

    execEXTR(decoded) {
        const { sf, rd, rn, rm, imms } = decoded;
        const bits = sf ? 64 : 32;
        const mask = sf ? MASK_64 : MASK_32;
        const high = this.getReg(rn, sf);
        const low = this.getReg(rm, sf);
        const lsb = imms;

        const result = ((high << BigInt(bits - lsb)) | (low >> BigInt(lsb))) & mask;
        this.setReg(rd, result, sf);
    }

    // Branch instructions
    execB(decoded, pc) {
        const target = BigInt(pc) + BigInt(decoded.imm);
        this.registers.setPC(target);
        return true; // PC was modified
    }

    execBL(decoded, pc) {
        this.registers.setX(30, BigInt(pc) + 4n); // Link register
        const target = BigInt(pc) + BigInt(decoded.imm);
        this.registers.setPC(target);
        return true;
    }

    execBcond(decoded, pc) {
        const { cond } = decoded;
        const { N, Z, C, V } = this.registers;
        if (evaluateCondition(cond, N, Z, C, V)) {
            const target = BigInt(pc) + BigInt(decoded.imm);
            this.registers.setPC(target);
            return true;
        }
        return false;
    }

    execBR(decoded) {
        this.registers.setPC(this.registers.getX(decoded.rn));
        return true;
    }

    execBLR(decoded, pc) {
        this.registers.setX(30, BigInt(pc) + 4n);
        this.registers.setPC(this.registers.getX(decoded.rn));
        return true;
    }

    execRET(decoded) {
        const rn = decoded.rn !== undefined ? decoded.rn : 30;
        this.registers.setPC(this.registers.getX(rn));
        return true;
    }

    execCBZ(decoded, pc, isNZ) {
        const { sf, rt } = decoded;
        const val = this.getReg(rt, sf);
        const take = isNZ ? (val !== 0n) : (val === 0n);
        if (take) {
            this.registers.setPC(BigInt(pc) + BigInt(decoded.imm));
            return true;
        }
        return false;
    }

    execTBZ(decoded, pc, isNZ) {
        const { rt, bit } = decoded;
        const val = this.registers.getX(rt);
        const bitSet = !!(val & (1n << BigInt(bit)));
        const take = isNZ ? bitSet : !bitSet;
        if (take) {
            this.registers.setPC(BigInt(pc) + BigInt(decoded.imm));
            return true;
        }
        return false;
    }

    // Load/Store
    execLoadStore(decoded, pc) {
        const { type, sf, rt, rn, rm, size, opc, addrMode, isLiteral, offset } = decoded;
        const isStore = type.startsWith('STR');
        const regs = this.registers;
        const mem = this.memory;

        // Literal load
        if (isLiteral) {
            const addr = Number(BigInt(pc) + BigInt(decoded.imm));
            const value = sf ? mem.readDoubleWord(addr) : BigInt(mem.readWord(addr));
            this.setReg(rt, value, sf);
            return;
        }

        // Calculate address
        let base = Number(regs.getX(rn));
        let addr;

        if (addrMode === 'register') {
            // Register offset
            let offsetVal = Number(regs.getX(rm));
            if (decoded.option) {
                // Apply extend
                switch (decoded.option) {
                    case 0b010: // UXTW
                        offsetVal = offsetVal & 0xFFFFFFFF;
                        break;
                    case 0b011: // LSL
                        break;
                    case 0b110: // SXTW
                        offsetVal = offsetVal & 0xFFFFFFFF;
                        if (offsetVal & 0x80000000) offsetVal |= ~0xFFFFFFFF;
                        break;
                    case 0b111: // SXTX
                        break;
                }
            }
            if (decoded.S) {
                offsetVal <<= size;
            }
            addr = base + offsetVal;
        } else if (addrMode === 'postIndex') {
            addr = base;
            // Write back after access
            regs.setX(rn, BigInt(base + offset));
        } else if (addrMode === 'preIndex') {
            addr = base + offset;
            regs.setX(rn, BigInt(addr));
        } else {
            // Offset
            addr = base + (offset || 0);
        }

        if (isStore) {
            const val = this.getReg(rt, sf);
            switch (size) {
                case 0: mem.writeByte(addr, Number(val & 0xFFn)); break;
                case 1: mem.writeHalf(addr, Number(val & 0xFFFFn)); break;
                case 2: mem.writeWord(addr, Number(val & 0xFFFFFFFFn)); break;
                case 3: mem.writeDoubleWord(addr, val); break;
            }
        } else {
            let value;
            const isSigned = (opc >= 2);
            switch (size) {
                case 0: // byte
                    value = isSigned ? BigInt(mem.readSignedByte(addr)) : BigInt(mem.readByte(addr));
                    break;
                case 1: // half
                    value = isSigned ? BigInt(mem.readSignedHalf(addr)) : BigInt(mem.readHalf(addr));
                    break;
                case 2: // word
                    value = isSigned ? BigInt(mem.readSignedWord(addr)) : BigInt(mem.readWord(addr));
                    break;
                case 3: // doubleword
                    value = mem.readDoubleWord(addr);
                    break;
            }

            if (isSigned && sf) {
                // Sign-extend to 64 bits
                value = value & MASK_64;
            } else if (!sf) {
                value = value & MASK_32;
            }

            this.setReg(rt, value, sf);
        }
    }

    execLoadStorePair(decoded) {
        const { type, sf, rt, rt2, rn, offset, addrMode } = decoded;
        const isLoad = type === 'LDP';
        const regs = this.registers;
        const mem = this.memory;
        const elemSize = sf ? 8 : 4;

        let base = Number(regs.getX(rn));
        let addr;

        if (addrMode === 'postIndex') {
            addr = base;
            regs.setX(rn, BigInt(base + offset));
        } else if (addrMode === 'preIndex') {
            addr = base + offset;
            regs.setX(rn, BigInt(addr));
        } else {
            addr = base + offset;
        }

        if (isLoad) {
            if (sf) {
                this.setReg(rt, mem.readDoubleWord(addr), true);
                this.setReg(rt2, mem.readDoubleWord(addr + elemSize), true);
            } else {
                this.setReg(rt, BigInt(mem.readWord(addr)), false);
                this.setReg(rt2, BigInt(mem.readWord(addr + elemSize)), false);
            }
        } else {
            if (sf) {
                mem.writeDoubleWord(addr, regs.getX(rt));
                mem.writeDoubleWord(addr + elemSize, regs.getX(rt2));
            } else {
                mem.writeWord(addr, Number(regs.getW(rt)));
                mem.writeWord(addr + elemSize, Number(regs.getW(rt2)));
            }
        }
    }

    // Conditional select
    execCSEL(decoded) {
        const { sf, rd, rn, rm, cond } = decoded;
        const { N, Z, C, V } = this.registers;
        const take = evaluateCondition(cond, N, Z, C, V);
        this.setReg(rd, take ? this.getReg(rn, sf) : this.getReg(rm, sf), sf);
    }

    execCSINC(decoded) {
        const { sf, rd, rn, rm, cond } = decoded;
        const { N, Z, C, V } = this.registers;
        const mask = sf ? MASK_64 : MASK_32;
        const take = evaluateCondition(cond, N, Z, C, V);
        this.setReg(rd, take ? this.getReg(rn, sf) : ((this.getReg(rm, sf) + 1n) & mask), sf);
    }

    execCSINV(decoded) {
        const { sf, rd, rn, rm, cond } = decoded;
        const { N, Z, C, V } = this.registers;
        const mask = sf ? MASK_64 : MASK_32;
        const take = evaluateCondition(cond, N, Z, C, V);
        this.setReg(rd, take ? this.getReg(rn, sf) : ((~this.getReg(rm, sf)) & mask), sf);
    }

    execCSNEG(decoded) {
        const { sf, rd, rn, rm, cond } = decoded;
        const { N, Z, C, V } = this.registers;
        const mask = sf ? MASK_64 : MASK_32;
        const take = evaluateCondition(cond, N, Z, C, V);
        this.setReg(rd, take ? this.getReg(rn, sf) : (((~this.getReg(rm, sf)) + 1n) & mask), sf);
    }

    execCSET(decoded) {
        const { sf, rd, cond } = decoded;
        const { N, Z, C, V } = this.registers;
        // CSET uses inverted condition
        const take = evaluateCondition(cond ^ 1, N, Z, C, V);
        this.setReg(rd, take ? 1n : 0n, sf);
    }

    execCSETM(decoded) {
        const { sf, rd, cond } = decoded;
        const { N, Z, C, V } = this.registers;
        const mask = sf ? MASK_64 : MASK_32;
        const take = evaluateCondition(cond ^ 1, N, Z, C, V);
        this.setReg(rd, take ? mask : 0n, sf);
    }

    execCINC(decoded) {
        const { sf, rd, rn, cond } = decoded;
        const { N, Z, C, V } = this.registers;
        const mask = sf ? MASK_64 : MASK_32;
        const take = evaluateCondition(cond ^ 1, N, Z, C, V);
        const val = this.getReg(rn, sf);
        this.setReg(rd, take ? ((val + 1n) & mask) : val, sf);
    }

    execCINV(decoded) {
        const { sf, rd, rn, cond } = decoded;
        const { N, Z, C, V } = this.registers;
        const mask = sf ? MASK_64 : MASK_32;
        const take = evaluateCondition(cond ^ 1, N, Z, C, V);
        const val = this.getReg(rn, sf);
        this.setReg(rd, take ? ((~val) & mask) : val, sf);
    }

    execCNEG(decoded) {
        const { sf, rd, rn, cond } = decoded;
        const { N, Z, C, V } = this.registers;
        const mask = sf ? MASK_64 : MASK_32;
        const take = evaluateCondition(cond ^ 1, N, Z, C, V);
        const val = this.getReg(rn, sf);
        this.setReg(rd, take ? (((~val) + 1n) & mask) : val, sf);
    }

    execADR(decoded, pc) {
        const { rd, imm } = decoded;
        this.registers.setX(rd, BigInt(pc) + BigInt(imm));
    }

    execADRP(decoded, pc) {
        const { rd, imm } = decoded;
        const base = BigInt(pc) & ~0xFFFn;
        this.registers.setX(rd, base + (BigInt(imm) << 12n));
    }

    execSVC(decoded) {
        const sysno = Number(this.registers.getX(8));
        // Simplified syscall handling
        switch (sysno) {
            case 64: { // write
                const fd = Number(this.registers.getX(0));
                const bufAddr = Number(this.registers.getX(1));
                const len = Number(this.registers.getX(2));
                let str = '';
                for (let i = 0; i < len; i++) {
                    str += String.fromCharCode(this.memory.readByte(bufAddr + i));
                }
                if (this.consoleOutput) {
                    this.consoleOutput(str);
                }
                this.registers.setX(0, BigInt(len)); // return bytes written
                break;
            }
            case 93: // exit
                this.halted = true;
                break;
            case 0x100: { // print_int: print X0 as signed decimal
                const val = toSigned64(this.registers.getX(0));
                if (this.consoleOutput) this.consoleOutput(val.toString());
                break;
            }
            case 0x101: { // print_uint: print X0 as unsigned decimal
                const val = this.registers.getX(0);
                if (this.consoleOutput) this.consoleOutput(val.toString());
                break;
            }
            case 0x102: { // print_hex: print X0 as hex
                const val = this.registers.getX(0);
                if (this.consoleOutput) this.consoleOutput('0x' + val.toString(16).toUpperCase());
                break;
            }
            case 0x103: { // print_char: print X0 as ASCII char
                const val = Number(this.registers.getX(0)) & 0xFF;
                if (this.consoleOutput) this.consoleOutput(String.fromCharCode(val));
                break;
            }
            case 0x104: { // print_newline
                if (this.consoleOutput) this.consoleOutput('\n');
                break;
            }
            case 0x105: { // print_string: X0=addr, null-terminated
                const addr = Number(this.registers.getX(0));
                let str = '';
                for (let i = 0; i < 4096; i++) {
                    const ch = this.memory.readByte(addr + i);
                    if (ch === 0) break;
                    str += String.fromCharCode(ch);
                }
                if (this.consoleOutput) this.consoleOutput(str);
                break;
            }
            // Heap syscalls
            case 0x200: { // malloc: X0=size → X0=addr
                if (this.heap) {
                    const size = Number(this.registers.getX(0));
                    const addr = this.heap.malloc(size);
                    this.registers.setX(0, BigInt(addr));
                } else {
                    this.registers.setX(0, 0n);
                }
                break;
            }
            case 0x201: { // free: X0=addr
                if (this.heap) {
                    const addr = Number(this.registers.getX(0));
                    this.heap.free(addr);
                }
                break;
            }

            // File I/O syscalls
            case 0x210: { // open: X0=filename_addr → X0=fd
                if (this.virtualFS) {
                    const nameAddr = Number(this.registers.getX(0));
                    const fd = this.virtualFS.open(nameAddr);
                    this.registers.setX(0, BigInt(fd));
                } else {
                    this.registers.setX(0, BigInt(-1));
                }
                break;
            }
            case 0x211: { // read: X0=fd, X1=buf, X2=count → X0=bytes_read
                if (this.virtualFS) {
                    const fd = Number(this.registers.getX(0));
                    const buf = Number(this.registers.getX(1));
                    const count = Number(this.registers.getX(2));
                    const result = this.virtualFS.read(fd, buf, count);
                    this.registers.setX(0, BigInt(result));
                } else {
                    this.registers.setX(0, BigInt(-1));
                }
                break;
            }
            case 0x212: { // write(fd>2): X0=fd, X1=buf, X2=count → X0=bytes_written
                if (this.virtualFS) {
                    const fd = Number(this.registers.getX(0));
                    const buf = Number(this.registers.getX(1));
                    const count = Number(this.registers.getX(2));
                    const result = this.virtualFS.write(fd, buf, count);
                    this.registers.setX(0, BigInt(result));
                } else {
                    this.registers.setX(0, BigInt(-1));
                }
                break;
            }
            case 0x213: { // close: X0=fd → X0=0/-1
                if (this.virtualFS) {
                    const fd = Number(this.registers.getX(0));
                    const result = this.virtualFS.close(fd);
                    this.registers.setX(0, BigInt(result));
                } else {
                    this.registers.setX(0, BigInt(-1));
                }
                break;
            }

            default:
                if (this.consoleOutput) {
                    this.consoleOutput(`SVC #0: unhandled syscall ${sysno}\n`);
                }
        }
    }

    execMSR(decoded) {
        if (decoded.sysreg === 'NZCV') {
            const val = Number(this.registers.getX(decoded.rt));
            this.registers.setNZCV((val >> 28) & 0xF);
        }
    }

    execMRS(decoded) {
        if (decoded.sysreg === 'NZCV') {
            const nzcv = this.registers.getNZCV();
            this.registers.setX(decoded.rt, BigInt(nzcv << 28));
        }
    }

    // =========== NEON Execution ===========

    executeNEON(decoded, pc) {
        const type = decoded.type;
        switch (type) {
            case 'ADD': case 'SUB': case 'MUL':
                return this.execNEONArith(decoded);
            case 'AND': case 'ORR': case 'EOR': case 'BIC':
                return this.execNEONLogic(decoded);
            case 'NOT':
                return this.execNEONNot(decoded);
            case 'LD1':
                return this.execLD1(decoded);
            case 'ST1':
                return this.execST1(decoded);
            case 'DUP':
                return this.execDUP(decoded);
            case 'INS':
                return this.execINS(decoded);
            case 'UMOV':
                return this.execUMOV(decoded);
            case 'MOVI':
                return this.execMOVI(decoded);
            case 'ADDV':
                return this.execADDV(decoded);
            case 'CMEQ': case 'CMGT': case 'CMGE':
                return this.execNEONCmp(decoded);
            case 'FADD': case 'FSUB': case 'FMUL': case 'FDIV':
                return this.execNEONFloat(decoded);
            default:
                throw new ExecutionError(`Unimplemented NEON instruction: ${type}`);
        }
    }

    _laneWidth(arrangement) {
        const ch = arrangement[arrangement.length - 1].toUpperCase();
        switch (ch) {
            case 'B': return 8;
            case 'H': return 16;
            case 'S': return 32;
            case 'D': return 64;
            default: throw new ExecutionError(`Invalid arrangement: ${arrangement}`);
        }
    }

    _laneCount(arrangement) {
        return parseInt(arrangement);
    }

    execNEONArith(decoded) {
        const { rd, rn, rm, arrangement } = decoded;
        const regs = this.registers;
        const width = this._laneWidth(arrangement);
        const count = this._laneCount(arrangement);
        const mask = (1n << BigInt(width)) - 1n;

        for (let i = 0; i < count; i++) {
            const a = regs.getLane(rn, arrangement, i);
            const b = regs.getLane(rm, arrangement, i);
            let result;
            switch (decoded.type) {
                case 'ADD': result = (a + b) & mask; break;
                case 'SUB': result = (a - b + (1n << BigInt(width))) & mask; break;
                case 'MUL': result = (a * b) & mask; break;
            }
            regs.setLane(rd, arrangement, i, result);
        }
        // Clear upper bits if Q=0 (64-bit operation)
        if (decoded.Q === 0) {
            const v = regs.getV(rd);
            regs.setV(rd, 0n, v.lo);
        }
    }

    execNEONLogic(decoded) {
        const { rd, rn, rm } = decoded;
        const regs = this.registers;
        const fullA = regs.getV128(rn);
        const fullB = regs.getV128(rm);
        const mask128 = (1n << 128n) - 1n;
        let result;

        switch (decoded.type) {
            case 'AND': result = fullA & fullB; break;
            case 'ORR': result = fullA | fullB; break;
            case 'EOR': result = fullA ^ fullB; break;
            case 'BIC': result = fullA & (~fullB & mask128); break;
        }

        if (decoded.Q === 0) {
            result = result & MASK_64;
            regs.setV(rd, 0n, result);
        } else {
            regs.setV128(rd, result);
        }
    }

    execNEONNot(decoded) {
        const { rd, rn } = decoded;
        const regs = this.registers;
        const mask128 = (1n << 128n) - 1n;
        const val = regs.getV128(rn);
        const result = (~val) & mask128;

        if (decoded.Q === 0) {
            regs.setV(rd, 0n, result & MASK_64);
        } else {
            regs.setV128(rd, result);
        }
    }

    execLD1(decoded) {
        const { rt, rn, arrangement, Q } = decoded;
        const regs = this.registers;
        const mem = this.memory;
        const baseAddr = Number(regs.getX(rn));
        const totalBytes = Q ? 16 : 8;

        let value = 0n;
        for (let i = 0; i < totalBytes; i++) {
            const byte = BigInt(mem.readByte(baseAddr + i));
            value |= byte << BigInt(i * 8);
        }

        if (Q) {
            regs.setV(rt, (value >> 64n) & MASK_64, value & MASK_64);
        } else {
            regs.setV(rt, 0n, value & MASK_64);
        }
    }

    execST1(decoded) {
        const { rt, rn, arrangement, Q } = decoded;
        const regs = this.registers;
        const mem = this.memory;
        const baseAddr = Number(regs.getX(rn));
        const totalBytes = Q ? 16 : 8;
        const v = regs.getV(rt);
        const value = Q ? (v.hi << 64n) | v.lo : v.lo;

        for (let i = 0; i < totalBytes; i++) {
            mem.writeByte(baseAddr + i, Number((value >> BigInt(i * 8)) & 0xFFn));
        }
    }

    execDUP(decoded) {
        const { rd, rn, arrangement, Q } = decoded;
        const regs = this.registers;
        const width = this._laneWidth(arrangement);
        const count = this._laneCount(arrangement);
        const mask = (1n << BigInt(width)) - 1n;

        let srcVal;
        if (decoded.fromGP) {
            // DUP from general purpose register
            srcVal = regs.getX(rn) & mask;
        } else {
            // DUP from element
            const srcArr = arrangement;
            srcVal = regs.getLane(rn, srcArr, decoded.elemIndex);
        }

        for (let i = 0; i < count; i++) {
            regs.setLane(rd, arrangement, i, srcVal);
        }
        if (Q === 0) {
            const v = regs.getV(rd);
            regs.setV(rd, 0n, v.lo);
        }
    }

    execINS(decoded) {
        const { rd, rn, elemSize, elemIndex } = decoded;
        const regs = this.registers;
        const arrMap = ['B', 'H', 'S', 'D'];
        const width = [8, 16, 32, 64][elemSize];
        const mask = (1n << BigInt(width)) - 1n;
        // Use a fake arrangement for setLane: just need the size char
        const arr = `1${arrMap[elemSize]}`;

        if (decoded.fromGP) {
            const val = regs.getX(rn) & mask;
            regs.setLane(rd, arr, elemIndex, val);
        }
    }

    execUMOV(decoded) {
        const { rd, rn, elemSize, elemIndex, Q } = decoded;
        const regs = this.registers;
        const arrMap = ['B', 'H', 'S', 'D'];
        const width = [8, 16, 32, 64][elemSize];
        const arr = `1${arrMap[elemSize]}`;
        const val = regs.getLane(rn, arr, elemIndex);

        if (elemSize === 3) {
            // 64-bit move
            regs.setX(rd, val);
        } else {
            // Zero-extend to 32 or 64 bit
            regs.setW(rd, Number(val & 0xFFFFFFFFn));
        }
    }

    execMOVI(decoded) {
        const { rd, imm8, arrangement, Q } = decoded;
        const regs = this.registers;
        const width = this._laneWidth(arrangement);
        const count = this._laneCount(arrangement);
        const val = BigInt(imm8);

        for (let i = 0; i < count; i++) {
            regs.setLane(rd, arrangement, i, val);
        }
        if (Q === 0) {
            const v = regs.getV(rd);
            regs.setV(rd, 0n, v.lo);
        }
    }

    execADDV(decoded) {
        const { rd, rn, arrangement, Q } = decoded;
        const regs = this.registers;
        const width = this._laneWidth(arrangement);
        const count = this._laneCount(arrangement);
        const mask = (1n << BigInt(width)) - 1n;

        let sum = 0n;
        for (let i = 0; i < count; i++) {
            sum = (sum + regs.getLane(rn, arrangement, i)) & mask;
        }

        // Result goes to scalar register of same element size
        regs.setV(rd, 0n, sum);
    }

    execNEONCmp(decoded) {
        const { rd, rn, rm, arrangement, Q, type: cmpType } = decoded;
        const regs = this.registers;
        const width = this._laneWidth(arrangement);
        const count = this._laneCount(arrangement);
        const mask = (1n << BigInt(width)) - 1n;
        const signBit = 1n << BigInt(width - 1);

        for (let i = 0; i < count; i++) {
            let a = regs.getLane(rn, arrangement, i);
            let b = decoded.vsZero ? 0n : regs.getLane(rm, arrangement, i);

            // Sign extend for signed comparisons
            let sa = a, sb = b;
            if (a & signBit) sa = a - (1n << BigInt(width));
            if (b & signBit) sb = b - (1n << BigInt(width));

            let result;
            switch (cmpType) {
                case 'CMEQ': result = (a === b) ? mask : 0n; break;
                case 'CMGT': result = (sa > sb) ? mask : 0n; break;
                case 'CMGE': result = (sa >= sb) ? mask : 0n; break;
            }
            regs.setLane(rd, arrangement, i, result);
        }
        if (Q === 0) {
            const v = regs.getV(rd);
            regs.setV(rd, 0n, v.lo);
        }
    }

    execNEONFloat(decoded) {
        const { rd, rn, rm, arrangement, Q, type: opType } = decoded;
        const regs = this.registers;
        const width = this._laneWidth(arrangement);
        const count = this._laneCount(arrangement);
        const isDouble = width === 64;

        // Use DataView for float conversion
        const buf = new ArrayBuffer(8);
        const dv = new DataView(buf);

        const toFloat = (val) => {
            if (isDouble) {
                dv.setBigUint64(0, val & MASK_64, true);
                return dv.getFloat64(0, true);
            } else {
                dv.setUint32(0, Number(val & 0xFFFFFFFFn), true);
                return dv.getFloat32(0, true);
            }
        };

        const fromFloat = (f) => {
            if (isDouble) {
                dv.setFloat64(0, f, true);
                return dv.getBigUint64(0, true);
            } else {
                dv.setFloat32(0, f, true);
                return BigInt(dv.getUint32(0, true));
            }
        };

        for (let i = 0; i < count; i++) {
            const a = toFloat(regs.getLane(rn, arrangement, i));
            const b = toFloat(regs.getLane(rm, arrangement, i));
            let result;
            switch (opType) {
                case 'FADD': result = a + b; break;
                case 'FSUB': result = a - b; break;
                case 'FMUL': result = a * b; break;
                case 'FDIV': result = b !== 0 ? a / b : 0; break;
            }
            regs.setLane(rd, arrangement, i, fromFloat(result));
        }
        if (Q === 0) {
            const v = regs.getV(rd);
            regs.setV(rd, 0n, v.lo);
        }
    }
}
