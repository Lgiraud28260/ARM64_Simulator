// tooltips-en.js - English instruction tooltips
export const TOOLTIPS_EN = {
    // Data movement
    MOV:   "Copy a value into a register. Ex: MOV X0, #5 → X0 = 5",
    MOVZ:  "Load a 16-bit number (other bits set to zero). Ex: MOVZ X0, #0xFFFF",
    MOVK:  "Insert 16 bits at a position without touching the rest. Ex: MOVK X0, #0xCAFE, LSL #16",
    MOVN:  "Load the bitwise inverse of a number. MOVN X0, #0 → X0 = -1",

    // Arithmetic
    ADD:   "Addition. Ex: ADD X0, X1, #10 → X0 = X1 + 10",
    ADDS:  "Addition + update NZCV flags",
    SUB:   "Subtraction. Ex: SUB X0, X1, X2 → X0 = X1 - X2",
    SUBS:  "Subtraction + update NZCV flags",
    MUL:   "Multiplication. Ex: MUL X0, X1, X2 → X0 = X1 * X2",
    SDIV:  "Signed division. Ex: SDIV X0, X1, X2 → X0 = X1 / X2",
    UDIV:  "Unsigned division. Ex: UDIV X0, X1, X2 → X0 = X1 / X2",
    MADD:  "Multiply-add. MADD Xd, Xn, Xm, Xa → Xd = Xa + Xn * Xm",
    MSUB:  "Multiply-subtract. MSUB Xd, Xn, Xm, Xa → Xd = Xa - Xn * Xm. Useful for modulo",
    NEG:   "Negate. NEG X0, X1 → X0 = -X1",
    NEGS:  "Negate + update flags",
    ADC:   "Add with carry. ADC Xd, Xn, Xm → Xd = Xn + Xm + C",
    ADCS:  "Add with carry + flags",
    SBC:   "Subtract with carry. SBC Xd, Xn, Xm → Xd = Xn - Xm - !C",
    SBCS:  "Subtract with carry + flags",

    // Comparison
    CMP:   "Compare two values (subtraction without storing result, updates flags). Ex: CMP X0, #10",
    CMN:   "Compare by addition (addition without storing, updates flags)",
    TST:   "Test bits (AND without storing result, updates flags). Ex: TST X0, #1 → test if odd",

    // Logic
    AND:   "Bitwise AND. Ex: AND X0, X1, #0xFF → keep the low 8 bits",
    ANDS:  "Bitwise AND + update flags",
    ORR:   "Bitwise OR. Ex: ORR X0, X1, X2 → combine bits",
    EOR:   "Bitwise XOR. Ex: EOR X0, X1, X2 → flip differing bits",
    BIC:   "Bit clear. BIC X0, X1, #0xF → clear the low 4 bits of X1",
    BICS:  "Bit clear + flags",
    ORN:   "OR with NOT. ORN Xd, Xn, Xm → Xd = Xn | ~Xm",
    EON:   "XOR with NOT. EON Xd, Xn, Xm → Xd = Xn ^ ~Xm",
    MVN:   "Invert all bits. MVN X0, X1 → X0 = ~X1",

    // Shifts
    LSL:   "Logical shift left (multiply by power of 2). Ex: LSL X0, X1, #3 → X0 = X1 * 8",
    LSR:   "Logical shift right (unsigned divide by power of 2). Ex: LSR X0, X1, #2 → X0 = X1 / 4",
    ASR:   "Arithmetic shift right (preserves sign). Ex: ASR X0, X1, #1 → signed divide by 2",
    ROR:   "Rotate right: bits that fall off come back at the top",

    // Load / Store
    LDR:   "Load a value from memory. Ex: LDR X0, [X1] → X0 = memory at address X1",
    STR:   "Store a value to memory. Ex: STR X0, [X1] → memory at address X1 = X0",
    LDRB:  "Load 1 byte from memory (8 bits, zero-extended)",
    STRB:  "Store 1 byte to memory (low 8 bits of register)",
    LDRH:  "Load 2 bytes from memory (16 bits, zero-extended)",
    STRH:  "Store 2 bytes to memory (low 16 bits of register)",
    LDRSB: "Load 1 signed byte (sign-extend to 64 bits)",
    LDRSH: "Load 2 signed bytes (sign-extend to 64 bits)",
    LDRSW: "Load 4 signed bytes (sign-extend from 32 to 64 bits)",
    LDP:   "Load a pair of registers from memory. Ex: LDP X0, X1, [SP]",
    STP:   "Store a pair of registers to memory. Ex: STP X0, X1, [SP, #-16]!",

    // Branches
    B:     "Unconditional jump to a label. Ex: B loop",
    BL:    "Function call: saves return address in LR, then jumps. Ex: BL my_function",
    BR:    "Jump to address in a register. Ex: BR X0",
    BLR:   "Function call via register: LR = next address, jump to Xn",
    RET:   "Return from function: jumps to address in LR (X30)",
    CBZ:   "Jump if register is zero. Ex: CBZ X0, end → if X0 == 0, go to end",
    CBNZ:  "Jump if register is NOT zero. Ex: CBNZ X0, loop",
    TBZ:   "Jump if a specific bit is 0. Ex: TBZ X0, #0, even → test bit 0",
    TBNZ:  "Jump if a specific bit is 1",

    // Conditional select
    CSEL:  "Choose between two values based on condition. Ex: CSEL X0, X1, X2, EQ → X0 = (equal?) X1 : X2",
    CSINC: "Like CSEL but increment if false. CSINC Xd, Xn, Xm, cond → Xd = cond ? Xn : Xm+1",
    CSINV: "Like CSEL but invert if false. Xd = cond ? Xn : ~Xm",
    CSNEG: "Like CSEL but negate if false. Xd = cond ? Xn : -Xm",
    CSET:  "Set 1 if condition true, 0 otherwise. Ex: CSET X0, EQ → X0 = 1 if equal",
    CSETM: "Set -1 (all bits 1) if condition true, 0 otherwise",
    CINC:  "Increment if condition true. CINC X0, X1, GT → X0 = (greater?) X1+1 : X1",
    CINV:  "Invert bits if condition true",
    CNEG:  "Negate if condition true. Ex: CNEG X0, X1, LT → X0 = (negative?) -X1 : X1",

    // Addresses
    ADR:   "Compute a nearby address (label in code). Ex: ADR X0, message",
    ADRP:  "Compute the address of a memory page (for large programs)",

    // System
    SVC:   "System call (syscall). The syscall number is in X8",
    NOP:   "Do nothing (useful for alignment or timing)",
    BRK:   "Breakpoint: stops program execution",
    MSR:   "Write to a system register (flags, control...)",
    MRS:   "Read a system register",

    // NEON / SIMD (vector computation)
    LD1:   "Load a vector from memory. Ex: LD1 {V0.4S}, [X0] → 4 x 32-bit integers",
    ST1:   "Store a vector to memory. Ex: ST1 {V0.4S}, [X0]",
    DUP:   "Fill all vector lanes with the same value. Ex: DUP V0.4S, W1",
    INS:   "Insert a value into a vector lane. Ex: INS V0.S[2], W1",
    UMOV:  "Extract a vector lane to a register. Ex: UMOV W0, V1.S[0]",
    MOVI:  "Fill a vector with a constant. Ex: MOVI V0.4S, #42",
    ADDV:  "Sum all vector lanes. Ex: ADDV S0, V1.4S → S0 = sum of all 4 lanes",
    CMEQ:  "Compare each lane: sets 0xFFFF... if equal, 0 otherwise",
    CMGT:  "Compare each lane: sets 0xFFFF... if strictly greater",
    CMGE:  "Compare each lane: sets 0xFFFF... if greater or equal",
    FADD:  "Floating-point add per lane. Ex: FADD V0.2D, V1.2D, V2.2D",
    FSUB:  "Floating-point subtract per lane",
    FMUL:  "Floating-point multiply per lane",
    FDIV:  "Floating-point divide per lane",
    NOT:   "Invert all bits in each vector lane"
};
