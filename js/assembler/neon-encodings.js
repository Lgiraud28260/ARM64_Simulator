// neon-encodings.js - Bit-field templates for ARM64 NEON/SIMD instructions

// Extract V register number from name like "V0"
export function vregNum(name) {
    if (!name) return 0;
    const m = name.toUpperCase().match(/^V(\d+)$/);
    if (m) return parseInt(m[1]);
    throw new Error(`Invalid vector register: ${name}`);
}

// Q bit: 0 for 64-bit (lower half), 1 for 128-bit (full)
export function neonQ(arrangement) {
    if (!arrangement) return 1;
    const upper = arrangement.toUpperCase();
    // 128-bit: 16B, 8H, 4S, 2D
    // 64-bit: 8B, 4H, 2S, 1D
    switch (upper) {
        case '16B': case '8H': case '4S': case '2D': return 1;
        case '8B': case '4H': case '2S': case '1D': return 0;
        default: return 1;
    }
}

// Size field for NEON instructions
export function neonSize(arrangement) {
    if (!arrangement) return 0;
    const ch = arrangement[arrangement.length - 1].toUpperCase();
    switch (ch) {
        case 'B': return 0b00;
        case 'H': return 0b01;
        case 'S': return 0b10;
        case 'D': return 0b11;
        default: return 0b00;
    }
}

// SIMD Three Same: 0|Q|U|01110|size|1|Rm|opcode(5)|1|Rn|Rd
export function encodeSIMDThreeSame(Q, U, size, Rm, opcode, Rn, Rd) {
    return (0 << 31) |
           ((Q & 1) << 30) |
           ((U & 1) << 29) |
           (0b01110 << 24) |
           ((size & 0x3) << 22) |
           (1 << 21) |
           ((Rm & 0x1F) << 16) |
           ((opcode & 0x1F) << 11) |
           (1 << 10) |
           ((Rn & 0x1F) << 5) |
           (Rd & 0x1F);
}

// SIMD Copy (DUP/INS/UMOV): 0|Q|op|01110000|imm5|0|imm4|1|Rn|Rd
export function encodeSIMDCopy(Q, op, imm5, imm4, Rn, Rd) {
    return (0 << 31) |
           ((Q & 1) << 30) |
           ((op & 1) << 29) |
           (0b01110000 << 21) |
           ((imm5 & 0x1F) << 16) |
           (0 << 15) |
           ((imm4 & 0xF) << 11) |
           (1 << 10) |
           ((Rn & 0x1F) << 5) |
           (Rd & 0x1F);
}

// SIMD Modified Immediate (MOVI): 0|Q|op|0111100000|a|b|c|cmode|01|d|e|f|g|h|Rd
export function encodeSIMDModifiedImm(Q, op, abc, cmode, defgh, Rd) {
    return (0 << 31) |
           ((Q & 1) << 30) |
           ((op & 1) << 29) |
           (0b0111100000 << 19) |
           ((abc & 0x7) << 16) |
           ((cmode & 0xF) << 12) |
           (0b01 << 10) |
           ((defgh & 0x1F) << 5) |
           (Rd & 0x1F);
}

// SIMD LD1/ST1 single structure (no offset): 0|Q|001100|L|10|00000|opcode|size|Rn|Rt
// LD1 {Vt.T}, [Xn]  (multiple structure, single register)
export function encodeSIMDLoadStoreMulti(Q, L, size, Rn, Rt) {
    // LD1/ST1 one register: opcode=0111 for single-register
    return (0 << 31) |
           ((Q & 1) << 30) |
           (0b001100 << 24) |
           ((L & 1) << 22) |  // L=1 load, L=0 store
           (0b1 << 21) |      // bit 21 = 1 for post-index=0
           (0b00000 << 16) |  // Rm=0 (no post-index offset)
           (0b0111 << 12) |   // opcode for 1-register
           ((size & 0x3) << 10) |
           ((Rn & 0x1F) << 5) |
           (Rt & 0x1F);
}

// Fixed: LD1/ST1 proper encoding: 0|Q|001100|0|L|0|00000|opcode|size|Rn|Rt
export function encodeSIMDLoadStoreMultiNoOffset(Q, L, size, Rn, Rt) {
    return (0 << 31) |
           ((Q & 1) << 30) |
           (0b00 << 28) |
           (0b1100 << 24) |
           (0 << 23) |        // 0 for no post-index
           ((L & 1) << 22) |
           (0 << 21) |
           (0b00000 << 16) |
           (0b0111 << 12) |   // opcode for 1-register LD1/ST1
           ((size & 0x3) << 10) |
           ((Rn & 0x1F) << 5) |
           (Rt & 0x1F);
}

// SIMD Across Lanes: 0|Q|U|01110|size|11000|opcode(5)|10|Rn|Rd
export function encodeSIMDAcrossLanes(Q, U, size, opcode, Rn, Rd) {
    return (0 << 31) |
           ((Q & 1) << 30) |
           ((U & 1) << 29) |
           (0b01110 << 24) |
           ((size & 0x3) << 22) |
           (0b11000 << 17) |
           ((opcode & 0x1F) << 12) |  // 5-bit opcode
           (0b10 << 10) |
           ((Rn & 0x1F) << 5) |
           (Rd & 0x1F);
}

// imm5 for DUP from general purpose register
export function dupFromGPImm5(arrangement) {
    const upper = arrangement.toUpperCase();
    const ch = upper[upper.length - 1];
    switch (ch) {
        case 'B': return 0b00001;
        case 'H': return 0b00010;
        case 'S': return 0b00100;
        case 'D': return 0b01000;
        default: return 0b00100;
    }
}

// SIMD two-register misc (MVN/NOT): 0|Q|U|01110|size|10000|opcode(5)|10|Rn|Rd
export function encodeSIMDTwoRegMisc(Q, U, size, opcode, Rn, Rd) {
    return (0 << 31) |
           ((Q & 1) << 30) |
           ((U & 1) << 29) |
           (0b01110 << 24) |
           ((size & 0x3) << 22) |
           (0b10000 << 17) |
           ((opcode & 0x1F) << 12) |
           (0b10 << 10) |
           ((Rn & 0x1F) << 5) |
           (Rd & 0x1F);
}

// Float three-same: 0|Q|0|01110|0|sz|1|Rm|opcode(5)|1|Rn|Rd
// where sz=0 for .S (32-bit float), sz=1 for .D (64-bit float)
export function encodeSIMDFloatThreeSame(Q, U, sz, Rm, opcode, Rn, Rd) {
    return (0 << 31) |
           ((Q & 1) << 30) |
           ((U & 1) << 29) |
           (0b01110 << 24) |
           (0 << 23) |
           ((sz & 1) << 22) |
           (1 << 21) |
           ((Rm & 0x1F) << 16) |
           ((opcode & 0x1F) << 11) |
           (1 << 10) |
           ((Rn & 0x1F) << 5) |
           (Rd & 0x1F);
}
