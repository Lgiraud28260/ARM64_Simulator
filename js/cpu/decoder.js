// decoder.js - 32-bit binary -> structured instruction
import { extractBits } from '../utils.js';
import { conditionName } from './conditions.js';

export class DecodeError extends Error {
    constructor(message, encoding) {
        super(message);
        this.encoding = encoding;
    }
}

export function decode(instr) {
    instr = instr >>> 0; // ensure unsigned

    // ARM64 top-level dispatch based on bits[28:25]
    const op0 = extractBits(instr, 28, 25);

    // Data Processing - Immediate: 100x
    if ((op0 & 0b1110) === 0b1000) {
        return decodeDataProcImm(instr);
    }

    // Branch, Exception, System: 101x
    if ((op0 & 0b1110) === 0b1010) {
        return decodeBranchExcSys(instr);
    }

    // Loads and Stores: x1x0
    if ((op0 & 0b0101) === 0b0100) {
        return decodeLoadStore(instr);
    }

    // Data Processing - Register: x101
    if ((op0 & 0b0111) === 0b0101) {
        return decodeDataProcReg(instr);
    }

    // SIMD/FP: 0111 (bits[28:25])
    if ((op0 & 0b1111) === 0b0111) {
        return decodeSIMD(instr);
    }

    throw new DecodeError(`Unknown instruction encoding: 0x${(instr >>> 0).toString(16)}`, instr);
}

function decodeDataProcImm(instr) {
    const op0 = extractBits(instr, 25, 23);

    switch (op0) {
        case 0b000: case 0b001: return decodePCRel(instr);
        case 0b010: return decodeAddSubImm(instr);
        case 0b011: return decodeAddSubImm(instr);
        case 0b100: return decodeLogicalImm(instr);
        case 0b101: return decodeMoveWide(instr);
        case 0b110: return decodeBitfield(instr);
        case 0b111: return decodeExtract(instr);
        default: throw new DecodeError(`Unknown DP-Imm op0: ${op0}`, instr);
    }
}

function decodePCRel(instr) {
    const op = extractBits(instr, 31, 31);
    const immlo = extractBits(instr, 30, 29);
    const immhi = extractBits(instr, 23, 5);
    const rd = extractBits(instr, 4, 0);
    let imm = (immhi << 2) | immlo;
    if (imm & (1 << 20)) imm |= ~((1 << 21) - 1);

    return { type: op ? 'ADRP' : 'ADR', rd, imm, sf: 1 };
}

function decodeAddSubImm(instr) {
    const sf = extractBits(instr, 31, 31);
    const op = extractBits(instr, 30, 30);
    const S = extractBits(instr, 29, 29);
    const sh = extractBits(instr, 22, 22);
    const imm12 = extractBits(instr, 21, 10);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    const imm = sh ? (imm12 << 12) : imm12;
    let mnemonic;
    if (op === 0) mnemonic = S ? 'ADDS' : 'ADD';
    else mnemonic = S ? 'SUBS' : 'SUB';

    if (mnemonic === 'SUBS' && rd === 31) mnemonic = 'CMP';
    if (mnemonic === 'ADDS' && rd === 31) mnemonic = 'CMN';

    return { type: mnemonic, sf, rd, rn, imm, S, isImm: true };
}

function decodeLogicalImm(instr) {
    const sf = extractBits(instr, 31, 31);
    const opc = extractBits(instr, 30, 29);
    const N = extractBits(instr, 22, 22);
    const immr = extractBits(instr, 21, 16);
    const imms = extractBits(instr, 15, 10);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    const names = ['AND', 'ORR', 'EOR', 'ANDS'];
    let mnemonic = names[opc];

    if (mnemonic === 'ANDS' && rd === 31) mnemonic = 'TST';
    if (mnemonic === 'ORR' && rn === 31) mnemonic = 'MOV';

    return { type: mnemonic, sf, rd, rn, N, immr, imms, opc, isLogicalImm: true };
}

function decodeMoveWide(instr) {
    const sf = extractBits(instr, 31, 31);
    const opc = extractBits(instr, 30, 29);
    const hw = extractBits(instr, 22, 21);
    const imm16 = extractBits(instr, 20, 5);
    const rd = extractBits(instr, 4, 0);

    const names = { 0: 'MOVN', 2: 'MOVZ', 3: 'MOVK' };
    const mnemonic = names[opc];
    if (!mnemonic) throw new DecodeError(`Invalid move-wide opc: ${opc}`, instr);

    return { type: mnemonic, sf, rd, imm16, hw };
}

function decodeBitfield(instr) {
    const sf = extractBits(instr, 31, 31);
    const opc = extractBits(instr, 30, 29);
    const N = extractBits(instr, 22, 22);
    const immr = extractBits(instr, 21, 16);
    const imms = extractBits(instr, 15, 10);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    const regSize = sf ? 64 : 32;

    if (opc === 0b10) {
        // UBFM
        if (imms === regSize - 1) {
            return { type: 'LSR', sf, rd, rn, imm: immr, isBitfield: true };
        }
        const shiftAmt = (-immr) & (regSize - 1);
        if (imms === regSize - 1 - shiftAmt && immr !== 0) {
            return { type: 'LSL', sf, rd, rn, imm: shiftAmt, isBitfield: true };
        }
        return { type: 'UBFM', sf, rd, rn, immr, imms, isBitfield: true };
    }

    if (opc === 0b00) {
        // SBFM
        if (imms === regSize - 1) {
            return { type: 'ASR', sf, rd, rn, imm: immr, isBitfield: true };
        }
        return { type: 'SBFM', sf, rd, rn, immr, imms, isBitfield: true };
    }

    return { type: 'BFM', sf, rd, rn, immr, imms, opc, isBitfield: true };
}

function decodeExtract(instr) {
    const sf = extractBits(instr, 31, 31);
    const rm = extractBits(instr, 20, 16);
    const imms = extractBits(instr, 15, 10);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    if (rn === rm) {
        return { type: 'ROR', sf, rd, rn, imm: imms, isBitfield: true };
    }
    return { type: 'EXTR', sf, rd, rn, rm, imms };
}

function decodeBranchExcSys(instr) {
    // Unconditional branch immediate: x00101 imm26
    if ((instr & 0x7C000000) === 0x14000000) {
        const op = extractBits(instr, 31, 31);
        let imm26 = extractBits(instr, 25, 0);
        if (imm26 & (1 << 25)) imm26 |= ~((1 << 26) - 1);
        return { type: op ? 'BL' : 'B', imm: imm26 << 2, isBranch: true };
    }

    // Conditional branch: 01010100 imm19 0 cond
    if (((instr & 0xFF000010) >>> 0) === 0x54000000) {
        let imm19 = extractBits(instr, 23, 5);
        if (imm19 & (1 << 18)) imm19 |= ~((1 << 19) - 1);
        const cond = extractBits(instr, 3, 0);
        return { type: 'B.cond', cond, condName: conditionName(cond), imm: imm19 << 2, isBranch: true };
    }

    // CBZ/CBNZ: sf 011010 op imm19 Rt
    if ((instr & 0x7E000000) === 0x34000000) {
        const sf = extractBits(instr, 31, 31);
        const op = extractBits(instr, 24, 24);
        let imm19 = extractBits(instr, 23, 5);
        if (imm19 & (1 << 18)) imm19 |= ~((1 << 19) - 1);
        const rt = extractBits(instr, 4, 0);
        return { type: op ? 'CBNZ' : 'CBZ', sf, rt, imm: imm19 << 2, isBranch: true };
    }

    // TBZ/TBNZ: b5 011011 op b40 imm14 Rt
    if ((instr & 0x7E000000) === 0x36000000) {
        const b5 = extractBits(instr, 31, 31);
        const op = extractBits(instr, 24, 24);
        const b40 = extractBits(instr, 23, 19);
        let imm14 = extractBits(instr, 18, 5);
        if (imm14 & (1 << 13)) imm14 |= ~((1 << 14) - 1);
        const rt = extractBits(instr, 4, 0);
        const bit = (b5 << 5) | b40;
        return { type: op ? 'TBNZ' : 'TBZ', rt, bit, imm: imm14 << 2, isBranch: true };
    }

    // NOP: D503201F (check before branch reg to avoid collision)
    if ((instr >>> 0) === 0xD503201F) {
        return { type: 'NOP' };
    }

    // SVC: 11010100 000 imm16 00001
    if (((instr & 0xFFE0001F) >>> 0) === (0xD4000001 >>> 0)) {
        const imm16 = extractBits(instr, 20, 5);
        return { type: 'SVC', imm16 };
    }

    // BRK: 11010100 001 imm16 00000
    if (((instr & 0xFFE0001F) >>> 0) === (0xD4200000 >>> 0)) {
        const imm16 = extractBits(instr, 20, 5);
        return { type: 'BRK', imm16 };
    }

    // Unconditional branch register: 1101011 opc 11111 000000 Rn 00000
    if (((instr & 0xFE000000) >>> 0) === (0xD6000000 >>> 0)) {
        const opc = extractBits(instr, 24, 21);
        const rn = extractBits(instr, 9, 5);
        const names = { 0: 'BR', 1: 'BLR', 2: 'RET' };
        return { type: names[opc] || 'BR', rn, isBranch: true };
    }

    // MSR NZCV, Xt
    if (((instr & 0xFFF0F000) >>> 0) === (0xD51B4000 >>> 0)) {
        const rt = extractBits(instr, 4, 0);
        return { type: 'MSR', sysreg: 'NZCV', rt };
    }

    // MRS Xt, NZCV
    if (((instr & 0xFFF0F000) >>> 0) === (0xD53B4000 >>> 0)) {
        const rt = extractBits(instr, 4, 0);
        return { type: 'MRS', sysreg: 'NZCV', rt };
    }

    throw new DecodeError(`Unknown branch/system instruction: 0x${(instr >>> 0).toString(16)}`, instr);
}

function decodeLoadStore(instr) {
    // Load/Store pair: xx101 (bits[28:27]=01, bit[25]=0)
    if ((instr & 0x3A000000) === 0x28000000) {
        return decodeLoadStorePair(instr);
    }

    // Load register (literal): xx011 V 00
    if ((instr & 0x3B000000) === 0x18000000) {
        return decodeLdrLiteral(instr);
    }

    // Load/Store register (unsigned offset, pre/post, register offset)
    const size = extractBits(instr, 31, 30);
    const V = extractBits(instr, 26, 26);
    const opc = extractBits(instr, 23, 22);
    const rn = extractBits(instr, 9, 5);
    const rt = extractBits(instr, 4, 0);

    if (V === 1) {
        return decodeSIMDLoadStore(instr);
    }

    // Determine instruction name
    let mnemonic;
    if (opc === 0b00) {
        mnemonic = ['STRB', 'STRH', 'STR', 'STR'][size];
    } else if (opc === 0b01) {
        mnemonic = ['LDRB', 'LDRH', 'LDR', 'LDR'][size];
    } else if (opc === 0b10) {
        mnemonic = ['LDRSB', 'LDRSH', 'LDRSW', 'LDR'][size];
    } else {
        mnemonic = ['LDRSB', 'LDRSH', 'LDR', 'LDR'][size];
    }

    // sf: 1 for 64-bit target, 0 for 32-bit
    let sf;
    if (size === 3) sf = 1;
    else if (size === 2 && opc === 0b01) sf = 0; // LDR W
    else if (size === 2 && opc === 0b00) sf = 0; // STR W
    else if (size === 2 && opc === 0b10) sf = 1; // LDRSW -> 64-bit
    else if (opc === 0b10) sf = 1; // LDRSB/LDRSH to 64-bit
    else if (opc === 0b11) sf = 0; // LDRSB/LDRSH to 32-bit
    else sf = 0;

    const bit24 = extractBits(instr, 24, 24);
    const bit21 = extractBits(instr, 21, 21);

    if (bit24 === 1 && extractBits(instr, 27, 24) === 0b1001) {
        // Unsigned offset: size 111 V 01 opc imm12 Rn Rt
        const imm12 = extractBits(instr, 21, 10);
        const scale = size;
        const offset = imm12 << scale;
        return { type: mnemonic, sf, rt, rn, offset, size, opc, addrMode: 'offset', isLoadStore: true };
    }

    if (extractBits(instr, 27, 24) === 0b1000) {
        const bit21 = extractBits(instr, 21, 21);

        if (bit21 === 1) {
            // Register offset: size 111 V 00 opc 1 Rm option S 10 Rn Rt
            const rm = extractBits(instr, 20, 16);
            const option = extractBits(instr, 15, 13);
            const S = extractBits(instr, 12, 12);
            return { type: mnemonic, sf, rt, rn, rm, option, S, size, opc, addrMode: 'register', isLoadStore: true };
        }

        // Pre/post index or unscaled
        const imm9 = extractBits(instr, 20, 12);
        const signedImm9 = imm9 & 0x100 ? imm9 - 0x200 : imm9;
        const type = extractBits(instr, 11, 10);

        if (type === 0b01) {
            return { type: mnemonic, sf, rt, rn, offset: signedImm9, size, opc, addrMode: 'postIndex', isLoadStore: true };
        }
        if (type === 0b11) {
            return { type: mnemonic, sf, rt, rn, offset: signedImm9, size, opc, addrMode: 'preIndex', isLoadStore: true };
        }
        if (type === 0b00) {
            // LDUR/STUR (unscaled)
            return { type: mnemonic, sf, rt, rn, offset: signedImm9, size, opc, addrMode: 'offset', isLoadStore: true };
        }
    }

    throw new DecodeError(`Unknown load/store encoding: 0x${(instr >>> 0).toString(16)}`, instr);
}

function decodeLoadStorePair(instr) {
    const opc = extractBits(instr, 31, 30);
    const type = extractBits(instr, 24, 23);
    const L = extractBits(instr, 22, 22);
    let imm7 = extractBits(instr, 21, 15);
    if (imm7 & 0x40) imm7 = imm7 - 0x80; // sign extend

    const rt2 = extractBits(instr, 14, 10);
    const rn = extractBits(instr, 9, 5);
    const rt = extractBits(instr, 4, 0);

    const sf = (opc === 0b10) ? 1 : 0;
    const scale = sf ? 3 : 2;
    const offset = imm7 << scale;

    let addrMode;
    switch (type) {
        case 0b01: addrMode = 'postIndex'; break;
        case 0b10: addrMode = 'offset'; break;
        case 0b11: addrMode = 'preIndex'; break;
        default: addrMode = 'offset';
    }

    return {
        type: L ? 'LDP' : 'STP',
        sf, rt, rt2, rn, offset, addrMode,
        isLoadStore: true, isPair: true
    };
}

function decodeLdrLiteral(instr) {
    const opc = extractBits(instr, 31, 30);
    let imm19 = extractBits(instr, 23, 5);
    if (imm19 & (1 << 18)) imm19 |= ~((1 << 19) - 1);
    const rt = extractBits(instr, 4, 0);
    const sf = opc & 1;

    return {
        type: 'LDR',
        sf, rt, imm: imm19 << 2,
        isLoadStore: true, isLiteral: true
    };
}

function decodeDataProcReg(instr) {
    // Identify sub-groups by bit patterns

    // Data processing (3 source): sf 00 11011 op31 Rm o0 Ra Rn Rd
    if ((instr & 0x1F000000) === 0x1B000000) {
        return decodeDataProc3(instr);
    }

    // Data processing (2 source): sf 0 S 11010110 Rm opcode Rn Rd
    if ((instr & 0x5FE00000) === 0x1AC00000) {
        return decodeDataProc2(instr);
    }

    // Add/sub with carry: sf op S 11010000 Rm 000000 Rn Rd
    if ((instr & 0x1FE00000) === 0x1A000000 && extractBits(instr, 15, 10) === 0) {
        return decodeAddSubCarry(instr);
    }

    // Conditional select: sf op S 11010100 Rm cond op2 Rn Rd
    if ((instr & 0x1FE00000) === 0x1A800000) {
        return decodeCondSelect(instr);
    }

    // Add/sub shifted register: sf op S 01011 shift 0 Rm imm6 Rn Rd
    if ((instr & 0x1F200000) === 0x0B000000) {
        return decodeAddSubShiftedReg(instr);
    }

    // Logical shifted register: sf opc 01010 shift N Rm imm6 Rn Rd
    if ((instr & 0x1F000000) === 0x0A000000) {
        return decodeLogicalShiftedReg(instr);
    }

    throw new DecodeError(`Unknown DP-Reg instruction: 0x${(instr >>> 0).toString(16)}`, instr);
}

function decodeAddSubShiftedReg(instr) {
    const sf = extractBits(instr, 31, 31);
    const op = extractBits(instr, 30, 30);
    const S = extractBits(instr, 29, 29);
    const shift = extractBits(instr, 23, 22);
    const rm = extractBits(instr, 20, 16);
    const imm6 = extractBits(instr, 15, 10);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    let mnemonic;
    if (op === 0) mnemonic = S ? 'ADDS' : 'ADD';
    else mnemonic = S ? 'SUBS' : 'SUB';

    if (mnemonic === 'SUBS' && rd === 31) mnemonic = 'CMP';
    if (mnemonic === 'ADDS' && rd === 31) mnemonic = 'CMN';
    if (mnemonic === 'SUB' && rn === 31) mnemonic = 'NEG';
    if (mnemonic === 'SUBS' && rn === 31 && rd !== 31) mnemonic = 'NEGS';

    return { type: mnemonic, sf, rd, rn, rm, shift, imm6, S, isShiftedReg: true };
}

function decodeLogicalShiftedReg(instr) {
    const sf = extractBits(instr, 31, 31);
    const opc = extractBits(instr, 30, 29);
    const shift = extractBits(instr, 23, 22);
    const N = extractBits(instr, 21, 21);
    const rm = extractBits(instr, 20, 16);
    const imm6 = extractBits(instr, 15, 10);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    let mnemonic;
    if (N === 0) {
        mnemonic = ['AND', 'ORR', 'EOR', 'ANDS'][opc];
    } else {
        mnemonic = ['BIC', 'ORN', 'EON', 'BICS'][opc];
    }

    if (mnemonic === 'ANDS' && rd === 31) mnemonic = 'TST';
    if (mnemonic === 'ORR' && rn === 31 && shift === 0 && imm6 === 0) mnemonic = 'MOV';
    if (mnemonic === 'ORN' && rn === 31) mnemonic = 'MVN';

    return { type: mnemonic, sf, rd, rn, rm, shift, imm6, N, opc, isShiftedReg: true };
}

function decodeAddSubCarry(instr) {
    const sf = extractBits(instr, 31, 31);
    const op = extractBits(instr, 30, 30);
    const S = extractBits(instr, 29, 29);
    const rm = extractBits(instr, 20, 16);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    let mnemonic;
    if (op === 0) mnemonic = S ? 'ADCS' : 'ADC';
    else mnemonic = S ? 'SBCS' : 'SBC';

    return { type: mnemonic, sf, rd, rn, rm, S };
}

function decodeCondSelect(instr) {
    const sf = extractBits(instr, 31, 31);
    const op = extractBits(instr, 30, 30);
    const S = extractBits(instr, 29, 29);
    const rm = extractBits(instr, 20, 16);
    const cond = extractBits(instr, 15, 12);
    const op2 = extractBits(instr, 11, 10);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    let mnemonic;
    if (op === 0 && op2 === 0b00) mnemonic = 'CSEL';
    else if (op === 0 && op2 === 0b01) mnemonic = 'CSINC';
    else if (op === 1 && op2 === 0b00) mnemonic = 'CSINV';
    else if (op === 1 && op2 === 0b01) mnemonic = 'CSNEG';
    else mnemonic = 'CSEL';

    if (mnemonic === 'CSINC' && rn === 31 && rm === 31) mnemonic = 'CSET';
    if (mnemonic === 'CSINV' && rn === 31 && rm === 31) mnemonic = 'CSETM';
    if (mnemonic === 'CSINC' && rn === rm && rn !== 31) mnemonic = 'CINC';
    if (mnemonic === 'CSINV' && rn === rm && rn !== 31) mnemonic = 'CINV';
    if (mnemonic === 'CSNEG' && rn === rm) mnemonic = 'CNEG';

    return { type: mnemonic, sf, rd, rn, rm, cond, condName: conditionName(cond), op, op2 };
}

function decodeDataProc2(instr) {
    const sf = extractBits(instr, 31, 31);
    const S = extractBits(instr, 29, 29);
    const rm = extractBits(instr, 20, 16);
    const opcode = extractBits(instr, 15, 10);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    let mnemonic;
    switch (opcode) {
        case 0b000010: mnemonic = 'UDIV'; break;
        case 0b000011: mnemonic = 'SDIV'; break;
        case 0b001000: mnemonic = 'LSL'; break;
        case 0b001001: mnemonic = 'LSR'; break;
        case 0b001010: mnemonic = 'ASR'; break;
        case 0b001011: mnemonic = 'ROR'; break;
        default: throw new DecodeError(`Unknown DP-2 opcode: ${opcode}`, instr);
    }

    return { type: mnemonic, sf, rd, rn, rm, isDP2: true };
}

function decodeDataProc3(instr) {
    const sf = extractBits(instr, 31, 31);
    const op31 = extractBits(instr, 23, 21);
    const rm = extractBits(instr, 20, 16);
    const o0 = extractBits(instr, 15, 15);
    const ra = extractBits(instr, 14, 10);
    const rn = extractBits(instr, 9, 5);
    const rd = extractBits(instr, 4, 0);

    let mnemonic;
    if (op31 === 0b000 && o0 === 0) {
        mnemonic = ra === 31 ? 'MUL' : 'MADD';
    } else if (op31 === 0b000 && o0 === 1) {
        mnemonic = ra === 31 ? 'MNEG' : 'MSUB';
    } else {
        mnemonic = 'MADD';
    }

    return { type: mnemonic, sf, rd, rn, rm, ra };
}

// Arrangement string from Q and size
function neonArrangement(Q, size) {
    const arr = [
        ['8B', '4H', '2S', '1D'],  // Q=0
        ['16B', '8H', '4S', '2D']  // Q=1
    ];
    return arr[Q][size];
}

function decodeSIMD(instr) {
    const Q = extractBits(instr, 30, 30);
    const U = extractBits(instr, 29, 29);
    const bit24 = extractBits(instr, 24, 24);
    const size = extractBits(instr, 23, 22);
    const rd = extractBits(instr, 4, 0);
    const rn = extractBits(instr, 9, 5);

    // Check for SIMD across lanes: 0|Q|U|01110|size|11000|opcode|10|Rn|Rd
    const bits21_17 = extractBits(instr, 21, 17);
    const bit10 = extractBits(instr, 10, 10);

    // Two-register misc: bits[21:17] = 10000, bit[10] = 0 => bits[11:10] = 10
    if (bits21_17 === 0b10000 && extractBits(instr, 11, 10) === 0b10) {
        const opcode = extractBits(instr, 16, 12);
        const arrangement = neonArrangement(Q, size);

        // NOT/MVN: U=1, size=00, opcode=00101
        if (U === 1 && opcode === 0b00101) {
            return { type: 'NOT', isNEON: true, Q, size, rd, rn, arrangement };
        }

        // CMEQ #0: U=0, opcode=01001
        if (U === 0 && opcode === 0b01001) {
            return { type: 'CMEQ', isNEON: true, Q, size, rd, rn, rm: -1, arrangement, vsZero: true };
        }
        // CMGT #0: U=0, opcode=01000
        if (U === 0 && opcode === 0b01000) {
            return { type: 'CMGT', isNEON: true, Q, size, rd, rn, rm: -1, arrangement, vsZero: true };
        }
        // CMGE #0: U=1, opcode=01000
        if (U === 1 && opcode === 0b01000) {
            return { type: 'CMGE', isNEON: true, Q, size, rd, rn, rm: -1, arrangement, vsZero: true };
        }

        throw new DecodeError(`Unknown SIMD two-reg misc: opcode=${opcode}, U=${U}`, instr);
    }

    // Across lanes: bits[21:17] = 11000, bits[11:10] = 10
    if (bits21_17 === 0b11000 && extractBits(instr, 11, 10) === 0b10) {
        const opcode = extractBits(instr, 16, 12);
        const arrangement = neonArrangement(Q, size);
        // ADDV: U=0, opcode=11011
        if (opcode === 0b11011 && U === 0) {
            return { type: 'ADDV', isNEON: true, Q, size, rd, rn, arrangement };
        }
        throw new DecodeError(`Unknown SIMD across-lanes: opcode=${opcode}`, instr);
    }

    // Three-same: bit[21] = 1, bit[10] = 1
    if (extractBits(instr, 21, 21) === 1 && bit10 === 1) {
        const rm = extractBits(instr, 20, 16);
        const opcode = extractBits(instr, 15, 11);
        const arrangement = neonArrangement(Q, size);

        // Integer arithmetic
        if (opcode === 0b10000) {
            if (U === 0) return { type: 'ADD', isNEON: true, Q, size, rd, rn, rm, arrangement };
            if (U === 1) return { type: 'SUB', isNEON: true, Q, size, rd, rn, rm, arrangement };
        }
        if (opcode === 0b10011 && U === 0) {
            return { type: 'MUL', isNEON: true, Q, size, rd, rn, rm, arrangement };
        }

        // Logical
        if (opcode === 0b00011) {
            if (U === 0 && size === 0b00) return { type: 'AND', isNEON: true, Q, size: 0, rd, rn, rm, arrangement };
            if (U === 0 && size === 0b01) return { type: 'ORR', isNEON: true, Q, size: 0, rd, rn, rm, arrangement };
            if (U === 1 && size === 0b00) return { type: 'EOR', isNEON: true, Q, size: 0, rd, rn, rm, arrangement };
            if (U === 1 && size === 0b01) return { type: 'BIC', isNEON: true, Q, size: 0, rd, rn, rm, arrangement };
        }

        // Compare
        if (opcode === 0b10001 && U === 1) return { type: 'CMEQ', isNEON: true, Q, size, rd, rn, rm, arrangement };
        if (opcode === 0b00110 && U === 0) return { type: 'CMGT', isNEON: true, Q, size, rd, rn, rm, arrangement };
        if (opcode === 0b00111 && U === 0) return { type: 'CMGE', isNEON: true, Q, size, rd, rn, rm, arrangement };

        // Float operations (bit24 check - these use different encoding)
        if (opcode === 0b11010) {
            // FADD: U=0, FSUB depends on additional bits
            const fArrangement = Q ? (size & 1 ? '2D' : '4S') : (size & 1 ? '1D' : '2S');
            if (U === 0) return { type: 'FADD', isNEON: true, Q, sz: size & 1, rd, rn, rm, arrangement: fArrangement };
        }
        if (opcode === 0b11011 && U === 1) {
            const fArrangement = Q ? (size & 1 ? '2D' : '4S') : (size & 1 ? '1D' : '2S');
            return { type: 'FMUL', isNEON: true, Q, sz: size & 1, rd, rn, rm, arrangement: fArrangement };
        }
        if (opcode === 0b11111 && U === 1) {
            const fArrangement = Q ? (size & 1 ? '2D' : '4S') : (size & 1 ? '1D' : '2S');
            return { type: 'FDIV', isNEON: true, Q, sz: size & 1, rd, rn, rm, arrangement: fArrangement };
        }

        throw new DecodeError(`Unknown SIMD three-same: opcode=${opcode}, U=${U}, size=${size}`, instr);
    }

    // SIMD Copy: 0|Q|op|01110000|imm5|0|imm4|1|Rn|Rd
    if (extractBits(instr, 28, 21) === 0b01110000 && extractBits(instr, 15, 15) === 0 && bit10 === 1) {
        const op = U;
        const imm5 = extractBits(instr, 20, 16);
        const imm4 = extractBits(instr, 14, 11);

        // Determine element size from imm5
        let elemSize;
        if (imm5 & 0b00001) elemSize = 0; // B
        else if (imm5 & 0b00010) elemSize = 1; // H
        else if (imm5 & 0b00100) elemSize = 2; // S
        else if (imm5 & 0b01000) elemSize = 3; // D
        else elemSize = 0;

        if (imm4 === 0b0001 && op === 0) {
            // DUP from GP register
            const arrangement = neonArrangement(Q, elemSize);
            return { type: 'DUP', isNEON: true, Q, rd, rn, imm5, imm4, arrangement, fromGP: true };
        }
        if (imm4 === 0b0000 && op === 0) {
            // DUP from element
            const idx = imm5 >> (elemSize + 1);
            const arrangement = neonArrangement(Q, elemSize);
            return { type: 'DUP', isNEON: true, Q, rd, rn, elemSize, elemIndex: idx, arrangement, fromGP: false };
        }
        if (imm4 === 0b0011 && op === 0) {
            // INS from GP register
            const idx = imm5 >> (elemSize + 1);
            return { type: 'INS', isNEON: true, Q: 1, rd, rn, elemSize, elemIndex: idx, fromGP: true };
        }
        if (imm4 === 0b0111 && op === 0) {
            // UMOV
            const idx = imm5 >> (elemSize + 1);
            return { type: 'UMOV', isNEON: true, Q, rd, rn, elemSize, elemIndex: idx };
        }

        throw new DecodeError(`Unknown SIMD copy: imm4=${imm4}, op=${op}`, instr);
    }

    // Modified immediate: 0|Q|op|0111100000|abc|cmode|01|defgh|Rd
    if (extractBits(instr, 28, 19) === 0b0111100000 && extractBits(instr, 11, 10) === 0b01) {
        const op = U;
        const abc = extractBits(instr, 18, 16);
        const cmode = extractBits(instr, 15, 12);
        const defgh = extractBits(instr, 9, 5);
        const imm8 = (abc << 5) | defgh;

        let arrangement;
        if (cmode === 0b1110) arrangement = Q ? '16B' : '8B';
        else if ((cmode & 0b1110) === 0b1000) arrangement = Q ? '8H' : '4H';
        else arrangement = Q ? '4S' : '2S';

        return { type: 'MOVI', isNEON: true, Q, rd, imm8, cmode, arrangement };
    }

    throw new DecodeError(`Unknown SIMD instruction: 0x${(instr >>> 0).toString(16)}`, instr);
}

function decodeSIMDLoadStore(instr) {
    // LD1/ST1 multiple structures, no post-index
    // 0|Q|001100|0|L|0|Rm|opcode|size|Rn|Rt
    const Q = extractBits(instr, 30, 30);
    const L = extractBits(instr, 22, 22);
    const opcode = extractBits(instr, 15, 12);
    const size = extractBits(instr, 11, 10);
    const rn = extractBits(instr, 9, 5);
    const rt = extractBits(instr, 4, 0);

    // For LD1/ST1 with one register, opcode = 0111
    const arrangement = neonArrangement(Q, size);
    return {
        type: L ? 'LD1' : 'ST1',
        isNEON: true,
        Q, rt, rn, arrangement,
        isLoadStore: true
    };
}
