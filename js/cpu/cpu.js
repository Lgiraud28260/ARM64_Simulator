// cpu.js - Fetch-decode-execute cycle
import { decode, DecodeError } from './decoder.js';
import { Executor, ExecutionError } from './executor.js';
import { History } from '../history.js';
import { SEGMENTS } from '../memory.js';
import { i18n } from '../i18n.js';

export class CPU {
    constructor(registers, memory) {
        this.registers = registers;
        this.memory = memory;
        this.executor = new Executor(registers, memory);
        this.history = new History();
        this.running = false;
        this.halted = false;
        this.error = null;
        this.stepCount = 0;
        this.maxSteps = 100000; // Infinite loop protection
        this.onStep = null;    // Callback after each step
        this.onHalt = null;    // Callback on halt
        this.onError = null;   // Callback on error
        this.speed = 10;       // Steps per second during run
        this.runTimer = null;
        this.instructionCount = 0;
        this.breakpoints = new Set(); // GUI breakpoint addresses
    }

    reset() {
        this.registers.reset();
        this.memory.reset();
        this.history.clear();
        this.running = false;
        this.halted = false;
        this.error = null;
        this.stepCount = 0;
        this.instructionCount = 0;
        this.executor.halted = false;
        this.executor.breakpoint = false;
        if (this.runTimer) {
            clearTimeout(this.runTimer);
            this.runTimer = null;
        }
    }

    loadProgram(assemblerResult) {
        // Reset memory and state but keep settings
        this.registers.reset();
        this.history.clear();
        this.halted = false;
        this.error = null;
        this.stepCount = 0;
        this.instructionCount = 0;
        this.executor.halted = false;
        this.executor.breakpoint = false;

        // Set PC to code segment start
        this.registers.setPC(BigInt(SEGMENTS.CODE.start));

        // Set SP to top of stack segment
        this.registers.setSP(BigInt(SEGMENTS.STACK.start + SEGMENTS.STACK.size));

        // Store instructions in memory
        for (const instr of assemblerResult.instructions) {
            this.memory.storeInstruction(instr.address, instr.encoding);
        }

        // Store data segments
        for (const seg of assemblerResult.dataSegments) {
            for (let i = 0; i < seg.bytes.length; i++) {
                this.memory.writeByte(seg.address + i, seg.bytes[i]);
            }
        }

        this.instructionCount = assemblerResult.instructions.length;
    }

    step() {
        if (this.halted) return false;

        const pc = Number(this.registers.getPC());

        // Check if PC is beyond code
        const codeEnd = SEGMENTS.CODE.start + this.instructionCount * 4;
        if (pc >= codeEnd || pc < SEGMENTS.CODE.start) {
            this.halted = true;
            if (this.onHalt) this.onHalt(i18n.t('endOfProgram'));
            return false;
        }

        // GUI breakpoint: stop before executing if in run mode
        if (this.running && this.breakpoints.has(pc)) {
            this.running = false;
            if (this.onHalt) this.onHalt('Breakpoint hit (line)');
            return false;
        }

        // Save state for undo
        const regSnap = this.registers.snapshot();
        const memSnap = this.memory.snapshot();
        this.history.push(regSnap, memSnap);

        try {
            // Fetch
            const encoding = this.memory.fetchInstruction(pc);

            // Decode
            const decoded = decode(encoding);

            // Execute
            const pcModified = this.executor.execute(decoded, pc);

            // Check for halt
            if (this.executor.halted) {
                this.halted = true;
                if (this.onHalt) this.onHalt(i18n.t('haltedSVC'));
                return false;
            }

            // Check for breakpoint
            if (this.executor.breakpoint) {
                this.executor.breakpoint = false;
                this.running = false;
                if (this.onHalt) this.onHalt(i18n.t('breakpointHit'));
                return false;
            }

            // Advance PC if not modified by instruction
            if (!pcModified) {
                this.registers.setPC(BigInt(pc + 4));
            }

            this.stepCount++;

            if (this.onStep) this.onStep(this.stepCount);

            return true;
        } catch (e) {
            this.error = e.message;
            this.halted = true;
            if (this.onError) this.onError(e.message);
            return false;
        }
    }

    stepBack() {
        const snap = this.history.pop();
        if (!snap) return false;

        this.registers.restore(snap.registers);
        this.memory.restore(snap.memory);
        this.halted = false;
        this.error = null;
        this.executor.halted = false;
        this.stepCount--;

        if (this.onStep) this.onStep(this.stepCount);
        return true;
    }

    run() {
        if (this.running) return;
        this.running = true;

        const runStep = () => {
            if (!this.running) return;

            const stepsPerBatch = Math.max(1, Math.floor(this.speed / 10));
            for (let i = 0; i < stepsPerBatch; i++) {
                if (!this.step()) {
                    this.running = false;
                    return;
                }
                if (this.stepCount >= this.maxSteps) {
                    this.running = false;
                    this.error = i18n.t('maxSteps');
                    if (this.onError) this.onError(this.error);
                    return;
                }
            }

            const delay = this.speed >= 1000 ? 0 : Math.floor(1000 / this.speed);
            this.runTimer = setTimeout(runStep, delay);
        };

        runStep();
    }

    stop() {
        this.running = false;
        if (this.runTimer) {
            clearTimeout(this.runTimer);
            this.runTimer = null;
        }
    }

    setConsoleOutput(callback) {
        this.executor.consoleOutput = callback;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    setBreakpoints(addressSet) {
        this.breakpoints = addressSet;
    }
}
