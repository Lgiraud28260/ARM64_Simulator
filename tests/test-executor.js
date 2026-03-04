// test-executor.js
import { RegisterFile } from '../js/registers.js';
import { Memory, SEGMENTS } from '../js/memory.js';
import { Assembler } from '../js/assembler/assembler.js';
import { CPU } from '../js/cpu/cpu.js';

export async function runExecutorTests() {
    section('Executor Tests');

    const asm = new Assembler();

    function runProgram(source, maxSteps = 1000) {
        const regs = new RegisterFile();
        const mem = new Memory();
        const cpu = new CPU(regs, mem);

        const result = asm.assemble(source);
        if (result.errors.length > 0) {
            return { error: result.errors[0].message, regs, mem, cpu };
        }

        cpu.loadProgram(result);
        let steps = 0;
        while (steps < maxSteps && !cpu.halted) {
            if (!cpu.step()) break;
            steps++;
        }
        return { regs, mem, cpu, steps };
    }

    // MOV and ADD
    {
        const { regs } = runProgram(`
            MOV X0, #10
            MOV X1, #20
            ADD X2, X0, X1
            BRK #0
        `);
        assert(regs.getX(0) === 10n, 'MOV X0, #10');
        assert(regs.getX(1) === 20n, 'MOV X1, #20');
        assert(regs.getX(2) === 30n, 'ADD X2, X0, X1 = 30');
    }

    // SUB
    {
        const { regs } = runProgram(`
            MOV X0, #50
            MOV X1, #30
            SUB X2, X0, X1
            BRK #0
        `);
        assert(regs.getX(2) === 20n, 'SUB 50-30=20');
    }

    // MUL
    {
        const { regs } = runProgram(`
            MOV X0, #7
            MOV X1, #6
            MUL X2, X0, X1
            BRK #0
        `);
        assert(regs.getX(2) === 42n, 'MUL 7*6=42');
    }

    // UDIV
    {
        const { regs } = runProgram(`
            MOV X0, #100
            MOV X1, #7
            UDIV X2, X0, X1
            BRK #0
        `);
        assert(regs.getX(2) === 14n, 'UDIV 100/7=14');
    }

    // CMP and B.EQ
    {
        const { regs } = runProgram(`
            MOV X0, #5
            MOV X1, #5
            CMP X0, X1
            B.EQ equal
            MOV X2, #0
            B done
        equal:
            MOV X2, #1
        done:
            BRK #0
        `);
        assert(regs.getX(2) === 1n, 'B.EQ taken when equal');
    }

    // CMP and B.NE
    {
        const { regs } = runProgram(`
            MOV X0, #5
            MOV X1, #10
            CMP X0, X1
            B.NE notequal
            MOV X2, #0
            B done
        notequal:
            MOV X2, #1
        done:
            BRK #0
        `);
        assert(regs.getX(2) === 1n, 'B.NE taken when not equal');
    }

    // B.LT
    {
        const { regs } = runProgram(`
            MOV X0, #3
            MOV X1, #10
            CMP X0, X1
            B.LT less
            MOV X2, #0
            B done
        less:
            MOV X2, #1
        done:
            BRK #0
        `);
        assert(regs.getX(2) === 1n, 'B.LT taken when less');
    }

    // Loop (sum 1..10)
    {
        const { regs } = runProgram(`
            MOV X0, #0
            MOV X1, #10
        loop:
            ADD X0, X0, X1
            SUB X1, X1, #1
            CBNZ X1, loop
            BRK #0
        `);
        assert(regs.getX(0) === 55n, 'Sum 1..10 = 55');
    }

    // LDR/STR
    {
        const { regs, mem } = runProgram(`
            MOV X0, #42
            ADR X1, data
            STR X0, [X1]
            MOV X0, #0
            LDR X2, [X1]
            BRK #0
        data:
            .quad 0
        `);
        assert(regs.getX(2) === 42n, 'STR then LDR = 42');
    }

    // BL/RET (function call)
    {
        const { regs } = runProgram(`
            MOV X0, #5
            BL double
            BRK #0
        double:
            ADD X0, X0, X0
            RET
        `);
        assert(regs.getX(0) === 10n, 'BL/RET: double(5) = 10');
    }

    // AND, ORR, EOR
    {
        const { regs } = runProgram(`
            MOV X0, #0xFF
            MOV X1, #0x0F
            AND X2, X0, X1
            ORR X3, X0, X1
            EOR X4, X0, X1
            BRK #0
        `);
        assert(regs.getX(2) === 0x0Fn, 'AND 0xFF & 0x0F = 0x0F');
        assert(regs.getX(3) === 0xFFn, 'ORR 0xFF | 0x0F = 0xFF');
        assert(regs.getX(4) === 0xF0n, 'EOR 0xFF ^ 0x0F = 0xF0');
    }

    // LSL, LSR
    {
        const { regs } = runProgram(`
            MOV X0, #1
            LSL X1, X0, #10
            MOV X2, #1024
            LSR X3, X2, #5
            BRK #0
        `);
        assert(regs.getX(1) === 1024n, 'LSL 1<<10 = 1024');
        assert(regs.getX(3) === 32n, 'LSR 1024>>5 = 32');
    }

    // CSEL
    {
        const { regs } = runProgram(`
            MOV X0, #10
            MOV X1, #20
            CMP X0, X1
            CSEL X2, X0, X1, LT
            BRK #0
        `);
        assert(regs.getX(2) === 10n, 'CSEL picks X0 when LT');
    }

    // Fibonacci
    {
        const { regs } = runProgram(`
            MOV X0, #0
            MOV X1, #1
            MOV X2, #10
        loop:
            CBZ X2, done
            ADD X3, X0, X1
            MOV X0, X1
            MOV X1, X3
            SUB X2, X2, #1
            B loop
        done:
            BRK #0
        `);
        assert(regs.getX(1) === 89n, 'Fibonacci(10) = 89 (X1)');
    }

    // Factorial
    {
        const { regs } = runProgram(`
            MOV X0, #1
            MOV X1, #10
        loop:
            CBZ X1, done
            MUL X0, X0, X1
            SUB X1, X1, #1
            B loop
        done:
            BRK #0
        `);
        assert(regs.getX(0) === 3628800n, '10! = 3628800');
    }

    // W register (32-bit)
    {
        const { regs } = runProgram(`
            MOV W0, #0xFFFF
            ADD W1, W0, #1
            BRK #0
        `);
        assert(regs.getX(0) === 0xFFFFn, 'MOV W0, #0xFFFF');
        assert(regs.getX(1) === 0x10000n, 'ADD W1, W0, #1 = 0x10000');
    }

    // STP/LDP
    {
        const { regs } = runProgram(`
            MOV X0, #111
            MOV X1, #222
            SUB SP, SP, #16
            STP X0, X1, [SP]
            MOV X0, #0
            MOV X1, #0
            LDP X2, X3, [SP]
            ADD SP, SP, #16
            BRK #0
        `);
        assert(regs.getX(2) === 111n, 'STP/LDP first reg = 111');
        assert(regs.getX(3) === 222n, 'STP/LDP second reg = 222');
    }

    // Step back
    {
        const regs = new RegisterFile();
        const mem = new Memory();
        const cpu = new CPU(regs, mem);
        const result = asm.assemble(`
            MOV X0, #10
            MOV X0, #20
            BRK #0
        `);
        cpu.loadProgram(result);
        cpu.step();  // MOV X0, #10
        assert(regs.getX(0) === 10n, 'After step 1: X0=10');
        cpu.step();  // MOV X0, #20
        assert(regs.getX(0) === 20n, 'After step 2: X0=20');
        cpu.stepBack();
        assert(regs.getX(0) === 10n, 'After step back: X0=10');
    }
}
