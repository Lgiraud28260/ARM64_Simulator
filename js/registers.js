// registers.js - ARM64 Register File
import { MASK_64, toHex } from './utils.js';

export class RegisterFile {
    constructor() {
        this.reset();
    }

    reset() {
        // X0-X30 as BigInt
        this.x = new Array(31).fill(0n);
        // Stack pointer
        this.sp = 0n;
        // Program counter
        this.pc = 0n;
        // Condition flags
        this.N = false;
        this.Z = false;
        this.C = false;
        this.V = false;
        // NEON V0-V31: 128-bit registers as {hi, lo} BigInt pairs
        this.v = Array.from({ length: 32 }, () => ({ hi: 0n, lo: 0n }));
    }

    getX(index) {
        if (index === 31) return this.sp;
        if (index < 0 || index > 30) throw new Error(`Invalid register index: ${index}`);
        return this.x[index];
    }

    setX(index, value) {
        value = BigInt(value) & MASK_64;
        if (index === 31) {
            this.sp = value;
            return;
        }
        if (index < 0 || index > 30) throw new Error(`Invalid register index: ${index}`);
        this.x[index] = value;
    }

    // Get 32-bit (W register)
    getW(index) {
        return this.getX(index) & 0xFFFFFFFFn;
    }

    // Set 32-bit (W register) - zero-extends to 64-bit
    setW(index, value) {
        this.setX(index, BigInt(value) & 0xFFFFFFFFn);
    }

    getPC() {
        return this.pc;
    }

    setPC(value) {
        this.pc = BigInt(value) & MASK_64;
    }

    getSP() {
        return this.sp;
    }

    setSP(value) {
        this.sp = BigInt(value) & MASK_64;
    }

    getNZCV() {
        return (this.N ? 8 : 0) | (this.Z ? 4 : 0) | (this.C ? 2 : 0) | (this.V ? 1 : 0);
    }

    setNZCV(value) {
        this.N = !!(value & 8);
        this.Z = !!(value & 4);
        this.C = !!(value & 2);
        this.V = !!(value & 1);
    }

    setFlags64(result) {
        result = BigInt(result) & MASK_64;
        this.N = !!(result & (1n << 63n));
        this.Z = result === 0n;
    }

    setFlags32(result) {
        result = BigInt(result) & 0xFFFFFFFFn;
        this.N = !!(result & (1n << 31n));
        this.Z = result === 0n;
    }

    // --- NEON register access ---

    getV(index) {
        if (index < 0 || index > 31) throw new Error(`Invalid V register index: ${index}`);
        return this.v[index];
    }

    setV(index, hi, lo) {
        if (index < 0 || index > 31) throw new Error(`Invalid V register index: ${index}`);
        this.v[index] = { hi: BigInt(hi) & MASK_64, lo: BigInt(lo) & MASK_64 };
    }

    // Get lower 64 bits (D register view)
    getD(index) {
        return this.v[index].lo;
    }

    setD(index, value) {
        this.v[index] = { hi: 0n, lo: BigInt(value) & MASK_64 };
    }

    // Get lower 32 bits (S register view)
    getS(index) {
        return this.v[index].lo & 0xFFFFFFFFn;
    }

    setS(index, value) {
        this.v[index] = { hi: 0n, lo: BigInt(value) & 0xFFFFFFFFn };
    }

    // Get full 128-bit value as single BigInt
    getV128(index) {
        const v = this.v[index];
        return (v.hi << 64n) | v.lo;
    }

    // Set full 128-bit value from single BigInt
    setV128(index, value) {
        value = BigInt(value);
        const mask128 = (1n << 128n) - 1n;
        value = value & mask128;
        this.v[index] = { hi: (value >> 64n) & MASK_64, lo: value & MASK_64 };
    }

    // Lane width in bits for arrangement specifier
    _laneWidth(arrangement) {
        const ch = arrangement[arrangement.length - 1].toUpperCase();
        switch (ch) {
            case 'B': return 8;
            case 'H': return 16;
            case 'S': return 32;
            case 'D': return 64;
            default: throw new Error(`Invalid arrangement: ${arrangement}`);
        }
    }

    // Number of lanes for arrangement
    laneCount(arrangement) {
        const upper = arrangement.toUpperCase();
        const count = parseInt(upper);
        if (isNaN(count)) throw new Error(`Invalid arrangement: ${arrangement}`);
        return count;
    }

    // Get a lane value from a V register
    getLane(regIdx, arrangement, lane) {
        const width = this._laneWidth(arrangement);
        const bitOffset = BigInt(lane * width);
        const mask = (1n << BigInt(width)) - 1n;
        const full = this.getV128(regIdx);
        return (full >> bitOffset) & mask;
    }

    // Set a lane value in a V register
    setLane(regIdx, arrangement, lane, value) {
        const width = this._laneWidth(arrangement);
        const bitOffset = BigInt(lane * width);
        const mask = (1n << BigInt(width)) - 1n;
        let full = this.getV128(regIdx);
        full = full & ~(mask << bitOffset);
        full = full | ((BigInt(value) & mask) << bitOffset);
        this.setV128(regIdx, full);
    }

    snapshot() {
        return {
            x: [...this.x],
            sp: this.sp,
            pc: this.pc,
            N: this.N,
            Z: this.Z,
            C: this.C,
            V: this.V,
            v: this.v.map(r => ({ hi: r.hi, lo: r.lo }))
        };
    }

    restore(snap) {
        this.x = [...snap.x];
        this.sp = snap.sp;
        this.pc = snap.pc;
        this.N = snap.N;
        this.Z = snap.Z;
        this.C = snap.C;
        this.V = snap.V;
        if (snap.v) {
            this.v = snap.v.map(r => ({ hi: r.hi, lo: r.lo }));
        }
    }

    toString() {
        let lines = [];
        for (let i = 0; i < 31; i++) {
            lines.push(`X${i.toString().padStart(2, '0')}: ${toHex(this.x[i])}`);
        }
        lines.push(`SP:  ${toHex(this.sp)}`);
        lines.push(`PC:  ${toHex(this.pc)}`);
        lines.push(`NZCV: ${this.N?1:0}${this.Z?1:0}${this.C?1:0}${this.V?1:0}`);
        return lines.join('\n');
    }
}
