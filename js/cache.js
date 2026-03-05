// cache.js - L1 Cache Simulator (direct-mapped or N-way set-associative)

export class CacheSimulator {
    constructor() {
        this.cacheSize = 256;     // bytes
        this.lineSize = 16;       // bytes per line
        this.associativity = 1;   // 1=direct-mapped, 2/4-way
        this.enabled = true;
        this.reset();
    }

    configure(cacheSize, lineSize, associativity) {
        this.cacheSize = cacheSize;
        this.lineSize = lineSize;
        this.associativity = associativity;
        this.reset();
    }

    reset() {
        this.numSets = Math.floor(this.cacheSize / (this.lineSize * this.associativity));
        this.sets = [];
        for (let i = 0; i < this.numSets; i++) {
            const ways = [];
            for (let w = 0; w < this.associativity; w++) {
                ways.push({ valid: false, tag: 0, lastUsed: 0 });
            }
            this.sets.push(ways);
        }
        this.hits = 0;
        this.misses = 0;
        this.accessLog = [];
        this.accessCounter = 0;
    }

    access(addr, isWrite) {
        if (!this.enabled) return null;

        const numAddr = Number(typeof addr === 'bigint' ? addr : BigInt(addr));
        const offsetBits = Math.log2(this.lineSize);
        const setBits = Math.log2(this.numSets);
        const setIndex = (numAddr >> offsetBits) & ((1 << setBits) - 1);
        const tag = numAddr >> (offsetBits + setBits);

        const set = this.sets[setIndex];
        this.accessCounter++;

        // Check for hit
        for (const way of set) {
            if (way.valid && way.tag === tag) {
                this.hits++;
                way.lastUsed = this.accessCounter;
                const entry = {
                    addr: numAddr, hit: true, set: setIndex, tag,
                    isWrite, step: this.accessCounter
                };
                this._log(entry);
                return entry;
            }
        }

        // Miss - find victim (LRU)
        this.misses++;
        let victim = set[0];
        for (const way of set) {
            if (!way.valid) { victim = way; break; }
            if (way.lastUsed < victim.lastUsed) victim = way;
        }
        victim.valid = true;
        victim.tag = tag;
        victim.lastUsed = this.accessCounter;

        const entry = {
            addr: numAddr, hit: false, set: setIndex, tag,
            isWrite, step: this.accessCounter
        };
        this._log(entry);
        return entry;
    }

    _log(entry) {
        this.accessLog.push(entry);
        if (this.accessLog.length > 100) this.accessLog.shift();
    }

    getHitRate() {
        const total = this.hits + this.misses;
        return total === 0 ? 0 : (this.hits / total * 100);
    }

    getLines() {
        const result = [];
        for (let s = 0; s < this.numSets; s++) {
            for (let w = 0; w < this.associativity; w++) {
                const way = this.sets[s][w];
                result.push({
                    set: s, way: w,
                    valid: way.valid, tag: way.tag,
                    lastUsed: way.lastUsed
                });
            }
        }
        return result;
    }

    getStats() {
        return {
            hits: this.hits,
            misses: this.misses,
            total: this.hits + this.misses,
            hitRate: this.getHitRate()
        };
    }
}
