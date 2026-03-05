// c-asm-en.js - English C/ASM comparison pairs

export const C_ASM_EXAMPLES_EN = [
    // === Variables ===
    {
        title: 'Simple variable',
        category: 'Variables',
        cCode: `int x = 42;`,
        asmCode: `MOV W0, #42        // x = 42`,
        notes: 'A local variable fits in a register. W0 = 32-bit register.'
    },
    {
        title: 'Two variables',
        category: 'Variables',
        cCode: `int a = 10;
int b = 20;
int c = a + b;`,
        asmCode: `MOV W0, #10        // a = 10
MOV W1, #20        // b = 20
ADD W2, W0, W1     // c = a + b`,
        notes: 'Each local variable uses a different register.'
    },
    {
        title: '64-bit variable',
        category: 'Variables',
        cCode: `long x = 100000;`,
        asmCode: `MOV X0, #100000    // long → 64-bit register (X)`,
        notes: 'long uses X (64-bit) instead of W (32-bit).'
    },

    // === Conditions ===
    {
        title: 'Simple if',
        category: 'Conditions',
        cCode: `if (x > 0) {
    y = 1;
}`,
        asmCode: `    CMP W0, #0          // compare x with 0
    B.LE skip           // if x <= 0, skip
    MOV W1, #1          // y = 1
skip:`,
        notes: 'CMP sets the flags, B.LE branches if Less or Equal.'
    },
    {
        title: 'if / else',
        category: 'Conditions',
        cCode: `if (x > y) {
    max = x;
} else {
    max = y;
}`,
        asmCode: `    CMP W0, W1          // compare x, y
    CSEL W2, W0, W1, GT // max = (x>y) ? x : y`,
        notes: 'CSEL (Conditional SELect) replaces an if/else in one instruction.'
    },
    {
        title: 'Small switch',
        category: 'Conditions',
        cCode: `switch (x) {
    case 0: y = 10; break;
    case 1: y = 20; break;
    default: y = 0;
}`,
        asmCode: `    CBZ W0, case0       // x == 0?
    CMP W0, #1
    B.EQ case1          // x == 1?
    MOV W1, #0          // default: y = 0
    B end
case0:
    MOV W1, #10
    B end
case1:
    MOV W1, #20
end:`,
        notes: 'A switch translates to a series of comparisons and branches.'
    },

    // === Loops ===
    {
        title: 'while',
        category: 'Loops',
        cCode: `int i = 0;
while (i < 10) {
    i++;
}`,
        asmCode: `    MOV W0, #0          // i = 0
loop:
    CMP W0, #10         // i < 10?
    B.GE done           // if i >= 10, exit
    ADD W0, W0, #1      // i++
    B loop              // repeat
done:`,
        notes: 'A while translates to: test at the top, backward branch.'
    },
    {
        title: 'for',
        category: 'Loops',
        cCode: `int sum = 0;
for (int i = 1; i <= 100; i++) {
    sum += i;
}`,
        asmCode: `    MOV W0, #0          // sum = 0
    MOV W1, #1          // i = 1
loop:
    CMP W1, #100
    B.GT done           // i > 100? exit
    ADD W0, W0, W1      // sum += i
    ADD W1, W1, #1      // i++
    B loop
done:
    // W0 = 5050`,
        notes: 'A for loop is a disguised while. The result is the Gauss sum.'
    },
    {
        title: 'do-while',
        category: 'Loops',
        cCode: `int n = 5;
do {
    n--;
} while (n > 0);`,
        asmCode: `    MOV W0, #5          // n = 5
loop:
    SUB W0, W0, #1      // n--
    CMP W0, #0
    B.GT loop           // if n > 0, repeat`,
        notes: 'do-while: test at the end, always executes at least once.'
    },

    // === Functions ===
    {
        title: 'Function call',
        category: 'Functions',
        cCode: `int double_val(int x) {
    return x * 2;
}
int r = double_val(21);`,
        asmCode: `    MOV W0, #21         // argument in W0
    BL double_val       // call
    // W0 = 42 (return value)
    BRK #0

double_val:
    LSL W0, W0, #1      // x * 2
    RET                  // return`,
        notes: 'BL saves the return address in LR. RET jumps back to LR.'
    },
    {
        title: 'Function with stack',
        category: 'Functions',
        cCode: `int add3(int a, int b, int c) {
    return a + b + c;
}
// Call: add3(10, 20, 30)`,
        asmCode: `    MOV W0, #10         // arg1
    MOV W1, #20         // arg2
    MOV W2, #30         // arg3
    BL add3
    BRK #0

add3:
    ADD W0, W0, W1      // a + b
    ADD W0, W0, W2      // + c
    RET`,
        notes: 'ARM64 convention: first args in W0-W7, return value in W0.'
    },
    {
        title: 'Save registers',
        category: 'Functions',
        cCode: `void foo() {
    // uses saved
    // registers
}`,
        asmCode: `foo:
    STP X29, X30, [SP, #-16]!  // save FP + LR
    MOV X29, SP                // frame pointer

    // ... function body ...

    LDP X29, X30, [SP], #16   // restore
    RET`,
        notes: 'Standard prologue/epilogue. STP/LDP save/restore 2 registers at once.'
    },

    // === Pointers & Arrays ===
    {
        title: 'Pointer',
        category: 'Pointers',
        cCode: `int x = 42;
int *p = &x;
int y = *p;`,
        asmCode: `    MOV W1, #42
    STR W1, [X0]        // *p = 42  (X0 = address)
    LDR W2, [X0]        // y = *p`,
        notes: 'In ASM, a pointer is just an address. LDR/STR = read/write.'
    },
    {
        title: 'Array (indexed access)',
        category: 'Pointers',
        cCode: `int arr[4] = {10,20,30,40};
int x = arr[2]; // x = 30`,
        asmCode: `    ADR X0, arr
    MOV W1, #2          // index
    LSL W1, W1, #2      // * sizeof(int)
    LDR W2, [X0, W1, SXTW]  // arr[2]

arr:
    .word 10, 20, 30, 40`,
        notes: 'Index is multiplied by element size (4 for int).'
    },
    {
        title: 'Array traversal',
        category: 'Pointers',
        cCode: `int arr[4] = {1,2,3,4};
int sum = 0;
for (int i = 0; i < 4; i++)
    sum += arr[i];`,
        asmCode: `    ADR X0, arr
    MOV W1, #0          // sum = 0
    MOV W2, #0          // i = 0
loop:
    CMP W2, #4
    B.GE done
    LDR W3, [X0, W2, SXTW #2]  // arr[i]
    ADD W1, W1, W3      // sum += arr[i]
    ADD W2, W2, #1
    B loop
done:
    // W1 = 10

arr:
    .word 1, 2, 3, 4`,
        notes: 'SXTW #2 = sign-extend and shift left 2 (x4) for int addressing.'
    },

    // === Structs ===
    {
        title: 'Struct access',
        category: 'Structs',
        cCode: `struct Point {
    int x;  // offset 0
    int y;  // offset 4
};
struct Point p = {10, 20};
int a = p.x;
int b = p.y;`,
        asmCode: `    ADR X0, point
    LDR W1, [X0]        // p.x (offset 0)
    LDR W2, [X0, #4]    // p.y (offset 4)
    BRK #0

point:
    .word 10, 20`,
        notes: 'A struct field = a fixed offset from the base address.'
    },
    {
        title: 'Array of structs',
        category: 'Structs',
        cCode: `struct Pair { int a, b; };
struct Pair pairs[2] = {
    {1, 2}, {3, 4}
};
// Access pairs[1].b`,
        asmCode: `    ADR X0, pairs
    // pairs[1].b = base + 1*8 + 4
    LDR W1, [X0, #12]   // offset 12 = 8+4
    BRK #0

pairs:
    .word 1, 2           // pairs[0]
    .word 3, 4           // pairs[1]`,
        notes: 'sizeof(Pair)=8. pairs[1].b = base + index*sizeof + field_offset.'
    }
];
