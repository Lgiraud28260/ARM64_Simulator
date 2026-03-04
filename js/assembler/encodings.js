// encodings.js - Bit-field templates for ARM64 instruction classes

// Condition code encoding
export const COND_CODES = {
    'EQ': 0b0000, 'NE': 0b0001,
    'CS': 0b0010, 'HS': 0b0010,
    'CC': 0b0011, 'LO': 0b0011,
    'MI': 0b0100, 'PL': 0b0101,
    'VS': 0b0110, 'VC': 0b0111,
    'HI': 0b1000, 'LS': 0b1001,
    'GE': 0b1010, 'LT': 0b1011,
    'GT': 0b1100, 'LE': 0b1101,
    'AL': 0b1110, 'NV': 0b1111,
};

// Invert a condition
export function invertCondition(cond) {
    const c = COND_CODES[cond];
    return c ^ 1;
}

// Shift type encoding
export const SHIFT_TYPES = {
    'LSL': 0b00,
    'LSR': 0b01,
    'ASR': 0b10,
    'ROR': 0b11,
};

// Register number parser
export function regNum(name) {
    if (!name) return 31;
    name = name.toUpperCase();
    if (name === 'SP' || name === 'WSP') return 31;
    if (name === 'XZR' || name === 'WZR') return 31;
    if (name === 'LR') return 30;
    if (name === 'FP') return 29;
    const m = name.match(/^[XW](\d+)$/);
    if (m) return parseInt(m[1]);
    throw new Error(`Invalid register: ${name}`);
}

// Check if register is 32-bit (W)
export function isW(name) {
    if (!name) return false;
    name = name.toUpperCase();
    return name.startsWith('W') || name === 'WSP';
}

// Check if register is SP (not XZR)
export function isSP(name) {
    if (!name) return false;
    name = name.toUpperCase();
    return name === 'SP' || name === 'WSP';
}

// Encoding helpers
export function encodeDataProcImm(sf, op, S, rd, rn, imm12, shift) {
    // ADD/SUB immediate: sf|op|S|100010|sh|imm12|Rn|Rd
    return ((sf & 1) << 31) |
           ((op & 1) << 30) |
           ((S & 1) << 29) |
           (0b100010 << 23) |
           ((shift & 1) << 22) |
           ((imm12 & 0xFFF) << 10) |
           ((rn & 0x1F) << 5) |
           (rd & 0x1F);
}

export function encodeDataProcShiftedReg(sf, op, S, shift, rm, imm6, rn, rd) {
    // sf|op|S|01011|shift|0|Rm|imm6|Rn|Rd
    return ((sf & 1) << 31) |
           ((op & 1) << 30) |
           ((S & 1) << 29) |
           (0b01011 << 24) |
           ((shift & 0x3) << 22) |
           (0 << 21) |
           ((rm & 0x1F) << 16) |
           ((imm6 & 0x3F) << 10) |
           ((rn & 0x1F) << 5) |
           (rd & 0x1F);
}

export function encodeLogicalShiftedReg(sf, opc, N, shift, rm, imm6, rn, rd) {
    // sf|opc|01010|shift|N|Rm|imm6|Rn|Rd
    return ((sf & 1) << 31) |
           ((opc & 0x3) << 29) |
           (0b01010 << 24) |
           ((shift & 0x3) << 22) |
           ((N & 1) << 21) |
           ((rm & 0x1F) << 16) |
           ((imm6 & 0x3F) << 10) |
           ((rn & 0x1F) << 5) |
           (rd & 0x1F);
}

export function encodeLogicalImm(sf, opc, N, immr, imms, rn, rd) {
    // sf|opc|100100|N|immr|imms|Rn|Rd
    return ((sf & 1) << 31) |
           ((opc & 0x3) << 29) |
           (0b100100 << 23) |
           ((N & 1) << 22) |
           ((immr & 0x3F) << 16) |
           ((imms & 0x3F) << 10) |
           ((rn & 0x1F) << 5) |
           (rd & 0x1F);
}

export function encodeMoveWide(sf, opc, hw, imm16, rd) {
    // sf|opc|100101|hw|imm16|Rd
    return ((sf & 1) << 31) |
           ((opc & 0x3) << 29) |
           (0b100101 << 23) |
           ((hw & 0x3) << 21) |
           ((imm16 & 0xFFFF) << 5) |
           (rd & 0x1F);
}

export function encodeBranch(op, imm26) {
    // op|00101|imm26
    return ((op & 1) << 31) |
           (0b00101 << 26) |
           (imm26 & 0x3FFFFFF);
}

export function encodeBranchCond(imm19, cond) {
    // 01010100|imm19|0|cond
    return (0b01010100 << 24) |
           ((imm19 & 0x7FFFF) << 5) |
           (0 << 4) |
           (cond & 0xF);
}

export function encodeCBZ(sf, op, imm19, rt) {
    // sf|011010|op|imm19|Rt
    return ((sf & 1) << 31) |
           (0b011010 << 25) |
           ((op & 1) << 24) |
           ((imm19 & 0x7FFFF) << 5) |
           (rt & 0x1F);
}

export function encodeTBZ(b5, op, b40, imm14, rt) {
    // b5|011011|op|b40|imm14|Rt
    return ((b5 & 1) << 31) |
           (0b011011 << 25) |
           ((op & 1) << 24) |
           ((b40 & 0x1F) << 19) |
           ((imm14 & 0x3FFF) << 5) |
           (rt & 0x1F);
}

export function encodeBranchReg(opc, rn) {
    // 1101011|opc|11111|000000|Rn|00000
    return (0b1101011 << 25) |
           ((opc & 0xF) << 21) |
           (0b11111 << 16) |
           (0b000000 << 10) |
           ((rn & 0x1F) << 5) |
           0b00000;
}

export function encodeLoadStoreImm(size, V, opc, imm12, rn, rt) {
    // size|111|V|01|opc|imm12|Rn|Rt
    return ((size & 0x3) << 30) |
           (0b111 << 27) |
           ((V & 1) << 26) |
           (0b01 << 24) |
           ((opc & 0x3) << 22) |
           ((imm12 & 0xFFF) << 10) |
           ((rn & 0x1F) << 5) |
           (rt & 0x1F);
}

export function encodeLoadStorePrePost(size, V, opc, imm9, prePost, rn, rt) {
    // size|111|V|00|opc|imm9|prePost|Rn|Rt
    // prePost: 01=post, 11=pre
    return ((size & 0x3) << 30) |
           (0b111 << 27) |
           ((V & 1) << 26) |
           (0b00 << 24) |
           ((opc & 0x3) << 22) |
           (0 << 21) |
           ((imm9 & 0x1FF) << 12) |
           ((prePost & 0x3) << 10) |
           ((rn & 0x1F) << 5) |
           (rt & 0x1F);
}

export function encodeLoadStoreReg(size, V, opc, rm, option, S, rn, rt) {
    // size|111|V|00|opc|1|Rm|option|S|10|Rn|Rt
    return ((size & 0x3) << 30) |
           (0b111 << 27) |
           ((V & 1) << 26) |
           (0b00 << 24) |
           ((opc & 0x3) << 22) |
           (1 << 21) |
           ((rm & 0x1F) << 16) |
           ((option & 0x7) << 13) |
           ((S & 1) << 12) |
           (0b10 << 10) |
           ((rn & 0x1F) << 5) |
           (rt & 0x1F);
}

export function encodeLoadStorePair(opc, V, type, L, imm7, rt2, rn, rt) {
    // opc|V|101|type|L|imm7|Rt2|Rn|Rt
    return ((opc & 0x3) << 30) |
           ((V & 1) << 26) |
           (0b101 << 27) |
           ((type & 0x3) << 23) |
           ((L & 1) << 22) |
           ((imm7 & 0x7F) << 15) |
           ((rt2 & 0x1F) << 10) |
           ((rn & 0x1F) << 5) |
           (rt & 0x1F);
}

export function encodeCondSelect(sf, op, S, rm, cond, op2, rn, rd) {
    // sf|op|S|11010100|Rm|cond|op2|Rn|Rd
    return ((sf & 1) << 31) |
           ((op & 1) << 30) |
           ((S & 1) << 29) |
           (0b11010100 << 21) |
           ((rm & 0x1F) << 16) |
           ((cond & 0xF) << 12) |
           ((op2 & 0x3) << 10) |
           ((rn & 0x1F) << 5) |
           (rd & 0x1F);
}

export function encodeDataProc3(sf, op54, op31, rm, o0, ra, rn, rd) {
    // sf|op54|11011|op31|Rm|o0|Ra|Rn|Rd
    return ((sf & 1) << 31) |
           ((op54 & 0x3) << 29) |
           (0b11011 << 24) |
           ((op31 & 0x7) << 21) |
           ((rm & 0x1F) << 16) |
           ((o0 & 1) << 15) |
           ((ra & 0x1F) << 10) |
           ((rn & 0x1F) << 5) |
           (rd & 0x1F);
}

export function encodeDataProc2(sf, S, rm, opcode, rn, rd) {
    // sf|0|S|11010110|Rm|opcode|Rn|Rd
    return ((sf & 1) << 31) |
           (0 << 30) |
           ((S & 1) << 29) |
           (0b11010110 << 21) |
           ((rm & 0x1F) << 16) |
           ((opcode & 0x3F) << 10) |
           ((rn & 0x1F) << 5) |
           (rd & 0x1F);
}

export function encodeADR(op, immlo, immhi, rd) {
    // op|immlo|10000|immhi|Rd
    return ((op & 1) << 31) |
           ((immlo & 0x3) << 29) |
           (0b10000 << 24) |
           ((immhi & 0x7FFFF) << 5) |
           (rd & 0x1F);
}

export function encodeSystem(imm16) {
    // SVC: 11010100|000|imm16|000|01
    return (0b11010100 << 24) |
           (0b000 << 21) |
           ((imm16 & 0xFFFF) << 5) |
           (0b00001);
}

export function encodeBRK(imm16) {
    // BRK: 11010100|001|imm16|000|00
    return (0b11010100 << 24) |
           (0b001 << 21) |
           ((imm16 & 0xFFFF) << 5) |
           (0b00000);
}

export function encodeNOP() {
    return 0xD503201F;
}

export function encodeMSR_NZCV(rt) {
    // MSR NZCV, Xt: 1101010100|0|1|1|011|0100|0010|000|Rt
    return (0b1101010100 << 22) |
           (0b0 << 21) |
           (0b1 << 20) |
           (0b1 << 19) |
           (0b011 << 16) |
           (0b0100 << 12) |
           (0b0010 << 8) |
           (0b000 << 5) |
           (rt & 0x1F);
}

export function encodeMRS_NZCV(rt) {
    // MRS Xt, NZCV: 1101010100|1|1|1|011|0100|0010|000|Rt
    return (0b1101010100 << 22) |
           (0b1 << 21) |
           (0b1 << 20) |
           (0b1 << 19) |
           (0b011 << 16) |
           (0b0100 << 12) |
           (0b0010 << 8) |
           (0b000 << 5) |
           (rt & 0x1F);
}

export function encodeAddSubCarry(sf, op, S, rm, rn, rd) {
    // sf|op|S|11010000|Rm|000000|Rn|Rd
    return ((sf & 1) << 31) |
           ((op & 1) << 30) |
           ((S & 1) << 29) |
           (0b11010000 << 21) |
           ((rm & 0x1F) << 16) |
           (0b000000 << 10) |
           ((rn & 0x1F) << 5) |
           (rd & 0x1F);
}
