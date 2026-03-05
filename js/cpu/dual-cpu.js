// dual-cpu.js - Dual-core coordinator with shared memory
import { RegisterFile } from '../registers.js';
import { SEGMENTS } from '../memory.js';
import { CPU } from './cpu.js';

// CPU1 code starts at second half of CODE segment
const CPU1_CODE_OFFSET = 0x400; // 1KB offset within 2KB code segment

export class DualCPU {
    constructor(memory) {
        this.memory = memory;
        this.registers0 = new RegisterFile();
        this.registers1 = new RegisterFile();
        this.cpu0 = new CPU(this.registers0, memory);
        this.cpu1 = new CPU(this.registers1, memory);
        this.activeCPU = 0; // 0 or 1, round-robin
        this.accessLog = []; // { cpu, addr, type, step }
        this.conflicts = [];  // race condition detections
        this.stepCount = 0;
        this.running = false;
        this.halted = false;
        this.runTimer = null;
        this.speed = 10;

        // Callbacks
        this.onStep = null;
        this.onHalt = null;
        this.onError = null;
        this.onConflict = null;

        // Track per-step memory accesses for conflict detection
        this._stepAccesses = { 0: [], 1: [] };
    }

    reset() {
        this.cpu0.reset();
        this.cpu1.reset();
        this.activeCPU = 0;
        this.accessLog = [];
        this.conflicts = [];
        this.stepCount = 0;
        this.running = false;
        this.halted = false;
        this._stepAccesses = { 0: [], 1: [] };
        if (this.runTimer) {
            clearTimeout(this.runTimer);
            this.runTimer = null;
        }
    }

    loadPrograms(asm0, asm1) {
        this.reset();
        // CPU0 loads normally at CODE start
        this.cpu0.loadProgram(asm0);

        // CPU1 loads with offset: relocate instructions and data
        const offset = CPU1_CODE_OFFSET;
        const relocated1 = {
            instructions: asm1.instructions.map(i => ({
                ...i, address: i.address + offset
            })),
            dataSegments: asm1.dataSegments.map(s => ({
                ...s, address: s.address + offset
            })),
            sourceMap: {},
            errors: []
        };
        for (const [addr, line] of Object.entries(asm1.sourceMap)) {
            relocated1.sourceMap[Number(addr) + offset] = line;
        }
        // Store CPU1 instructions in memory manually
        for (const instr of relocated1.instructions) {
            this.memory.storeInstruction(instr.address, instr.encoding);
        }
        for (const seg of relocated1.dataSegments) {
            for (let i = 0; i < seg.bytes.length; i++) {
                this.memory.writeByte(seg.address + i, seg.bytes[i]);
            }
        }
        // Set CPU1's PC and SP
        this.registers1.setPC(BigInt(SEGMENTS.CODE.start + offset));
        this.registers1.setSP(BigInt(SEGMENTS.STACK.start + SEGMENTS.STACK.size));
        this.cpu1.instructionCount = asm1.instructions.length;

        this.halted = false;
    }

    setConsoleOutput(callback) {
        this.cpu0.setConsoleOutput((text) => callback(`[CPU0] ${text}`));
        this.cpu1.setConsoleOutput((text) => callback(`[CPU1] ${text}`));
    }

    step() {
        if (this.halted) return false;

        const cpu = this.activeCPU === 0 ? this.cpu0 : this.cpu1;
        const cpuId = this.activeCPU;

        // Install memory access tracking
        const prevHook = this.memory.onAccess;
        this.memory.onAccess = (addr, size, isWrite) => {
            const entry = { cpu: cpuId, addr: Number(addr), type: isWrite ? 'W' : 'R', step: this.stepCount };
            this.accessLog.push(entry);
            if (this.accessLog.length > 200) this.accessLog.shift();
            this._stepAccesses[cpuId].push(entry);
            if (prevHook) prevHook(addr, size, isWrite);
        };

        const success = cpu.step();
        this.memory.onAccess = prevHook;

        if (!success) {
            // Check if both CPUs are halted
            if (this.cpu0.halted && this.cpu1.halted) {
                this.halted = true;
                if (this.onHalt) this.onHalt('Both CPUs halted');
                return false;
            }
        }

        // Detect conflicts after each pair of steps
        if (this.activeCPU === 1) {
            this._detectConflicts();
            this._stepAccesses = { 0: [], 1: [] };
        }

        // Round-robin: alternate
        this.activeCPU = 1 - this.activeCPU;

        // Skip halted CPU
        if (this.activeCPU === 0 && this.cpu0.halted) this.activeCPU = 1;
        if (this.activeCPU === 1 && this.cpu1.halted) this.activeCPU = 0;

        this.stepCount++;
        if (this.onStep) this.onStep(this.stepCount);
        return true;
    }

    _detectConflicts() {
        const a0 = this._stepAccesses[0];
        const a1 = this._stepAccesses[1];

        for (const acc0 of a0) {
            for (const acc1 of a1) {
                // Same address, at least one write
                if (acc0.addr === acc1.addr && (acc0.type === 'W' || acc1.type === 'W')) {
                    const conflict = {
                        addr: acc0.addr,
                        cpu0: acc0.type,
                        cpu1: acc1.type,
                        step: this.stepCount
                    };
                    this.conflicts.push(conflict);
                    if (this.onConflict) this.onConflict(conflict);
                }
            }
        }
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
                if (this.stepCount >= 100000) {
                    this.running = false;
                    if (this.onError) this.onError('Max steps exceeded');
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

    setSpeed(speed) {
        this.speed = speed;
    }

    getAccessLog() {
        return this.accessLog.slice(-50);
    }

    getConflicts() {
        return this.conflicts;
    }
}
