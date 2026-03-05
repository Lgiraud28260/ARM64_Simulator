// tutorials-en.js - English tutorials

export const TUTORIALS_EN = [
    // === Chapter 1: Introduction & Registers ===
    {
        chapter: 1,
        title: "32-bit constant",
        description: "Load the value 0xCAFEBABE into X0 using MOVZ and MOVK.",
        hint: "MOVZ loads the low 16 bits, MOVK inserts 16 bits at a shift (LSL #16).",
        code: `// Exercise: Load 0xCAFEBABE into X0
// Use MOVZ for the low 16 bits, then MOVK for the high 16 bits

// Your code here:

`,
        solution: `// Load 0xCAFEBABE into X0
MOVZ X0, #0xBABE            // X0 = 0x0000_0000_0000_BABE
MOVK X0, #0xCAFE, LSL #16   // X0 = 0x0000_0000_CAFE_BABE
`,
        check: { reg: "X0", expected: "0xCAFEBABE" }
    },
    {
        chapter: 1,
        title: "Register swap",
        description: "Swap the values of X0 (111) and X1 (222) using a temporary register.",
        hint: "Save X0 in X2, then copy X1 to X0, then X2 to X1.",
        code: `// Exercise: Swap X0 and X1
MOV X0, #111
MOV X1, #222

// Your code here (use X2 as temp):

// Expected: X0 = 222, X1 = 111
`,
        solution: `MOV X0, #111
MOV X1, #222
MOV X2, X0
MOV X0, X1
MOV X1, X2
`,
        check: { reg: "X0", expected: "222" }
    },
    {
        chapter: 1,
        title: "W vs X: 32 bits vs 64 bits",
        description: "Observe that writing to W0 clears the upper 32 bits of X0.",
        hint: "Load 0xFFFFFFFF into X0, then write 5 to W0 and observe X0.",
        code: `// Exercise: Observe W vs X behavior
MOV X0, #0xFFFF
MOVK X0, #0xFFFF, LSL #16   // X0 = 0x0000_0000_FFFF_FFFF

// Write 5 to W0 and observe X0:

// Question: what is X0 now?
`,
        solution: `MOV X0, #0xFFFF
MOVK X0, #0xFFFF, LSL #16
MOV W0, #5
`,
        check: { reg: "X0", expected: "5" }
    },
    {
        chapter: 1,
        title: "Negative value with MOVN",
        description: "Load -256 into X0 using MOVN.",
        hint: "-256 = NOT(255). MOVN loads NOT(imm) into the register.",
        code: `// Exercise: Load -256 into X0 with MOVN
// -256 = NOT(255) = NOT(0xFF)

// Your code here:

`,
        solution: `MOVN X0, #255
`,
        check: { reg: "X0", expected: "-256" }
    },

    // === Chapter 2: Arithmetic ===
    {
        chapter: 2,
        title: "Arithmetic expression",
        description: "Compute (15 * 4 + 7) / 3. Store quotient in X0 and remainder in X1.",
        hint: "Use MUL, ADD, SDIV, then MSUB for the remainder (r = a - q*b).",
        code: `// Exercise: (15 * 4 + 7) / 3
// Expected: X0 = 22 (quotient), X1 = 1 (remainder)

// Your code here:

`,
        solution: `MOV X0, #15
MOV X1, #4
MUL X2, X0, X1
ADD X2, X2, #7
MOV X3, #3
SDIV X0, X2, X3
MSUB X1, X0, X3, X2
`,
        check: { reg: "X0", expected: "22" }
    },
    {
        chapter: 2,
        title: "Overflow detection",
        description: "Add 1 to 0x7FFFFFFFFFFFFFFF with ADDS and observe the V (overflow) flag.",
        hint: "Build 0x7FFF...FFFF with MOVZ/MOVK, then ADDS X1, X0, #1.",
        code: `// Exercise: Signed overflow detection
// Build 0x7FFFFFFFFFFFFFFF in X0 then add 1 with ADDS
// Observe flags: V should be 1

// Your code here:

`,
        solution: `MOVZ X0, #0xFFFF
MOVK X0, #0xFFFF, LSL #16
MOVK X0, #0xFFFF, LSL #32
MOVK X0, #0x7FFF, LSL #48
ADDS X1, X0, #1
`,
        check: { reg: "X1", expected: "0x8000000000000000" }
    },
    {
        chapter: 2,
        title: "Average of 3 numbers",
        description: "Compute the integer average of 10, 20 and 30 in X3.",
        hint: "Add all 3 values, then SDIV by 3.",
        code: `// Exercise: Average of 10, 20, 30
// Expected: X3 = 20

// Your code here:

`,
        solution: `MOV X0, #10
MOV X1, #20
MOV X2, #30
ADD X3, X0, X1
ADD X3, X3, X2
MOV X4, #3
SDIV X3, X3, X4
`,
        check: { reg: "X3", expected: "20" }
    },
    {
        chapter: 2,
        title: "Fahrenheit to Celsius",
        description: "Convert 100°F to Celsius: C = (F - 32) * 5 / 9. Result in X0.",
        hint: "SUB for -32, MUL by 5, SDIV by 9.",
        code: `// Exercise: Convert 100°F to Celsius
// C = (F - 32) * 5 / 9
// Expected: X0 = 37

// Your code here:

`,
        solution: `MOV X0, #100
SUB X0, X0, #32
MOV X1, #5
MUL X0, X0, X1
MOV X2, #9
SDIV X0, X0, X2
`,
        check: { reg: "X0", expected: "37" }
    },
    {
        chapter: 2,
        title: "GCD (Euclid)",
        description: "Compute the GCD of 48 and 18 using Euclid's algorithm. Result in X0.",
        hint: "Loop: while b!=0, compute r = a mod b, a = b, b = r.",
        code: `// Exercise: GCD of 48 and 18
// Expected: X0 = 6

MOV X0, #48
MOV X1, #18

// Your loop here:

`,
        solution: `MOV X0, #48
MOV X1, #18
pgcd_boucle:
    CBZ X1, pgcd_fin
    UDIV X2, X0, X1
    MSUB X3, X2, X1, X0
    MOV X0, X1
    MOV X1, X3
    B pgcd_boucle
pgcd_fin:
`,
        check: { reg: "X0", expected: "6" }
    },

    // === Chapter 3: Logic & Shifts ===
    {
        chapter: 3,
        title: "Count set bits",
        description: "Count the number of 1-bits in 0xFF (X0). Result in X1.",
        hint: "Loop: extract the least significant bit (AND #1), add to counter, shift right (LSR #1).",
        code: `// Exercise: Popcount of 0xFF
// Expected: X1 = 8

MOV X0, #0xFF
MOV X1, #0

// Your loop here:

`,
        solution: `MOV X0, #0xFF
MOV X1, #0
compter:
    CBZ X0, fin_compter
    AND X2, X0, #1
    ADD X1, X1, X2
    LSR X0, X0, #1
    B compter
fin_compter:
`,
        check: { reg: "X1", expected: "8" }
    },
    {
        chapter: 3,
        title: "Power of 2 test",
        description: "Test if 64 is a power of 2. Store 1 in X3 if yes, 0 otherwise.",
        hint: "A number n is a power of 2 if n > 0 AND n & (n-1) == 0.",
        code: `// Exercise: Is 64 a power of 2?
// Expected: X3 = 1

MOV X0, #64

// Your code here:

`,
        solution: `MOV X0, #64
CMP X0, #0
B.LE pas_puissance
SUB X1, X0, #1
ANDS X2, X0, X1
B.NE pas_puissance
MOV X3, #1
B fin_test_p2
pas_puissance:
MOV X3, #0
fin_test_p2:
`,
        check: { reg: "X3", expected: "1" }
    },
    {
        chapter: 3,
        title: "Bit field extraction",
        description: "Extract bits 11:8 of 0xABCD into bits 3:0 of X1.",
        hint: "LSR by 8 positions, then AND with 0xF.",
        code: `// Exercise: Extract bits 11:8 of 0xABCD
// 0xABCD = ...1010_1011_1100_1101, bits 11:8 = 0xB = 11
// Expected: X1 = 11

MOV X0, #0xABCD

// Your code here:

`,
        solution: `MOV X0, #0xABCD
LSR X1, X0, #8
AND X1, X1, #0xF
`,
        check: { reg: "X1", expected: "11" }
    },

    // === Chapter 4: Load/Store ===
    {
        chapter: 4,
        title: "Array sum",
        description: "Compute the sum of 8 .word elements. Result in X0.",
        hint: "Loop with index, LSL #2 for offset, LDR W to load each element.",
        code: `// Exercise: Sum of [3, 7, 11, 15, 2, 8, 4, 10]
// Expected: X0 = 60

_start:
ADR X1, tab
MOV X2, #8
MOV X0, #0
MOV X3, #0

// Your loop here:


B done

tab: .word 3, 7, 11, 15, 2, 8, 4, 10

done:
`,
        solution: `_start:
ADR X1, tab
MOV X2, #8
MOV X0, #0
MOV X3, #0
somme_boucle:
    CMP X3, X2
    B.GE done
    LSL X4, X3, #2
    LDR W5, [X1, X4]
    ADD X0, X0, X5
    ADD X3, X3, #1
    B somme_boucle
B done
tab: .word 3, 7, 11, 15, 2, 8, 4, 10
done:
`,
        check: { reg: "X0", expected: "60" }
    },
    {
        chapter: 4,
        title: "Find maximum",
        description: "Find the maximum value in a .word array. Result in X0.",
        hint: "Initialize max = tab[0], iterate through the rest comparing each element.",
        code: `// Exercise: Maximum of [3, 42, 15, 7, 99, 23, 8, 55]
// Expected: X0 = 99

_start:
ADR X1, tab
MOV X2, #8

// Your code here:


B done
tab: .word 3, 42, 15, 7, 99, 23, 8, 55
done:
`,
        solution: `_start:
ADR X1, tab
MOV X2, #8
LDR W0, [X1]
MOV X3, #1
max_boucle:
    CMP X3, X2
    B.GE done
    LSL X4, X3, #2
    LDR W5, [X1, X4]
    CMP W5, W0
    B.LE pas_plus_grand
    MOV W0, W5
pas_plus_grand:
    ADD X3, X3, #1
    B max_boucle
B done
tab: .word 3, 42, 15, 7, 99, 23, 8, 55
done:
`,
        check: { reg: "X0", expected: "99" }
    },
    {
        chapter: 4,
        title: "String length",
        description: "Compute the length of \"Bonjour ARM64\" (excluding \\0). Result in X1.",
        hint: "LDRB with post-index [X0], #1, CBZ to detect NUL.",
        code: `// Exercise: strlen of "Bonjour ARM64"
// Expected: X1 = 13

_start:
ADR X0, chaine
MOV X1, #0

// Your loop here:


B done
chaine: .asciz "Bonjour ARM64"
done:
`,
        solution: `_start:
ADR X0, chaine
MOV X1, #0
strlen_boucle:
    LDRB W2, [X0], #1
    CBZ W2, done
    ADD X1, X1, #1
    B strlen_boucle
B done
chaine: .asciz "Bonjour ARM64"
done:
`,
        check: { reg: "X1", expected: "13" }
    },

    // === Chapter 5: Branches ===
    {
        chapter: 5,
        title: "Iterative Fibonacci",
        description: "Compute fib(10) iteratively. Result in X1.",
        hint: "Two variables fib(n-2) and fib(n-1), loop from 2 to N.",
        code: `// Exercise: Fibonacci(10)
// Expected: X1 = 55

MOV X0, #10

// Your code here:

`,
        solution: `MOV X0, #10
CMP X0, #0
B.EQ fib_zero
CMP X0, #1
B.EQ fib_un
MOV X1, #0
MOV X2, #1
MOV X3, #2
fib_boucle:
    CMP X3, X0
    B.GT fib_fin
    ADD X4, X1, X2
    MOV X1, X2
    MOV X2, X4
    ADD X3, X3, #1
    B fib_boucle
fib_zero:
    MOV X2, #0
    B fib_fin
fib_un:
    MOV X2, #1
fib_fin:
MOV X1, X2
`,
        check: { reg: "X1", expected: "55" }
    },
    {
        chapter: 5,
        title: "Linear search",
        description: "Search for 42 in an array. Return the index in X0 (or -1 if not found).",
        hint: "Loop with CMP of each element to 42, B.EQ if found.",
        code: `// Exercise: Find 42 in [10, 25, 42, 7, 99, 13]
// Expected: X0 = 2 (index)

_start:
ADR X1, tab
MOV X2, #6
MOV X3, #42
MOV X0, #0

// Your loop here:


B done
tab: .word 10, 25, 42, 7, 99, 13
done:
`,
        solution: `_start:
ADR X1, tab
MOV X2, #6
MOV X3, #42
MOV X0, #0
recherche:
    CMP X0, X2
    B.GE non_trouve
    LSL X4, X0, #2
    LDR W5, [X1, X4]
    CMP W5, W3
    B.EQ done
    ADD X0, X0, #1
    B recherche
non_trouve:
    MOV X0, #-1
B done
tab: .word 10, 25, 42, 7, 99, 13
done:
`,
        check: { reg: "X0", expected: "2" }
    },
    {
        chapter: 5,
        title: "Bubble sort",
        description: "Sort [45, 12, 78, 3, 56] using bubble sort. Check W10=3 after sorting.",
        hint: "Double loop: outer passes (n-1 times), inner loop with compare and swap.",
        code: `// Exercise: Bubble sort [45, 12, 78, 3, 56]
// Expected: sorted array [3, 12, 45, 56, 78]
// W10 = 3 (first element after sort)

_start:
ADR X0, tab
MOV X1, #5

// Your sort code here:


// Verification
ADR X0, tab
LDR W10, [X0]
B done

tab: .word 45, 12, 78, 3, 56
done:
`,
        solution: `_start:
ADR X0, tab
MOV X1, #5
SUB X2, X1, #1
passe:
    CBZ X2, tri_fin
    MOV X3, #0
    SUB X4, X2, #0
boucle_interne:
    CMP X3, X4
    B.GE fin_passe
    LSL X5, X3, #2
    ADD X6, X5, #4
    LDR W7, [X0, X5]
    LDR W8, [X0, X6]
    CMP W7, W8
    B.LE pas_echange
    STR W8, [X0, X5]
    STR W7, [X0, X6]
pas_echange:
    ADD X3, X3, #1
    B boucle_interne
fin_passe:
    SUB X2, X2, #1
    B passe
tri_fin:
ADR X0, tab
LDR W10, [X0]
B done
tab: .word 45, 12, 78, 3, 56
done:
`,
        check: { reg: "X10", expected: "3" }
    },

    // === Chapter 6: Conditional Selection ===
    {
        chapter: 6,
        title: "Branchless absolute value",
        description: "Compute |15 - 42| in X2 without using any branch (B).",
        hint: "SUB X2, X0, X1 then CMP and CNEG X2, X2, LT.",
        code: `// Exercise: |a - b| without branches
// Expected: X2 = 27

MOV X0, #15
MOV X1, #42

// Your code here (no B/B.xx!):

`,
        solution: `MOV X0, #15
MOV X1, #42
SUB X2, X0, X1
CMP X0, X1
CNEG X2, X2, LT
`,
        check: { reg: "X2", expected: "27" }
    },
    {
        chapter: 6,
        title: "Thresholding",
        description: "If X0 > 128, X1 = 255, else X1 = 0. Without branches.",
        hint: "MOV X2, #255, then CMP X0, #128, CSEL X1, X2, XZR, GT.",
        code: `// Exercise: Thresholding
// X0 = 200, expected: X1 = 255

MOV X0, #200

// Your code here (no B!):

`,
        solution: `MOV X0, #200
MOV X2, #255
CMP X0, #128
CSEL X1, X2, XZR, GT
`,
        check: { reg: "X1", expected: "255" }
    },
    {
        chapter: 6,
        title: "Branchless ReLU",
        description: "Implement ReLU(x) = max(0, x) for x = -15. Result in X1.",
        hint: "CMP X0, #0, then CSEL X1, X0, XZR, GT.",
        code: `// Exercise: ReLU(-15) = max(0, -15) = 0
// Expected: X1 = 0

MOV X0, #-15

// Your code here:

`,
        solution: `MOV X0, #-15
CMP X0, #0
CSEL X1, X0, XZR, GT
`,
        check: { reg: "X1", expected: "0" }
    },

    // === Chapter 7: Stack & Functions ===
    {
        chapter: 7,
        title: "Power function",
        description: "Implement power(2, 10) with BL/RET. Result in X5.",
        hint: "Prologue STP X29/X30, MUL loop, epilogue LDP, RET.",
        code: `// Exercise: power(2, 10) = 1024
// Expected: X5 = 1024

MOV X0, #2
MOV X1, #10
BL puissance
MOV X5, X0
B fin

// Implement the power function here:
puissance:


fin:
`,
        solution: `MOV X0, #2
MOV X1, #10
BL puissance
MOV X5, X0
B fin
puissance:
    STP X29, X30, [SP, #-32]!
    STP X19, X20, [SP, #16]
    MOV X29, SP
    MOV X19, X0
    MOV X20, X1
    MOV X0, #1
pow_boucle:
    CBZ X20, pow_fin
    MUL X0, X0, X19
    SUB X20, X20, #1
    B pow_boucle
pow_fin:
    LDP X19, X20, [SP, #16]
    LDP X29, X30, [SP], #32
    RET
fin:
`,
        check: { reg: "X5", expected: "1024" }
    },
    {
        chapter: 7,
        title: "Function chain",
        description: "process(7) calls double(x) then plus_one(result). Result in X5.",
        hint: "process must save LR (STP), call BL double, BL plus_one, restore (LDP), RET.",
        code: `// Exercise: process(7) = double(7) + 1 = 15
// Expected: X5 = 15

MOV X0, #7
BL traiter
MOV X5, X0
B fin

double:
    LSL X0, X0, #1
    RET

plus_un:
    ADD X0, X0, #1
    RET

// Implement process here:
traiter:


fin:
`,
        solution: `MOV X0, #7
BL traiter
MOV X5, X0
B fin
double:
    LSL X0, X0, #1
    RET
plus_un:
    ADD X0, X0, #1
    RET
traiter:
    STP X29, X30, [SP, #-16]!
    MOV X29, SP
    BL double
    BL plus_un
    LDP X29, X30, [SP], #16
    RET
fin:
`,
        check: { reg: "X5", expected: "15" }
    },

    // === Chapter 8: NEON / SIMD ===
    {
        chapter: 8,
        title: "Double a vector",
        description: "Double each element of [5, 10, 15, 20] using vector ADD.",
        hint: "LD1 {V0.4S}, ADD V1.4S, V0.4S, V0.4S, then UMOV to verify.",
        code: `// Exercise: Double [5, 10, 15, 20]
// Expected: W1 = 10 (first element doubled)

_start:
ADR X0, vec
LD1 {V0.4S}, [X0]

// Your code here:


B done
vec: .word 5, 10, 15, 20
done:
`,
        solution: `_start:
ADR X0, vec
LD1 {V0.4S}, [X0]
ADD V1.4S, V0.4S, V0.4S
UMOV W1, V1.S[0]
UMOV W2, V1.S[1]
UMOV W3, V1.S[2]
UMOV W4, V1.S[3]
B done
vec: .word 5, 10, 15, 20
done:
`,
        check: { reg: "X1", expected: "10" }
    },
    {
        chapter: 8,
        title: "SIMD dot product",
        description: "Compute the dot product [1,2,3,4] · [2,3,4,5] = 40. Result in W0.",
        hint: "LD1 both vectors, MUL V2.4S, ADDV S3, then UMOV W0.",
        code: `// Exercise: Dot product [1,2,3,4] · [2,3,4,5]
// = 1*2 + 2*3 + 3*4 + 4*5 = 2+6+12+20 = 40
// Expected: W0 = 40

_start:
ADR X0, a
ADR X1, b

// Your code here:


B done
a: .word 1, 2, 3, 4
b: .word 2, 3, 4, 5
done:
`,
        solution: `_start:
ADR X0, a
ADR X1, b
LD1 {V0.4S}, [X0]
LD1 {V1.4S}, [X1]
MUL V2.4S, V0.4S, V1.4S
ADDV S3, V2.4S
UMOV W0, V3.S[0]
B done
a: .word 1, 2, 3, 4
b: .word 2, 3, 4, 5
done:
`,
        check: { reg: "X0", expected: "40" }
    },
    {
        chapter: 8,
        title: "Vector average",
        description: "Compute the average of [10,20,30,40,50,60,70,80] with SIMD. Result in W0.",
        hint: "2x LD1, vector ADD, ADDV for the sum, UDIV by 8.",
        code: `// Exercise: Average of 8 integers with SIMD
// Sum = 360, Average = 360/8 = 45
// Expected: W0 = 45

_start:
ADR X0, tab

// Your code here:


B done
tab: .word 10, 20, 30, 40, 50, 60, 70, 80
done:
`,
        solution: `_start:
ADR X0, tab
LD1 {V0.4S}, [X0]
ADD X1, X0, #16
LD1 {V1.4S}, [X1]
ADD V2.4S, V0.4S, V1.4S
ADDV S3, V2.4S
UMOV W0, V3.S[0]
MOV W1, #8
UDIV W0, W0, W1
B done
tab: .word 10, 20, 30, 40, 50, 60, 70, 80
done:
`,
        check: { reg: "X0", expected: "45" }
    }
];
