// virtual-fs.js - Virtual file system for simulated file I/O

export class VirtualFS {
    constructor(memory) {
        this.memory = memory;
        this.files = new Map(); // name → Uint8Array content
        this.fdTable = new Map(); // fd → { name, pos }
        this.nextFd = 3; // 0=stdin, 1=stdout, 2=stderr are reserved
        this.reset();
    }

    reset() {
        this.files.clear();
        this.fdTable.clear();
        this.nextFd = 3;
        // Pre-create a sample file
        this.files.set('hello.txt', new TextEncoder().encode('Hello from virtual FS!\n'));
    }

    open(nameAddr) {
        // Read null-terminated filename from memory
        let name = '';
        for (let i = 0; i < 256; i++) {
            const ch = this.memory.readByte(nameAddr + i);
            if (ch === 0) break;
            name += String.fromCharCode(ch);
        }
        if (!name) return -1;

        // Create file if it doesn't exist
        if (!this.files.has(name)) {
            this.files.set(name, new Uint8Array(0));
        }

        const fd = this.nextFd++;
        this.fdTable.set(fd, { name, pos: 0 });
        return fd;
    }

    read(fd, bufAddr, count) {
        const entry = this.fdTable.get(fd);
        if (!entry) return -1;

        const content = this.files.get(entry.name);
        if (!content) return -1;

        const available = content.length - entry.pos;
        const toRead = Math.min(count, available);

        for (let i = 0; i < toRead; i++) {
            this.memory.writeByte(bufAddr + i, content[entry.pos + i]);
        }
        entry.pos += toRead;
        return toRead;
    }

    write(fd, bufAddr, count) {
        const entry = this.fdTable.get(fd);
        if (!entry) return -1;

        const content = this.files.get(entry.name) || new Uint8Array(0);
        const newSize = Math.max(content.length, entry.pos + count);
        const newContent = new Uint8Array(newSize);
        newContent.set(content);

        for (let i = 0; i < count; i++) {
            newContent[entry.pos + i] = this.memory.readByte(bufAddr + i);
        }
        entry.pos += count;
        this.files.set(entry.name, newContent);
        return count;
    }

    close(fd) {
        if (!this.fdTable.has(fd)) return -1;
        this.fdTable.delete(fd);
        return 0;
    }

    getOpenFiles() {
        return Array.from(this.fdTable.entries()).map(([fd, entry]) => ({
            fd, name: entry.name, pos: entry.pos,
            size: (this.files.get(entry.name) || []).length
        }));
    }

    getFileList() {
        return Array.from(this.files.entries()).map(([name, data]) => ({
            name, size: data.length
        }));
    }
}
