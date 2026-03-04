// history.js - Delta-based state snapshots for step-back

export class History {
    constructor(maxSnapshots = 1000) {
        this.snapshots = [];
        this.maxSnapshots = maxSnapshots;
    }

    push(registerSnap, memorySnap) {
        if (this.snapshots.length >= this.maxSnapshots) {
            this.snapshots.shift();
        }
        this.snapshots.push({ registers: registerSnap, memory: memorySnap });
    }

    pop() {
        return this.snapshots.pop() || null;
    }

    clear() {
        this.snapshots = [];
    }

    get length() {
        return this.snapshots.length;
    }
}
