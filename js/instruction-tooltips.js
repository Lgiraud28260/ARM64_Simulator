// instruction-tooltips.js - Short descriptions for ARM64 mnemonics
export const TOOLTIPS = {
    // Data movement
    MOV:   "Move: Rd = Op2",
    MOVZ:  "Move wide with zero: Rd = imm16 << shift",
    MOVK:  "Move wide with keep: insert imm16 at shift, keep other bits",
    MOVN:  "Move wide with NOT: Rd = NOT(imm16 << shift)",

    // Arithmetic
    ADD:   "Add: Rd = Rn + Op2",
    ADDS:  "Add and set flags: Rd = Rn + Op2, update NZCV",
    SUB:   "Subtract: Rd = Rn - Op2",
    SUBS:  "Subtract and set flags: Rd = Rn - Op2, update NZCV",
    MUL:   "Multiply: Rd = Rn × Rm",
    SDIV:  "Signed divide: Rd = Rn / Rm",
    UDIV:  "Unsigned divide: Rd = Rn / Rm",
    MADD:  "Multiply-add: Rd = Ra + Rn × Rm",
    MSUB:  "Multiply-subtract: Rd = Ra - Rn × Rm",
    NEG:   "Negate: Rd = -Rm",
    NEGS:  "Negate and set flags: Rd = -Rm, update NZCV",
    ADC:   "Add with carry: Rd = Rn + Rm + C",
    ADCS:  "Add with carry, set flags: Rd = Rn + Rm + C, update NZCV",
    SBC:   "Subtract with carry: Rd = Rn - Rm - !C",
    SBCS:  "Subtract with carry, set flags",

    // Compare
    CMP:   "Compare: set flags for Rn - Op2 (alias for SUBS XZR)",
    CMN:   "Compare negative: set flags for Rn + Op2",
    TST:   "Test bits: set flags for Rn AND Op2 (alias for ANDS XZR)",

    // Logic
    AND:   "Bitwise AND: Rd = Rn & Op2",
    ANDS:  "Bitwise AND, set flags: Rd = Rn & Op2, update NZ",
    ORR:   "Bitwise OR: Rd = Rn | Op2",
    EOR:   "Bitwise XOR: Rd = Rn ^ Op2",
    BIC:   "Bit clear: Rd = Rn & ~Op2",
    BICS:  "Bit clear, set flags",
    ORN:   "OR NOT: Rd = Rn | ~Op2",
    EON:   "XOR NOT: Rd = Rn ^ ~Op2",
    MVN:   "Move NOT: Rd = ~Op2",

    // Shifts
    LSL:   "Logical shift left: Rd = Rn << amount",
    LSR:   "Logical shift right: Rd = Rn >> amount (unsigned)",
    ASR:   "Arithmetic shift right: Rd = Rn >> amount (signed)",
    ROR:   "Rotate right: bits shifted out re-enter at top",

    // Load/Store
    LDR:   "Load register: Rd = mem[addr] (32/64-bit)",
    STR:   "Store register: mem[addr] = Rd",
    LDRB:  "Load byte (zero-extend): Rd = mem[addr] (8-bit)",
    STRB:  "Store byte: mem[addr] = Rd[7:0]",
    LDRH:  "Load halfword (zero-extend): Rd = mem[addr] (16-bit)",
    STRH:  "Store halfword: mem[addr] = Rd[15:0]",
    LDRSB: "Load signed byte (sign-extend to 64-bit)",
    LDRSH: "Load signed halfword (sign-extend to 64-bit)",
    LDRSW: "Load signed word (sign-extend 32→64-bit)",
    LDP:   "Load pair: Rt1, Rt2 from consecutive memory",
    STP:   "Store pair: Rt1, Rt2 to consecutive memory",

    // Branch
    B:     "Branch unconditional: PC = label",
    BL:    "Branch with link: LR = PC+4, PC = label (function call)",
    BR:    "Branch to register: PC = Xn",
    BLR:   "Branch with link to register: LR = PC+4, PC = Xn",
    RET:   "Return: PC = LR (X30)",
    CBZ:   "Compare and branch if zero: if Rt == 0, branch",
    CBNZ:  "Compare and branch if not zero: if Rt != 0, branch",
    TBZ:   "Test bit and branch if zero",
    TBNZ:  "Test bit and branch if not zero",

    // Conditional select
    CSEL:  "Conditional select: Rd = cond ? Rn : Rm",
    CSINC: "Conditional select increment: Rd = cond ? Rn : Rm+1",
    CSINV: "Conditional select invert: Rd = cond ? Rn : ~Rm",
    CSNEG: "Conditional select negate: Rd = cond ? Rn : -Rm",
    CSET:  "Conditional set: Rd = cond ? 1 : 0",
    CSETM: "Conditional set mask: Rd = cond ? -1 : 0",
    CINC:  "Conditional increment: Rd = cond ? Rn+1 : Rn",
    CINV:  "Conditional invert: Rd = cond ? ~Rn : Rn",
    CNEG:  "Conditional negate: Rd = cond ? -Rn : Rn",

    // Address
    ADR:   "Form PC-relative address: Rd = PC + offset (±1MB)",
    ADRP:  "Form PC-relative page address: Rd = (PC & ~0xFFF) + offset×4096",

    // System
    SVC:   "Supervisor call (system call / trap)",
    NOP:   "No operation",
    BRK:   "Breakpoint: halt execution",
    MSR:   "Move to system register",
    MRS:   "Move from system register",

    // NEON / SIMD
    LD1:   "Load single structure: Vt.T from memory",
    ST1:   "Store single structure: Vt.T to memory",
    DUP:   "Duplicate: fill all lanes with scalar value",
    INS:   "Insert: Vd.T[index] = Rn or Vm.T[index]",
    UMOV:  "Unsigned move: Rd = Vn.T[index]",
    MOVI:  "Move immediate to vector: fill lanes with imm",
    ADDV:  "Add across vector: Sd = sum of all lanes",
    CMEQ:  "Compare equal (per lane): 0xFFF… if equal, else 0",
    CMGT:  "Compare greater than (per lane)",
    CMGE:  "Compare greater or equal (per lane)",
    FADD:  "Floating-point add (per lane)",
    FSUB:  "Floating-point subtract (per lane)",
    FMUL:  "Floating-point multiply (per lane)",
    FDIV:  "Floating-point divide (per lane)",
    NOT:   "Bitwise NOT (per lane)"
};
