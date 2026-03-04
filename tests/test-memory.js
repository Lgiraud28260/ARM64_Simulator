// test-memory.js
import { Memory } from '../js/memory.js';

export async function runMemoryTests() {
    section('Memory Tests');
    const mem = new Memory();

    // Byte read/write
    mem.writeByte(0x10000, 0xAB);
    assert(mem.readByte(0x10000) === 0xAB, 'Write/read byte');

    // Half-word (little-endian)
    mem.writeHalf(0x10010, 0x1234);
    assert(mem.readHalf(0x10010) === 0x1234, 'Write/read half-word');
    assert(mem.readByte(0x10010) === 0x34, 'Half-word little-endian low byte');
    assert(mem.readByte(0x10011) === 0x12, 'Half-word little-endian high byte');

    // Word
    mem.writeWord(0x10020, 0xDEADBEEF);
    assert(mem.readWord(0x10020) === 0xDEADBEEF, 'Write/read word');

    // Double word
    mem.writeDoubleWord(0x10030, 0x123456789ABCDEF0n);
    assert(mem.readDoubleWord(0x10030) === 0x123456789ABCDEF0n, 'Write/read double word');

    // Signed reads
    mem.writeByte(0x10040, 0x80);
    assert(mem.readSignedByte(0x10040) === -128, 'Read signed byte');

    mem.writeHalf(0x10050, 0x8000);
    assert(mem.readSignedHalf(0x10050) === -32768, 'Read signed half');

    // Out of bounds
    try {
        mem.readByte(0x00000);
        assert(false, 'Should throw on out-of-bounds read');
    } catch (e) {
        assert(true, 'Throws on out-of-bounds read');
    }

    // Snapshot/restore
    mem.writeByte(0x10060, 0x42);
    const snap = mem.snapshot();
    mem.writeByte(0x10060, 0x99);
    assert(mem.readByte(0x10060) === 0x99, 'Value changed after snapshot');
    mem.restore(snap);
    assert(mem.readByte(0x10060) === 0x42, 'Value restored from snapshot');
}
