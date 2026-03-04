// memory.js - Flat 68KB byte-addressable memory (little-endian)

export const SEGMENTS = {
    CODE:  { start: 0x10000, size: 0x800,  name: 'Code'  },  // 2KB
    DATA:  { start: 0x10800, size: 0x600,  name: 'Data'  },  // 1.5KB
    STACK: { start: 0x10E00, size: 0x1200, name: 'Stack' },  // 4.5KB (grows down)
};

const MEM_BASE = 0x10000;
const MEM_SIZE = 0x20000; // 128KB total address space, base at 0x10000

export class Memory {
    constructor() {
        this.size = MEM_SIZE;
        this.base = MEM_BASE;
        this.buffer = new ArrayBuffer(this.size);
        this.view = new DataView(this.buffer);
        this.bytes = new Uint8Array(this.buffer);
        this.writeLog = []; // Track writes for undo
    }

    reset() {
        this.bytes.fill(0);
        this.writeLog = [];
    }

    _offset(addr) {
        const off = Number(BigInt(addr)) - this.base;
        if (off < 0 || off >= this.size) {
            throw new Error(`Memory access out of bounds: ${addr.toString(16 || addr)}`);
        }
        return off;
    }

    readByte(addr) {
        return this.view.getUint8(this._offset(addr));
    }

    writeByte(addr, value) {
        const off = this._offset(addr);
        this.view.setUint8(off, value & 0xFF);
    }

    readHalf(addr) {
        return this.view.getUint16(this._offset(addr), true); // little-endian
    }

    writeHalf(addr, value) {
        this.view.setUint16(this._offset(addr), value & 0xFFFF, true);
    }

    readWord(addr) {
        return this.view.getUint32(this._offset(addr), true);
    }

    writeWord(addr, value) {
        this.view.setUint32(this._offset(addr), value >>> 0, true);
    }

    readDoubleWord(addr) {
        const off = this._offset(addr);
        const lo = BigInt(this.view.getUint32(off, true));
        const hi = BigInt(this.view.getUint32(off + 4, true));
        return (hi << 32n) | lo;
    }

    writeDoubleWord(addr, value) {
        const off = this._offset(addr);
        value = BigInt(value);
        this.view.setUint32(off, Number(value & 0xFFFFFFFFn), true);
        this.view.setUint32(off + 4, Number((value >> 32n) & 0xFFFFFFFFn), true);
    }

    // Read signed
    readSignedByte(addr) {
        return this.view.getInt8(this._offset(addr));
    }

    readSignedHalf(addr) {
        return this.view.getInt16(this._offset(addr), true);
    }

    readSignedWord(addr) {
        return this.view.getInt32(this._offset(addr), true);
    }

    // Store 32-bit instruction at address
    storeInstruction(addr, encoding) {
        this.writeWord(addr, encoding);
    }

    // Load 32-bit instruction from address
    fetchInstruction(addr) {
        return this.readWord(addr);
    }

    // Get a range of bytes for display
    getRange(startAddr, length) {
        const result = [];
        for (let i = 0; i < length; i++) {
            try {
                result.push(this.readByte(startAddr + i));
            } catch {
                result.push(0);
            }
        }
        return result;
    }

    // Snapshot for undo - captures bytes that will be modified
    snapshotRange(addr, length) {
        const off = this._offset(addr);
        return {
            addr: Number(addr),
            data: new Uint8Array(this.bytes.slice(off, off + length))
        };
    }

    // Restore a snapshot
    restoreRange(snap) {
        const off = snap.addr - this.base;
        this.bytes.set(snap.data, off);
    }

    // Full snapshot of non-zero memory regions (for undo)
    snapshot() {
        // Just copy the whole buffer - 128KB is small
        return new Uint8Array(this.bytes);
    }

    restore(snap) {
        this.bytes.set(snap);
    }
}
