// examples.js - Example ARM64 programs

export const EXAMPLES = [
    {
        name: 'Hello World',
        code: `// Hello World - writes to console via SVC
.data
.asciz "Hello, ARM64!\\n"

.text
.global _start

_start:
    // Setup write syscall
    MOV X8, #64         // syscall: write
    MOV X0, #1          // fd: stdout
    ADR X1, msg         // buffer address
    MOV X2, #14         // length
    SVC #0              // syscall

    // Exit
    MOV X8, #93         // syscall: exit
    MOV X0, #0          // status: 0
    SVC #0

msg:
    .asciz "Hello, ARM64!\\n"
`
    },
    {
        name: 'Fibonacci',
        code: `// Fibonacci sequence - compute first 10 numbers
// Results stored in memory starting at data section

_start:
    MOV X0, #0          // fib(0) = 0
    MOV X1, #1          // fib(1) = 1
    MOV X2, #10         // count
    ADR X3, result      // pointer to result array

    STR X0, [X3]        // store fib(0)
    ADD X3, X3, #8
    STR X1, [X3]        // store fib(1)
    ADD X3, X3, #8
    SUB X2, X2, #2      // already stored 2

loop:
    CBZ X2, done        // if count == 0, done
    ADD X4, X0, X1      // next = a + b
    MOV X0, X1          // a = b
    MOV X1, X4          // b = next
    STR X4, [X3]        // store result
    ADD X3, X3, #8
    SUB X2, X2, #1
    B loop

done:
    BRK #0              // halt

result:
    .quad 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
`
    },
    {
        name: 'Factorial',
        code: `// Factorial - compute 10! using a loop
// Result in X0

_start:
    MOV X0, #1          // result = 1
    MOV X1, #10         // n = 10

loop:
    CBZ X1, done
    MUL X0, X0, X1      // result *= n
    SUB X1, X1, #1      // n--
    B loop

done:
    // X0 now contains 10! = 3628800
    BRK #0
`
    },
    {
        name: 'Function Call',
        code: `// Function call example using BL/RET
// Computes sum of 1..N using a function

_start:
    MOV X0, #100        // N = 100
    BL sum_1_to_n       // call function
    // X0 now has result (5050)
    BRK #0

// Function: sum_1_to_n
// Input: X0 = N
// Output: X0 = 1 + 2 + ... + N
sum_1_to_n:
    MOV X1, X0          // X1 = N
    MOV X0, #0          // sum = 0
.loop:
    CBZ X1, .done
    ADD X0, X0, X1      // sum += i
    SUB X1, X1, #1      // i--
    B .loop
.done:
    RET
`
    },
    {
        name: 'Memory Operations',
        code: `// Memory operations demo
// Demonstrates LDR/STR with various addressing modes

_start:
    ADR X0, data        // base address

    // Store values
    MOV X1, #42
    STR X1, [X0]        // offset addressing
    MOV X1, #100
    STR X1, [X0, #8]    // immediate offset

    // Load back
    LDR X2, [X0]        // X2 = 42
    LDR X3, [X0, #8]    // X3 = 100

    // Add them
    ADD X4, X2, X3      // X4 = 142

    // Store pair
    STP X2, X3, [X0, #16]

    // Load pair
    LDP X5, X6, [X0, #16]  // X5=42, X6=100

    // Byte operations
    MOV W7, #0xFF
    STRB W7, [X0, #32]
    LDRB W8, [X0, #32]  // W8 = 0xFF

    BRK #0

data:
    .quad 0, 0, 0, 0, 0
`
    },
    {
        name: 'Bitwise Operations',
        code: `// Bitwise operations demo
// AND, ORR, EOR, shifts

_start:
    MOV X0, #0xFF00
    MOV X1, #0x0FF0

    AND X2, X0, X1      // X2 = 0x0F00
    ORR X3, X0, X1      // X3 = 0xFFF0
    EOR X4, X0, X1      // X4 = 0xF0F0

    // Shifts
    MOV X5, #1
    LSL X6, X5, #10     // X6 = 1024
    MOV X7, #256
    LSR X7, X7, #4      // X7 = 16

    // Test and compare
    TST X0, X1           // sets flags based on AND
    CMP X2, X7           // compare

    // Conditional operations
    CSET X8, GT          // X8 = 1 if X2 > X7

    BRK #0
`
    },
    {
        name: 'Conditional Execution',
        code: `// Conditional branches and CSEL demo
// Find maximum of three numbers

_start:
    MOV X0, #25          // a = 25
    MOV X1, #42          // b = 42
    MOV X2, #17          // c = 17

    // max(a, b) -> X3
    CMP X0, X1
    CSEL X3, X0, X1, GT  // X3 = (a > b) ? a : b

    // max(X3, c) -> X4
    CMP X3, X2
    CSEL X4, X3, X2, GT  // X4 = max of all three

    // Conditional branch example
    MOV X5, #0           // counter
    MOV X6, #5           // limit

count_loop:
    ADD X5, X5, #1
    CMP X5, X6
    B.LT count_loop      // loop while X5 < 6

    // X5 = 5 (counted to limit)
    BRK #0
`
    },
    {
        name: 'Stack Operations',
        code: `// Stack frame demo
// Demonstrates push/pop using STP/LDP

_start:
    MOV X0, #10
    MOV X1, #20

    // Save registers (push)
    STP X0, X1, [SP, #-16]!  // pre-index: SP -= 16, store

    // Modify registers
    MOV X0, #99
    MOV X1, #88

    // Restore registers (pop)
    LDP X0, X1, [SP], #16    // post-index: load, SP += 16

    // X0 = 10, X1 = 20 (restored)
    ADD X2, X0, X1            // X2 = 30

    BRK #0
`
    },
    {
        name: 'Print Demo',
        code: `// Print Demo - Terminal output examples
// Uses custom syscalls for easy printing:
//   X8=#0x100: print X0 as signed int
//   X8=#0x102: print X0 as hex
//   X8=#0x103: print X0 as ASCII char
//   X8=#0x104: print newline
//   X8=#0x105: print null-terminated string at X0
//   X8=#64:    write(fd=X0, buf=X1, len=X2)

_start:
    // Print a greeting
    ADR X0, greeting
    MOV X8, #0x105       // print_string
    SVC #0

    // Newline
    MOV X8, #0x104
    SVC #0

    // Compute factorial(10)
    MOV X19, #1          // result
    MOV X20, #10         // counter
fact_loop:
    CBZ X20, print_fact
    MUL X19, X19, X20
    SUB X20, X20, #1
    B fact_loop

print_fact:
    // Print "10! = "
    ADR X0, fact_label
    MOV X8, #0x105
    SVC #0

    // Print result as decimal
    MOV X0, X19
    MOV X8, #0x100
    SVC #0

    // Newline
    MOV X8, #0x104
    SVC #0

    // Print numbers 1..5
    ADR X0, count_label
    MOV X8, #0x105
    SVC #0

    MOV X19, #1
count_loop:
    CMP X19, #6
    B.EQ finish

    MOV X0, X19
    MOV X8, #0x100       // print_int
    SVC #0

    MOV X0, #32          // space char
    MOV X8, #0x103       // print_char
    SVC #0

    ADD X19, X19, #1
    B count_loop

finish:
    MOV X8, #0x104       // newline
    SVC #0

    ADR X0, done_msg
    MOV X8, #0x105
    SVC #0

    // Exit
    MOV X8, #93
    MOV X0, #0
    SVC #0

greeting:
    .asciz "=== ARM64 Terminal Demo ==="
fact_label:
    .asciz "10! = "
count_label:
    .asciz "Count: "
done_msg:
    .asciz "Done!"
`
    },
    {
        name: 'Matrix Multiply 3x3',
        code: `// Matrix Multiplication 3x3: C = A * B
// Triple nested loop (scalar, NEON not available)
// Prints result to terminal
//
// A = | 1 2 3 |   B = | 9 8 7 |
//     | 4 5 6 |       | 6 5 4 |
//     | 7 8 9 |       | 3 2 1 |
//
// Expected C = | 30  24  18 |
//              | 84  69  54 |
//              |138 114  90 |

_start:
    ADR X20, matA       // A base
    ADR X21, matB       // B base
    ADR X22, matC       // C base
    MOV X23, #3         // N = 3

    // === Compute C = A * B ===
    MOV X24, #0         // i = 0
loop_i:
    CMP X24, X23
    B.GE print_result
    MOV X25, #0         // j = 0
loop_j:
    CMP X25, X23
    B.GE next_i

    MOV X26, #0         // sum = 0
    MOV X27, #0         // k = 0
loop_k:
    CMP X27, X23
    B.GE store

    // addr(A[i][k]) = A + (i*3+k)*8
    MUL X0, X24, X23
    ADD X0, X0, X27
    LSL X0, X0, #3
    ADD X0, X0, X20
    LDR X1, [X0]

    // addr(B[k][j]) = B + (k*3+j)*8
    MUL X0, X27, X23
    ADD X0, X0, X25
    LSL X0, X0, #3
    ADD X0, X0, X21
    LDR X2, [X0]

    // sum += A[i][k] * B[k][j]
    MUL X3, X1, X2
    ADD X26, X26, X3

    ADD X27, X27, #1
    B loop_k

store:
    // addr(C[i][j]) = C + (i*3+j)*8
    MUL X0, X24, X23
    ADD X0, X0, X25
    LSL X0, X0, #3
    ADD X0, X0, X22
    STR X26, [X0]

    ADD X25, X25, #1
    B loop_j

next_i:
    ADD X24, X24, #1
    B loop_i

    // === Print result ===
print_result:
    ADR X0, header
    MOV X8, #0x105
    SVC #0

    MOV X24, #0         // i = 0
pr_row:
    CMP X24, X23
    B.GE pr_done

    // Print "  | "
    ADR X0, row_pre
    MOV X8, #0x105
    SVC #0

    MOV X25, #0         // j = 0
pr_col:
    CMP X25, X23
    B.GE pr_row_end

    // Load and print C[i][j]
    MUL X0, X24, X23
    ADD X0, X0, X25
    LSL X0, X0, #3
    ADD X0, X0, X22
    LDR X0, [X0]
    MOV X8, #0x100      // print_int
    SVC #0

    // Print tab
    MOV X0, #9
    MOV X8, #0x103
    SVC #0

    ADD X25, X25, #1
    B pr_col

pr_row_end:
    // Print "|\\n"
    MOV X0, #124        // '|'
    MOV X8, #0x103
    SVC #0
    MOV X8, #0x104      // newline
    SVC #0

    ADD X24, X24, #1
    B pr_row

pr_done:
    ADR X0, footer
    MOV X8, #0x105
    SVC #0

    // Exit
    MOV X8, #93
    MOV X0, #0
    SVC #0

header:
    .asciz "=== Matrix C = A x B ===\\n"
row_pre:
    .asciz "  | "
footer:
    .asciz "Done!\\n"

matA:
    .quad 1, 2, 3
    .quad 4, 5, 6
    .quad 7, 8, 9

matB:
    .quad 9, 8, 7
    .quad 6, 5, 4
    .quad 3, 2, 1

matC:
    .quad 0, 0, 0
    .quad 0, 0, 0
    .quad 0, 0, 0
`
    },
    {
        name: 'NEON Vector Add',
        code: `// NEON Vector Add Demo
// Demonstrates basic NEON SIMD operations
// Adds two vectors of 4x 32-bit integers element-wise

_start:
    ADR X0, vec_a       // pointer to vector A
    ADR X1, vec_b       // pointer to vector B
    ADR X2, vec_result  // pointer to result

    // Load vectors into NEON registers
    LD1 {V0.4S}, [X0]   // V0 = [10, 20, 30, 40]
    LD1 {V1.4S}, [X1]   // V1 = [1, 2, 3, 4]

    // SIMD add: V2 = V0 + V1
    ADD V2.4S, V0.4S, V1.4S  // V2 = [11, 22, 33, 44]

    // SIMD multiply: V3 = V0 * V1
    MUL V3.4S, V0.4S, V1.4S  // V3 = [10, 40, 90, 160]

    // Store result
    ST1 {V2.4S}, [X2]

    // Sum all lanes of V2 using ADDV
    ADDV S4, V2.4S      // S4 = 11+22+33+44 = 110

    // Extract scalar result to X3
    UMOV W3, V4.S[0]    // W3 = 110

    // Print result
    ADR X0, msg
    MOV X8, #0x105
    SVC #0

    MOV X0, X3
    MOV X8, #0x100       // print_int
    SVC #0

    MOV X8, #0x104       // newline
    SVC #0

    // Fill vector with constant using MOVI
    MOVI V5.4S, #42      // V5 = [42, 42, 42, 42]

    // DUP from register
    MOV W4, #7
    DUP V6.4S, W4        // V6 = [7, 7, 7, 7]

    // Logical operations
    AND V7.16B, V0.16B, V1.16B
    ORR V8.16B, V0.16B, V1.16B
    EOR V9.16B, V0.16B, V1.16B

    // Compare
    CMEQ V10.4S, V0.4S, V1.4S  // all zeros (not equal)

    // Exit
    MOV X8, #93
    MOV X0, #0
    SVC #0

msg:
    .asciz "NEON sum = "

vec_a:
    .word 10, 20, 30, 40

vec_b:
    .word 1, 2, 3, 4

vec_result:
    .word 0, 0, 0, 0
`
    },
    {
        name: 'NEON Matrix Multiply',
        code: `// NEON Matrix Multiply 3x3
// Uses LD1/MUL/ADDV/ST1 for vectorized dot products
// A = | 1 2 3 |   B = | 9 8 7 |
//     | 4 5 6 |       | 6 5 4 |
//     | 7 8 9 |       | 3 2 1 |
// C = | 30  24  18 |
//     | 84  69  54 |
//     |138 114  90 |

_start:
    ADR X20, matA_w     // A base (32-bit words)
    ADR X21, matB_col0  // B columns (transposed)
    ADR X22, matC_w     // C result
    MOV X23, #3         // N = 3

    MOV X24, #0         // i = 0
loop_i:
    CMP X24, X23
    B.GE print_result

    // Load row i of A into V0
    // addr = A + i*4*4 (rows padded to 4 words = 16 bytes)
    MOV X0, #16
    MUL X1, X24, X0
    ADD X1, X1, X20
    LD1 {V0.4S}, [X1]   // V0 = A[i][0..2] (4th element = 0)

    MOV X25, #0         // j = 0
loop_j:
    CMP X25, X23
    B.GE next_i

    // Load column j of B into V1
    // B columns stored sequentially: col0, col1, col2
    MOV X0, #16
    MUL X1, X25, X0
    ADD X1, X1, X21
    LD1 {V1.4S}, [X1]   // V1 = B_col[j]

    // Multiply element-wise: V2 = V0 * V1
    MUL V2.4S, V0.4S, V1.4S

    // Sum lanes: result = sum of V2 lanes
    ADDV S3, V2.4S      // S3 = dot product

    // Extract to GP register
    UMOV W4, V3.S[0]

    // Store C[i][j]
    MUL X0, X24, X23
    ADD X0, X0, X25
    LSL X0, X0, #2      // *4 for 32-bit
    ADD X0, X0, X22
    STR W4, [X0]

    ADD X25, X25, #1
    B loop_j

next_i:
    ADD X24, X24, #1
    B loop_i

print_result:
    ADR X0, header
    MOV X8, #0x105
    SVC #0

    MOV X24, #0
pr_row:
    CMP X24, X23
    B.GE pr_done

    ADR X0, row_pre
    MOV X8, #0x105
    SVC #0

    MOV X25, #0
pr_col:
    CMP X25, X23
    B.GE pr_row_end

    // Load and print C[i][j] (32-bit)
    MUL X0, X24, X23
    ADD X0, X0, X25
    LSL X0, X0, #2
    ADD X0, X0, X22
    LDR W0, [X0]
    MOV X8, #0x100
    SVC #0

    MOV X0, #9          // tab
    MOV X8, #0x103
    SVC #0

    ADD X25, X25, #1
    B pr_col

pr_row_end:
    MOV X0, #124         // '|'
    MOV X8, #0x103
    SVC #0
    MOV X8, #0x104
    SVC #0

    ADD X24, X24, #1
    B pr_row

pr_done:
    ADR X0, footer
    MOV X8, #0x105
    SVC #0

    MOV X8, #93
    MOV X0, #0
    SVC #0

header:
    .asciz "=== NEON Matrix C = A x B ===\\n"
row_pre:
    .asciz "  | "
footer:
    .asciz "Done!\\n"

// Matrix A stored as 32-bit words (rows, padded to 4)
matA_w:
    .word 1, 2, 3, 0
    .word 4, 5, 6, 0
    .word 7, 8, 9, 0

// Matrix B columns (transposed for dot product, padded to 4)
// col0 = [9, 6, 3], col1 = [8, 5, 2], col2 = [7, 4, 1]
matB_col0:
    .word 9, 6, 3, 0
matB_col1:
    .word 8, 5, 2, 0
matB_col2:
    .word 7, 4, 1, 0

matC_w:
    .word 0, 0, 0
    .word 0, 0, 0
    .word 0, 0, 0
`
    }
];
