// heap.js - Simple free-list heap allocator (first-fit)
import { SEGMENTS } from './memory.js';

const HEADER_SIZE = 8; // 8-byte header: [size(4) | flags(4)]
const ALIGN = 8;

export class Heap {
    constructor(memory) {
        this.memory = memory;
        this.base = SEGMENTS.HEAP.start;
        this.size = SEGMENTS.HEAP.size;
        this.reset();
    }

    reset() {
        // Initialize single free block spanning entire heap
        this.freeList = [{ addr: this.base, size: this.size }];
        this.allocations = new Map(); // addr → size (user-visible)
    }

    malloc(requestSize) {
        if (requestSize <= 0) return 0;
        const totalSize = this._align(requestSize + HEADER_SIZE);

        // First-fit search
        for (let i = 0; i < this.freeList.length; i++) {
            const block = this.freeList[i];
            if (block.size >= totalSize) {
                const userAddr = block.addr + HEADER_SIZE;

                // Write header: total block size
                this.memory.writeWord(block.addr, totalSize);

                // Shrink or remove free block
                if (block.size - totalSize >= HEADER_SIZE + ALIGN) {
                    block.addr += totalSize;
                    block.size -= totalSize;
                } else {
                    this.freeList.splice(i, 1);
                }

                this.allocations.set(userAddr, totalSize);
                return userAddr;
            }
        }
        return 0; // Out of memory
    }

    free(userAddr) {
        const totalSize = this.allocations.get(userAddr);
        if (!totalSize) return false;

        this.allocations.delete(userAddr);
        const blockAddr = userAddr - HEADER_SIZE;

        // Add back to free list, keeping sorted by address
        const newBlock = { addr: blockAddr, size: totalSize };
        let inserted = false;
        for (let i = 0; i < this.freeList.length; i++) {
            if (this.freeList[i].addr > blockAddr) {
                this.freeList.splice(i, 0, newBlock);
                inserted = true;
                break;
            }
        }
        if (!inserted) this.freeList.push(newBlock);

        // Coalesce adjacent free blocks
        this._coalesce();
        return true;
    }

    _coalesce() {
        for (let i = 0; i < this.freeList.length - 1; ) {
            const curr = this.freeList[i];
            const next = this.freeList[i + 1];
            if (curr.addr + curr.size === next.addr) {
                curr.size += next.size;
                this.freeList.splice(i + 1, 1);
            } else {
                i++;
            }
        }
    }

    _align(size) {
        return Math.ceil(size / ALIGN) * ALIGN;
    }

    getAllocations() {
        return Array.from(this.allocations.entries()).map(([addr, size]) => ({
            addr, size: size - HEADER_SIZE
        }));
    }
}
