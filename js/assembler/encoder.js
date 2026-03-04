// encoder.js - AST -> 32-bit ARM64 machine code
import {
    COND_CODES, SHIFT_TYPES, regNum, isW, isSP, invertCondition,
    encodeDataProcImm, encodeDataProcShiftedReg, encodeLogicalShiftedReg,
    encodeLogicalImm, encodeMoveWide, encodeBranch, encodeBranchCond,
    encodeCBZ, encodeTBZ, encodeBranchReg, encodeLoadStoreImm,
    encodeLoadStorePrePost, encodeLoadStoreReg, encodeLoadStorePair,
    encodeCondSelect, encodeDataProc3, encodeDataProc2, encodeADR,
    encodeSystem, encodeBRK, encodeNOP, encodeMSR_NZCV, encodeMRS_NZCV,
    encodeAddSubCarry
} from './encodings.js';
import { encodeBitmask } from '../utils.js';
import {
    vregNum, neonQ, neonSize,
    encodeSIMDThreeSame, encodeSIMDCopy, encodeSIMDModifiedImm,
    encodeSIMDLoadStoreMultiNoOffset, encodeSIMDAcrossLanes,
    encodeSIMDTwoRegMisc, encodeSIMDFloatThreeSame, dupFromGPImm5
} from './neon-encodings.js';

export class EncodeError extends Error {
    constructor(message, line) {
        super(message);
        this.line = line;
    }
}

export class Encoder {
    encode(node, pc, labels) {
        this.pc = pc;
        this.labels = labels || {};
        const mn = node.mnemonic;
        const ops = node.operands;
        const line = node.line;

        try {
            return this.encodeInstruction(mn, ops, node, line);
        } catch (e) {
            if (e instanceof EncodeError) throw e;
            throw new EncodeError(`${e.message} (encoding ${mn})`, line);
        }
    }

    encodeInstruction(mn, ops, node, line) {
        switch (mn) {
            case 'NOP': return encodeNOP();

            // MOV aliases
            case 'MOV': return this.encodeMOV(ops, line);
            case 'MOVZ': return this.encodeMOVZ(ops, line);
            case 'MOVK': return this.encodeMOVK(ops, line);
            case 'MOVN': return this.encodeMOVN(ops, line);

            // Arithmetic
            case 'ADD': case 'ADDS': case 'SUB': case 'SUBS':
                if (ops[0] && ops[0].type === 'vector_register') {
                    return this.encodeNEONArith(mn, ops, line);
                }
                return this.encodeAddSub(mn, ops, line);
            case 'CMP': return this.encodeAddSub('SUBS', [{ type: 'register', value: isW(ops[0].value) ? 'WZR' : 'XZR' }, ...ops], line);
            case 'CMN': return this.encodeAddSub('ADDS', [{ type: 'register', value: isW(ops[0].value) ? 'WZR' : 'XZR' }, ...ops], line);
            case 'NEG': return this.encodeAddSub('SUB', [ops[0], { type: 'register', value: isW(ops[0].value) ? 'WZR' : 'XZR' }, ops[1], ...(ops.length > 2 ? [ops[2]] : [])], line);
            case 'NEGS': return this.encodeAddSub('SUBS', [ops[0], { type: 'register', value: isW(ops[0].value) ? 'WZR' : 'XZR' }, ops[1], ...(ops.length > 2 ? [ops[2]] : [])], line);

            // ADC/SBC
            case 'ADC': return this.encodeAddSubCarry(0, 0, ops, line);
            case 'ADCS': return this.encodeAddSubCarry(0, 1, ops, line);
            case 'SBC': return this.encodeAddSubCarry(1, 0, ops, line);
            case 'SBCS': return this.encodeAddSubCarry(1, 1, ops, line);

            // Logical
            case 'AND': case 'ANDS': case 'ORR': case 'EOR':
            case 'BIC': case 'BICS': case 'ORN': case 'EON':
                if (ops[0] && ops[0].type === 'vector_register') {
                    return this.encodeNEONLogic(mn, ops, line);
                }
                return this.encodeLogical(mn, ops, line);
            case 'TST': return this.encodeLogical('ANDS', [{ type: 'register', value: isW(ops[0].value) ? 'WZR' : 'XZR' }, ...ops], line);
            case 'MVN':
                if (ops[0] && ops[0].type === 'vector_register') {
                    return this.encodeNEONNot(ops, line);
                }
                return this.encodeLogical('ORN', [ops[0], { type: 'register', value: isW(ops[0].value) ? 'WZR' : 'XZR' }, ops[1], ...(ops.length > 2 ? [ops[2]] : [])], line);

            // Shift (as instructions)
            case 'LSL': case 'LSR': case 'ASR': case 'ROR':
                return this.encodeShift(mn, ops, line);

            // Multiply / Divide
            case 'MUL':
                if (ops[0] && ops[0].type === 'vector_register') {
                    return this.encodeNEONArith(mn, ops, line);
                }
                return this.encodeMulDiv(mn, ops, line);
            case 'SDIV': case 'UDIV': return this.encodeMulDiv(mn, ops, line);
            case 'MADD': case 'MSUB': return this.encodeMulDiv(mn, ops, line);

            // Branch
            case 'B': return this.encodeB(ops, line);
            case 'BL': return this.encodeBL(ops, line);
            case 'B.cond': return this.encodeBcond(node.condition, ops, line);
            case 'BR': return encodeBranchReg(0b0000, regNum(ops[0].value));
            case 'BLR': return encodeBranchReg(0b0001, regNum(ops[0].value));
            case 'RET': return encodeBranchReg(0b0010, ops.length > 0 ? regNum(ops[0].value) : 30);

            // CBZ/CBNZ
            case 'CBZ': return this.encodeCBZ(0, ops, line);
            case 'CBNZ': return this.encodeCBZ(1, ops, line);

            // TBZ/TBNZ
            case 'TBZ': return this.encodeTBZ(0, ops, line);
            case 'TBNZ': return this.encodeTBZ(1, ops, line);

            // Load/Store
            case 'LDR': case 'LDRB': case 'LDRH': case 'LDRSB': case 'LDRSH': case 'LDRSW':
            case 'STR': case 'STRB': case 'STRH':
                return this.encodeLoadStore(mn, ops, line);

            // Load/Store Pair
            case 'LDP': case 'STP':
                return this.encodeLoadStorePair(mn, ops, line);

            // Conditional select
            case 'CSEL': return this.encodeCondSelect(0, 0, ops, line);
            case 'CSINC': return this.encodeCondSelect(0, 1, ops, line);
            case 'CSINV': return this.encodeCondSelect(1, 0, ops, line);
            case 'CSNEG': return this.encodeCondSelect(1, 1, ops, line);

            // CSET: CSINC Rd, XZR, XZR, invert(cond)
            case 'CSET': {
                const zr = isW(ops[0].value) ? 'WZR' : 'XZR';
                const condVal = invertCondition(ops[1].value);
                return this.encodeCondSelectRaw(0, 1, ops[0].value, zr, zr, condVal, line);
            }
            case 'CSETM': {
                const zr = isW(ops[0].value) ? 'WZR' : 'XZR';
                const condVal = invertCondition(ops[1].value);
                return this.encodeCondSelectRaw(1, 0, ops[0].value, zr, zr, condVal, line);
            }
            case 'CINC': {
                const condVal = invertCondition(ops[2].value);
                return this.encodeCondSelectRaw(0, 1, ops[0].value, ops[1].value, ops[1].value, condVal, line);
            }
            case 'CINV': {
                const condVal = invertCondition(ops[2].value);
                return this.encodeCondSelectRaw(1, 0, ops[0].value, ops[1].value, ops[1].value, condVal, line);
            }
            case 'CNEG': {
                const condVal = invertCondition(ops[2].value);
                return this.encodeCondSelectRaw(1, 1, ops[0].value, ops[1].value, ops[1].value, condVal, line);
            }

            // System
            case 'SVC': return encodeSystem(this.immVal(ops[0]));
            case 'BRK': return encodeBRK(this.immVal(ops[0]));

            // ADR/ADRP
            case 'ADR': return this.encodeADR(0, ops, line);
            case 'ADRP': return this.encodeADR(1, ops, line);

            // MSR/MRS
            case 'MSR': return this.encodeMSR(ops, line);
            case 'MRS': return this.encodeMRS(ops, line);

            // NEON instructions
            case 'LD1': return this.encodeLD1(ops, line);
            case 'ST1': return this.encodeST1(ops, line);
            case 'DUP': return this.encodeDUP(ops, line);
            case 'INS': return this.encodeINS(ops, line);
            case 'UMOV': return this.encodeUMOV(ops, line);
            case 'MOVI': return this.encodeMOVI(ops, line);
            case 'ADDV': return this.encodeADDV(ops, line);
            case 'CMEQ': return this.encodeNEONCmp('CMEQ', ops, line);
            case 'CMGT': return this.encodeNEONCmp('CMGT', ops, line);
            case 'CMGE': return this.encodeNEONCmp('CMGE', ops, line);
            case 'FADD': return this.encodeNEONFloat('FADD', ops, line);
            case 'FSUB': return this.encodeNEONFloat('FSUB', ops, line);
            case 'FMUL': return this.encodeNEONFloat('FMUL', ops, line);
            case 'FDIV': return this.encodeNEONFloat('FDIV', ops, line);
            case 'NOT': return this.encodeNEONNot(ops, line);

            default:
                throw new EncodeError(`Unknown mnemonic: ${mn}`, line);
        }
    }

    // --- Encoding methods ---

    encodeMOV(ops, line) {
        const rd = ops[0];
        const src = ops[1];
        const sf = isW(rd.value) ? 0 : 1;
        const rdN = regNum(rd.value);

        if (src.type === 'register') {
            // MOV Rd, Rn -> ORR Rd, XZR, Rn
            const rn = 31; // ZR
            const rm = regNum(src.value);
            return encodeLogicalShiftedReg(sf, 0b01, 0, 0, rm, 0, rn, rdN);
        }

        // MOV Rd, #imm -> MOVZ or MOVN
        const imm = BigInt(this.immVal(src));
        const regSize = sf ? 64 : 32;
        const mask = sf ? (1n << 64n) - 1n : (1n << 32n) - 1n;
        const val = imm & mask;

        // Try MOVZ
        for (let hw = 0; hw < (sf ? 4 : 2); hw++) {
            const chunk = Number((val >> BigInt(hw * 16)) & 0xFFFFn);
            const rest = val & ~(0xFFFFn << BigInt(hw * 16));
            if (rest === 0n) {
                return encodeMoveWide(sf, 0b10, hw, chunk, rdN);
            }
        }

        // Try MOVN
        const invVal = (~imm) & mask;
        for (let hw = 0; hw < (sf ? 4 : 2); hw++) {
            const chunk = Number((invVal >> BigInt(hw * 16)) & 0xFFFFn);
            const rest = invVal & ~(0xFFFFn << BigInt(hw * 16));
            if (rest === 0n) {
                return encodeMoveWide(sf, 0b00, hw, chunk, rdN);
            }
        }

        // Try logical immediate (ORR Rd, XZR, #imm)
        const bitmask = encodeBitmask(val, regSize);
        if (bitmask) {
            return encodeLogicalImm(sf, 0b01, bitmask.N, bitmask.immr, bitmask.imms, 31, rdN);
        }

        throw new EncodeError(`Cannot encode MOV immediate: ${imm}`, line);
    }

    encodeMOVZ(ops, line) {
        const sf = isW(ops[0].value) ? 0 : 1;
        const rd = regNum(ops[0].value);
        const imm16 = this.immVal(ops[1]) & 0xFFFF;
        let hw = 0;
        if (ops.length > 2 && ops[2].type === 'shift') {
            hw = ops[2].amount / 16;
        }
        return encodeMoveWide(sf, 0b10, hw, imm16, rd);
    }

    encodeMOVK(ops, line) {
        const sf = isW(ops[0].value) ? 0 : 1;
        const rd = regNum(ops[0].value);
        const imm16 = this.immVal(ops[1]) & 0xFFFF;
        let hw = 0;
        if (ops.length > 2 && ops[2].type === 'shift') {
            hw = ops[2].amount / 16;
        }
        return encodeMoveWide(sf, 0b11, hw, imm16, rd);
    }

    encodeMOVN(ops, line) {
        const sf = isW(ops[0].value) ? 0 : 1;
        const rd = regNum(ops[0].value);
        const imm16 = this.immVal(ops[1]) & 0xFFFF;
        let hw = 0;
        if (ops.length > 2 && ops[2].type === 'shift') {
            hw = ops[2].amount / 16;
        }
        return encodeMoveWide(sf, 0b00, hw, imm16, rd);
    }

    encodeAddSub(mn, ops, line) {
        const isS = mn.endsWith('S');
        const isSub = mn.startsWith('SUB');
        const sf = isW(ops[0].value) ? 0 : 1;
        const rd = regNum(ops[0].value);
        const rn = regNum(ops[1].value);
        const op = isSub ? 1 : 0;
        const S = isS ? 1 : 0;

        const src = ops[2];
        if (!src) {
            // Two-operand form: ADD Rd, #imm -> ADD Rd, Rd, #imm
            throw new EncodeError(`${mn} requires 3 operands`, line);
        }

        if (src.type === 'immediate') {
            const imm = this.immVal(src);
            if (imm < 0) {
                // Negative immediate: flip ADD/SUB
                const flipped = isSub ? 'ADD' + (isS ? 'S' : '') : 'SUB' + (isS ? 'S' : '');
                return this.encodeAddSub(flipped, [ops[0], ops[1], { type: 'immediate', value: -imm }], line);
            }
            if (imm >= 0 && imm <= 0xFFF) {
                return encodeDataProcImm(sf, op, S, rd, rn, imm, 0);
            }
            if ((imm & 0xFFF) === 0 && (imm >> 12) <= 0xFFF) {
                return encodeDataProcImm(sf, op, S, rd, rn, imm >> 12, 1);
            }
            throw new EncodeError(`Immediate ${imm} out of range for ${mn}`, line);
        }

        if (src.type === 'register') {
            const rm = regNum(src.value);
            let shiftType = 0, shiftAmt = 0;
            if (ops.length > 3 && ops[3].type === 'shift') {
                shiftType = SHIFT_TYPES[ops[3].shift] || 0;
                shiftAmt = ops[3].amount || 0;
            }
            return encodeDataProcShiftedReg(sf, op, S, shiftType, rm, shiftAmt, rn, rd);
        }

        throw new EncodeError(`Invalid operand for ${mn}`, line);
    }

    encodeAddSubCarry(op, S, ops, line) {
        const sf = isW(ops[0].value) ? 0 : 1;
        const rd = regNum(ops[0].value);
        const rn = regNum(ops[1].value);
        const rm = regNum(ops[2].value);
        return encodeAddSubCarry(sf, op, S, rm, rn, rd);
    }

    encodeLogical(mn, ops, line) {
        const base = mn.replace('S', '');
        const isS = mn.endsWith('S') && mn !== 'BICS' ? (mn === 'ANDS' || mn === 'BICS') : mn === 'ANDS' || mn === 'BICS';

        let opc, N = 0;
        switch (base) {
            case 'AND': case 'ANDS': opc = mn === 'ANDS' || mn === 'TST' ? 0b11 : 0b00; break;
            case 'ORR': opc = 0b01; break;
            case 'EOR': opc = 0b10; break;
            case 'BIC': opc = mn === 'BICS' ? 0b11 : 0b00; N = 1; break;
            case 'ORN': opc = 0b01; N = 1; break;
            case 'EON': opc = 0b10; N = 1; break;
            default: opc = 0b00;
        }

        // Fix: ANDS has opc=11
        if (mn === 'ANDS') opc = 0b11;
        if (mn === 'BICS') { opc = 0b11; N = 1; }

        const sf = isW(ops[0].value) ? 0 : 1;
        const rd = regNum(ops[0].value);
        const rn = regNum(ops[1].value);
        const src = ops[2];

        if (src.type === 'immediate') {
            // Logical immediate
            const regSize = sf ? 64 : 32;
            const immVal = BigInt(this.immVal(src)) & ((1n << BigInt(regSize)) - 1n);
            const bitmask = encodeBitmask(immVal, regSize);
            if (!bitmask) {
                throw new EncodeError(`Cannot encode logical immediate: ${immVal}`, line);
            }
            // N cannot be used with logical immediate encoding (it's part of the immediate)
            return encodeLogicalImm(sf, opc, bitmask.N, bitmask.immr, bitmask.imms, rn, rd);
        }

        if (src.type === 'register') {
            const rm = regNum(src.value);
            let shiftType = 0, shiftAmt = 0;
            if (ops.length > 3 && ops[3].type === 'shift') {
                shiftType = SHIFT_TYPES[ops[3].shift] || 0;
                shiftAmt = ops[3].amount || 0;
            }
            return encodeLogicalShiftedReg(sf, opc, N, shiftType, rm, shiftAmt, rn, rd);
        }

        throw new EncodeError(`Invalid operand for ${mn}`, line);
    }

    encodeShift(mn, ops, line) {
        const sf = isW(ops[0].value) ? 0 : 1;
        const rd = regNum(ops[0].value);
        const rn = regNum(ops[1].value);
        const src = ops[2];

        if (src.type === 'immediate') {
            // Shift by immediate -> encode as UBFM/SBFM alias
            const imm = this.immVal(src);
            const regSize = sf ? 64 : 32;

            switch (mn) {
                case 'LSL': {
                    // LSL Rd, Rn, #imm -> UBFM Rd, Rn, #(-imm mod regSize), #(regSize-1-imm)
                    const immr = (-imm) & (regSize - 1);
                    const imms = regSize - 1 - imm;
                    const N = sf;
                    // UBFM: opc=10, sf|10|100110|N|immr|imms|Rn|Rd
                    return ((sf & 1) << 31) | (0b10 << 29) | (0b100110 << 23) |
                           ((N & 1) << 22) | ((immr & 0x3F) << 16) | ((imms & 0x3F) << 10) |
                           ((rn & 0x1F) << 5) | (rd & 0x1F);
                }
                case 'LSR': {
                    // LSR Rd, Rn, #imm -> UBFM Rd, Rn, #imm, #(regSize-1)
                    const immr = imm;
                    const imms = regSize - 1;
                    const N = sf;
                    return ((sf & 1) << 31) | (0b10 << 29) | (0b100110 << 23) |
                           ((N & 1) << 22) | ((immr & 0x3F) << 16) | ((imms & 0x3F) << 10) |
                           ((rn & 0x1F) << 5) | (rd & 0x1F);
                }
                case 'ASR': {
                    // ASR Rd, Rn, #imm -> SBFM Rd, Rn, #imm, #(regSize-1)
                    const immr = imm;
                    const imms = regSize - 1;
                    const N = sf;
                    // SBFM: opc=00
                    return ((sf & 1) << 31) | (0b00 << 29) | (0b100110 << 23) |
                           ((N & 1) << 22) | ((immr & 0x3F) << 16) | ((imms & 0x3F) << 10) |
                           ((rn & 0x1F) << 5) | (rd & 0x1F);
                }
                case 'ROR': {
                    // ROR Rd, Rn, #imm -> EXTR Rd, Rn, Rn, #imm
                    const N = sf;
                    // EXTR: sf|00|100111|N|0|Rm|imms|Rn|Rd
                    return ((sf & 1) << 31) | (0b00 << 29) | (0b100111 << 23) |
                           ((N & 1) << 22) | (0 << 21) | ((rn & 0x1F) << 16) |
                           ((imm & 0x3F) << 10) | ((rn & 0x1F) << 5) | (rd & 0x1F);
                }
            }
        }

        if (src.type === 'register') {
            // Shift by register -> Data Processing (2 source)
            const rm = regNum(src.value);
            let opcode;
            switch (mn) {
                case 'LSL': opcode = 0b001000; break;
                case 'LSR': opcode = 0b001001; break;
                case 'ASR': opcode = 0b001010; break;
                case 'ROR': opcode = 0b001011; break;
            }
            return encodeDataProc2(sf, 0, rm, opcode, rn, rd);
        }

        throw new EncodeError(`Invalid operand for ${mn}`, line);
    }

    encodeMulDiv(mn, ops, line) {
        const sf = isW(ops[0].value) ? 0 : 1;
        const rd = regNum(ops[0].value);
        const rn = regNum(ops[1].value);
        const rm = regNum(ops[2].value);

        switch (mn) {
            case 'MUL':
                // MADD Rd, Rn, Rm, XZR
                return encodeDataProc3(sf, 0b00, 0b000, rm, 0, 31, rn, rd);
            case 'MADD':
                return encodeDataProc3(sf, 0b00, 0b000, rm, 0, regNum(ops[3].value), rn, rd);
            case 'MSUB':
                return encodeDataProc3(sf, 0b00, 0b000, rm, 1, regNum(ops[3].value), rn, rd);
            case 'SDIV':
                return encodeDataProc2(sf, 0, rm, 0b000011, rn, rd);
            case 'UDIV':
                return encodeDataProc2(sf, 0, rm, 0b000010, rn, rd);
        }
    }

    encodeB(ops, line) {
        const target = this.resolveBranchTarget(ops[0]);
        const offset = target - this.pc;
        if (offset & 0x3) throw new EncodeError('Branch target not aligned', line);
        const imm26 = (offset >> 2) & 0x3FFFFFF;
        return encodeBranch(0, imm26);
    }

    encodeBL(ops, line) {
        const target = this.resolveBranchTarget(ops[0]);
        const offset = target - this.pc;
        if (offset & 0x3) throw new EncodeError('Branch target not aligned', line);
        const imm26 = (offset >> 2) & 0x3FFFFFF;
        return encodeBranch(1, imm26);
    }

    encodeBcond(condition, ops, line) {
        const target = this.resolveBranchTarget(ops[0]);
        const offset = target - this.pc;
        if (offset & 0x3) throw new EncodeError('Branch target not aligned', line);
        const imm19 = (offset >> 2) & 0x7FFFF;
        return encodeBranchCond(imm19, COND_CODES[condition]);
    }

    encodeCBZ(op, ops, line) {
        const sf = isW(ops[0].value) ? 0 : 1;
        const rt = regNum(ops[0].value);
        const target = this.resolveBranchTarget(ops[1]);
        const offset = target - this.pc;
        const imm19 = (offset >> 2) & 0x7FFFF;
        return encodeCBZ(sf, op, imm19, rt);
    }

    encodeTBZ(op, ops, line) {
        const rt = regNum(ops[0].value);
        const bit = this.immVal(ops[1]);
        const b5 = (bit >> 5) & 1;
        const b40 = bit & 0x1F;
        const target = this.resolveBranchTarget(ops[2]);
        const offset = target - this.pc;
        const imm14 = (offset >> 2) & 0x3FFF;
        return encodeTBZ(b5, op, b40, imm14, rt);
    }

    encodeLoadStore(mn, ops, line) {
        const rt = regNum(ops[0].value);
        const isStore = mn.startsWith('STR');
        const isSigned = mn.startsWith('LDRS');
        const rtIsW = isW(ops[0].value);
        const sf = rtIsW ? 0 : 1;

        // Determine size and opc
        let size, opc;
        switch (mn) {
            case 'LDR':  size = sf ? 0b11 : 0b10; opc = 0b01; break;
            case 'STR':  size = sf ? 0b11 : 0b10; opc = 0b00; break;
            case 'LDRB': size = 0b00; opc = 0b01; break;
            case 'STRB': size = 0b00; opc = 0b00; break;
            case 'LDRH': size = 0b01; opc = 0b01; break;
            case 'STRH': size = 0b01; opc = 0b00; break;
            case 'LDRSB': size = 0b00; opc = sf ? 0b10 : 0b11; break;
            case 'LDRSH': size = 0b01; opc = sf ? 0b10 : 0b11; break;
            case 'LDRSW': size = 0b10; opc = 0b10; break;
            default: throw new EncodeError(`Unknown load/store: ${mn}`, line);
        }

        const mem = ops[1]; // memory operand

        if (mem.type === 'label') {
            // LDR Xt, =label -> encode as LDR literal
            // For simplicity, encode as PC-relative
            const target = this.resolveBranchTarget(mem);
            const offset = target - this.pc;
            const imm19 = (offset >> 2) & 0x7FFFF;
            // LDR literal: opc|011|V|00|imm19|Rt
            const litOpc = sf ? 0b01 : 0b00;
            return ((litOpc & 0x3) << 30) | (0b011 << 27) | (0 << 26) | (0b00 << 24) |
                   ((imm19 & 0x7FFFF) << 5) | (rt & 0x1F);
        }

        if (mem.type !== 'memory') {
            throw new EncodeError(`Expected memory operand for ${mn}`, line);
        }

        const rn = regNum(mem.base);

        // Register offset
        if (mem.offsetReg) {
            const rm = regNum(mem.offsetReg);
            let option = 0b011; // LSL
            let S = 0;
            if (mem.extend) {
                const extMap = { 'UXTW': 0b010, 'LSL': 0b011, 'SXTW': 0b110, 'SXTX': 0b111 };
                option = extMap[mem.extend] || 0b011;
            }
            if (mem.shift && mem.shift.amount > 0) {
                S = 1;
            }
            return encodeLoadStoreReg(size, 0, opc, rm, option, S, rn, rt);
        }

        const offset = mem.offset || 0;

        // Pre/Post index
        if (mem.preIndex) {
            const imm9 = offset & 0x1FF;
            return encodeLoadStorePrePost(size, 0, opc, imm9, 0b11, rn, rt);
        }

        if (mem.postIndex) {
            const imm9 = offset & 0x1FF;
            return encodeLoadStorePrePost(size, 0, opc, imm9, 0b01, rn, rt);
        }

        // Unsigned offset
        const scale = size;
        const scaledOffset = offset >> scale;
        if (offset >= 0 && (offset & ((1 << scale) - 1)) === 0 && scaledOffset <= 0xFFF) {
            return encodeLoadStoreImm(size, 0, opc, scaledOffset, rn, rt);
        }

        // Fall back to unscaled if offset fits in 9 bits
        if (offset >= -256 && offset <= 255) {
            const imm9 = offset & 0x1FF;
            // LDUR/STUR: size|111|V|00|opc|0|imm9|00|Rn|Rt
            return ((size & 0x3) << 30) | (0b111 << 27) | (0 << 26) | (0b00 << 24) |
                   ((opc & 0x3) << 22) | (0 << 21) | ((imm9 & 0x1FF) << 12) |
                   (0b00 << 10) | ((rn & 0x1F) << 5) | (rt & 0x1F);
        }

        throw new EncodeError(`Offset ${offset} out of range for ${mn}`, line);
    }

    encodeLoadStorePair(mn, ops, line) {
        const isLoad = mn === 'LDP';
        const rt = regNum(ops[0].value);
        const rt2 = regNum(ops[1].value);
        const sf = isW(ops[0].value) ? 0 : 1;
        const mem = ops[2];

        const rn = regNum(mem.base);
        const offset = mem.offset || 0;
        const scale = sf ? 3 : 2; // 8 bytes for X, 4 bytes for W
        const imm7 = (offset >> scale) & 0x7F;
        const opc = sf ? 0b10 : 0b00;
        const L = isLoad ? 1 : 0;

        if (mem.preIndex) {
            return encodeLoadStorePair(opc, 0, 0b11, L, imm7, rt2, rn, rt);
        }
        if (mem.postIndex) {
            return encodeLoadStorePair(opc, 0, 0b01, L, imm7, rt2, rn, rt);
        }
        // Signed offset
        return encodeLoadStorePair(opc, 0, 0b10, L, imm7, rt2, rn, rt);
    }

    encodeCondSelect(op_base, op2_base, ops, line) {
        const condStr = ops[3].value;
        const cond = COND_CODES[condStr];
        return this.encodeCondSelectRaw(
            op_base === 1 ? 1 : 0,    // op
            op2_base,                   // op2
            ops[0].value, ops[1].value, ops[2].value, cond, line
        );
    }

    encodeCondSelectRaw(op, op2, rdName, rnName, rmName, cond, line) {
        const sf = isW(rdName) ? 0 : 1;
        const rd = regNum(rdName);
        const rn = regNum(rnName);
        const rm = regNum(rmName);
        return encodeCondSelect(sf, op, 0, rm, cond, op2, rn, rd);
    }

    encodeADR(op, ops, line) {
        const rd = regNum(ops[0].value);
        const target = this.resolveBranchTarget(ops[1]);
        let offset;
        if (op === 0) {
            // ADR
            offset = target - this.pc;
        } else {
            // ADRP - page-relative
            offset = (target & ~0xFFF) - (this.pc & ~0xFFF);
            offset >>= 12;
        }
        const immlo = offset & 0x3;
        const immhi = (offset >> 2) & 0x7FFFF;
        return encodeADR(op, immlo, immhi, rd);
    }

    encodeMSR(ops, line) {
        // MSR NZCV, Xt
        if (ops[0].type === 'sysreg' || (ops[0].type === 'register' && ops[0].value === 'NZCV') ||
            (ops[0].type === 'label' && ops[0].value.toUpperCase() === 'NZCV')) {
            return encodeMSR_NZCV(regNum(ops[1].value));
        }
        throw new EncodeError('Only MSR NZCV supported', line);
    }

    encodeMRS(ops, line) {
        // MRS Xt, NZCV
        if (ops[1].type === 'sysreg' || (ops[1].type === 'register' && ops[1].value === 'NZCV') ||
            (ops[1].type === 'label' && ops[1].value.toUpperCase() === 'NZCV')) {
            return encodeMRS_NZCV(regNum(ops[0].value));
        }
        throw new EncodeError('Only MRS NZCV supported', line);
    }

    // --- NEON encoding methods ---

    encodeNEONArith(mn, ops, line) {
        const rd = vregNum(ops[0].reg);
        const rn = vregNum(ops[1].reg);
        const rm = vregNum(ops[2].reg);
        const arr = ops[0].arrangement;
        const Q = neonQ(arr);
        const size = neonSize(arr);

        let U, opcode;
        switch (mn) {
            case 'ADD': U = 0; opcode = 0b10000; break;
            case 'SUB': U = 1; opcode = 0b10000; break;
            case 'MUL': U = 0; opcode = 0b10011; break;
            default: throw new EncodeError(`Unknown NEON arith: ${mn}`, line);
        }
        return encodeSIMDThreeSame(Q, U, size, rm, opcode, rn, rd);
    }

    encodeNEONLogic(mn, ops, line) {
        const rd = vregNum(ops[0].reg);
        const rn = vregNum(ops[1].reg);
        const rm = vregNum(ops[2].reg);
        const arr = ops[0].arrangement;
        const Q = neonQ(arr);

        // Logical uses size field for opc encoding
        let size, U;
        switch (mn) {
            case 'AND': size = 0b00; U = 0; break;
            case 'ORR': size = 0b01; U = 0; break;
            case 'EOR': size = 0b00; U = 1; break;
            case 'BIC': size = 0b01; U = 1; break;
            default: throw new EncodeError(`Unknown NEON logic: ${mn}`, line);
        }
        return encodeSIMDThreeSame(Q, U, size, rm, 0b00011, rn, rd);
    }

    encodeNEONNot(ops, line) {
        const rd = vregNum(ops[0].reg);
        const rn = vregNum(ops[1].reg);
        const arr = ops[0].arrangement;
        const Q = neonQ(arr);
        // NOT = MVN: 2Q 1 01110 00 10000 00101 10 Rn Rd
        return encodeSIMDTwoRegMisc(Q, 1, 0b00, 0b00101, rn, rd);
    }

    encodeLD1(ops, line) {
        const regList = ops[0];
        const vt = regList.registers[0];
        const rt = vregNum(vt.reg);
        const arr = vt.arrangement;
        const Q = neonQ(arr);
        const size = neonSize(arr);
        const mem = ops[1];
        const rn = regNum(mem.base);
        return encodeSIMDLoadStoreMultiNoOffset(Q, 1, size, rn, rt);
    }

    encodeST1(ops, line) {
        const regList = ops[0];
        const vt = regList.registers[0];
        const rt = vregNum(vt.reg);
        const arr = vt.arrangement;
        const Q = neonQ(arr);
        const size = neonSize(arr);
        const mem = ops[1];
        const rn = regNum(mem.base);
        return encodeSIMDLoadStoreMultiNoOffset(Q, 0, size, rn, rt);
    }

    encodeDUP(ops, line) {
        const rd = vregNum(ops[0].reg);
        const arr = ops[0].arrangement;
        const Q = neonQ(arr);

        if (ops[1].type === 'register') {
            // DUP Vd.T, Xn - from general purpose register
            const rn = regNum(ops[1].value);
            const imm5 = dupFromGPImm5(arr);
            return encodeSIMDCopy(Q, 0, imm5, 0b0001, rn, rd);
        } else if (ops[1].type === 'vector_register' && ops[1].elemIndex !== null) {
            // DUP Vd.T, Vn.T[idx]
            const rn = vregNum(ops[1].reg);
            const size = neonSize(arr);
            const idx = ops[1].elemIndex;
            const imm5 = ((idx << (size + 1)) | (1 << size)) & 0x1F;
            return encodeSIMDCopy(Q, 0, imm5, 0b0000, rn, rd);
        }
        throw new EncodeError('Invalid DUP operands', line);
    }

    encodeINS(ops, line) {
        const rd = vregNum(ops[0].reg);
        const dstIdx = ops[0].elemIndex;
        const arr = ops[0].arrangement || (ops[0].scalar ? ops[0].scalar : null);

        if (ops[1].type === 'register') {
            // INS Vd.T[idx], Xn
            const rn = regNum(ops[1].value);
            const sizeMap = { 'B': 0, 'H': 1, 'S': 2, 'D': 3 };
            const size = arr ? sizeMap[arr[arr.length - 1].toUpperCase()] || 2 : 2;
            const imm5 = ((dstIdx << (size + 1)) | (1 << size)) & 0x1F;
            return encodeSIMDCopy(1, 0, imm5, 0b0011, rn, rd);
        }
        throw new EncodeError('Invalid INS operands', line);
    }

    encodeUMOV(ops, line) {
        const rd = regNum(ops[0].value);
        const rn = vregNum(ops[1].reg);
        const idx = ops[1].elemIndex;
        const arr = ops[1].arrangement;
        const size = neonSize(arr);
        const Q = size === 3 ? 1 : 0; // Q=1 for D
        const imm5 = ((idx << (size + 1)) | (1 << size)) & 0x1F;
        return encodeSIMDCopy(Q, 0, imm5, 0b0111, rn, rd);
    }

    encodeMOVI(ops, line) {
        const rd = vregNum(ops[0].reg);
        const arr = ops[0].arrangement;
        const Q = neonQ(arr);
        const immVal = this.immVal(ops[1]);
        // Simple 8-bit immediate MOVI
        const abc = (immVal >> 5) & 0x7;
        const defgh = immVal & 0x1F;
        const ch = arr[arr.length - 1].toUpperCase();
        let cmode;
        switch (ch) {
            case 'B': cmode = 0b1110; break;       // byte
            case 'H': cmode = 0b1000; break;       // 16-bit, no shift
            case 'S': cmode = 0b0000; break;       // 32-bit, no shift
            case 'D': cmode = 0b1110; break;       // 64-bit
            default: cmode = 0b0000;
        }
        return encodeSIMDModifiedImm(Q, 0, abc, cmode, defgh, rd);
    }

    encodeADDV(ops, line) {
        // ADDV Sd, Vn.T
        const rd = vregNum(ops[0].reg);
        const rn = vregNum(ops[1].reg);
        const arr = ops[1].arrangement;
        const Q = neonQ(arr);
        const size = neonSize(arr);
        return encodeSIMDAcrossLanes(Q, 0, size, 0b11011, rn, rd);
    }

    encodeNEONCmp(mn, ops, line) {
        const rd = vregNum(ops[0].reg);
        const rn = vregNum(ops[1].reg);
        const arr = ops[0].arrangement;
        const Q = neonQ(arr);
        const size = neonSize(arr);

        if (ops[2].type === 'immediate' && ops[2].value === 0) {
            // Compare against zero: two-reg misc
            let U, opcode;
            switch (mn) {
                case 'CMEQ': U = 0; opcode = 0b01001; break;
                case 'CMGT': U = 0; opcode = 0b01000; break;
                case 'CMGE': U = 1; opcode = 0b01000; break;
                default: throw new EncodeError(`Unknown NEON cmp: ${mn}`, line);
            }
            return encodeSIMDTwoRegMisc(Q, U, size, opcode, rn, rd);
        }

        // Three-register compare
        const rm = vregNum(ops[2].reg);
        let U, opcode;
        switch (mn) {
            case 'CMEQ': U = 1; opcode = 0b10001; break;
            case 'CMGT': U = 0; opcode = 0b00110; break;
            case 'CMGE': U = 0; opcode = 0b00111; break;
            default: throw new EncodeError(`Unknown NEON cmp: ${mn}`, line);
        }
        return encodeSIMDThreeSame(Q, U, size, rm, opcode, rn, rd);
    }

    encodeNEONFloat(mn, ops, line) {
        const rd = vregNum(ops[0].reg);
        const rn = vregNum(ops[1].reg);
        const rm = vregNum(ops[2].reg);
        const arr = ops[0].arrangement;
        const Q = neonQ(arr);
        const ch = arr[arr.length - 1].toUpperCase();
        const sz = ch === 'D' ? 1 : 0;

        let U, opcode;
        switch (mn) {
            case 'FADD': U = 0; opcode = 0b11010; break;
            case 'FSUB': U = 0; opcode = 0b11010; break; // with U=1 for FSUB
            case 'FMUL': U = 1; opcode = 0b11011; break;
            case 'FDIV': U = 1; opcode = 0b11111; break;
            default: throw new EncodeError(`Unknown NEON float: ${mn}`, line);
        }
        if (mn === 'FSUB') U = 0; // FSUB uses bit 23 (a) to differentiate
        return encodeSIMDFloatThreeSame(Q, U, sz, rm, opcode, rn, rd);
    }

    // Helpers
    immVal(op) {
        if (op.type === 'immediate') return op.value;
        if (op.type === 'label') {
            if (this.labels && this.labels[op.value] !== undefined) {
                return Number(this.labels[op.value]);
            }
            throw new EncodeError(`Undefined label: ${op.value}`, op.line);
        }
        return op.value || 0;
    }

    resolveBranchTarget(op) {
        if (op.type === 'immediate') return op.value;
        if (op.type === 'label') {
            if (this.labels && this.labels[op.value] !== undefined) {
                return Number(this.labels[op.value]);
            }
            throw new EncodeError(`Undefined label: ${op.value}`, op.line);
        }
        throw new EncodeError(`Cannot resolve branch target: ${JSON.stringify(op)}`, op.line);
    }
}
