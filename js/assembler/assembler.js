// assembler.js - 2-pass assembler: label resolution + encoding
import { Lexer } from './lexer.js';
import { Parser, ParseError } from './parser.js';
import { Encoder, EncodeError } from './encoder.js';
import { SEGMENTS } from '../memory.js';

export class AssemblerError extends Error {
    constructor(message, line) {
        super(message);
        this.line = line;
    }
}

export class AssemblerResult {
    constructor() {
        this.instructions = [];  // { address, encoding, source, line }
        this.dataSegments = [];  // { address, bytes }
        this.errors = [];
        this.labels = {};
        this.sourceMap = {};     // address -> source line number
    }
}

export class Assembler {
    constructor() {
        this.lexer = new Lexer();
        this.parser = new Parser();
        this.encoder = new Encoder();
    }

    assemble(source) {
        const result = new AssemblerResult();

        // Tokenize
        let tokens;
        try {
            tokens = this.lexer.tokenize(source);
        } catch (e) {
            result.errors.push({ message: e.message, line: e.line || 0 });
            return result;
        }

        // Parse
        let ast;
        try {
            ast = this.parser.parse(tokens);
        } catch (e) {
            result.errors.push({ message: e.message, line: e.line || 0 });
            return result;
        }

        // Pass 1: Assign addresses and resolve labels
        const codeBase = SEGMENTS.CODE.start;
        const labels = {};

        // First, process equates
        for (const [name, value] of Object.entries(ast.equates)) {
            labels[name] = typeof value === 'string' ? 0 : value;
        }

        // Assign addresses to instructions
        let addr = codeBase;
        for (let i = 0; i < ast.instructions.length; i++) {
            ast.instructions[i].address = addr;
            addr += 4; // Each ARM64 instruction is 4 bytes
        }

        // Resolve labels and place data directives
        // Labels pointing to instructions get the instruction address.
        // Labels pointing past the last instruction (trailing data) need
        // to be resolved together with directives in source-line order,
        // so that inline data (.asciz etc.) is placed right after code.

        const instrCount = ast.instructions.length;

        // Resolve labels that point to actual instructions
        for (const [name, info] of Object.entries(ast.labels)) {
            if (info.index < instrCount) {
                labels[name] = ast.instructions[info.index].address;
            }
            // Trailing labels resolved below
        }

        // Collect trailing labels and all directives, sort by line number
        const trailingItems = [];

        for (const [name, info] of Object.entries(ast.labels)) {
            if (info.index >= instrCount) {
                trailingItems.push({ kind: 'label', name, line: info.line });
            }
        }

        for (const dir of ast.directives) {
            trailingItems.push({ kind: 'directive', dir, line: dir.line });
        }

        trailingItems.sort((a, b) => a.line - b.line);

        // Walk through trailing items, placing data after code
        let inlineAddr = addr; // continues after last instruction
        for (const item of trailingItems) {
            if (item.kind === 'label') {
                labels[item.name] = inlineAddr;
            } else {
                const dir = item.dir;
                const bytes = this._directiveToBytes(dir, labels);
                result.dataSegments.push({ address: inlineAddr, bytes });
                inlineAddr += bytes.length;
            }
        }

        result.labels = labels;

        // Pass 2: Encode instructions
        const sourceLines = source.split('\n');
        for (const instr of ast.instructions) {
            try {
                const encoding = this.encoder.encode(instr, instr.address, labels);
                result.instructions.push({
                    address: instr.address,
                    encoding: encoding >>> 0, // ensure unsigned 32-bit
                    source: sourceLines[instr.line - 1] || '',
                    line: instr.line,
                    mnemonic: instr.mnemonic
                });
                result.sourceMap[instr.address] = instr.line;
            } catch (e) {
                result.errors.push({
                    message: e.message,
                    line: instr.line
                });
            }
        }

        return result;
    }

    _directiveToBytes(dir, labels) {
        const bytes = [];
        switch (dir.type) {
            case '.byte':
                for (const v of dir.values) {
                    bytes.push((typeof v === 'string' ? (labels[v] || 0) : v) & 0xFF);
                }
                break;
            case '.hword':
                for (const v of dir.values) {
                    const val = typeof v === 'string' ? (labels[v] || 0) : v;
                    bytes.push(val & 0xFF, (val >> 8) & 0xFF);
                }
                break;
            case '.word':
                for (const v of dir.values) {
                    const val = typeof v === 'string' ? (labels[v] || 0) : v;
                    bytes.push(val & 0xFF, (val >> 8) & 0xFF, (val >> 16) & 0xFF, (val >> 24) & 0xFF);
                }
                break;
            case '.quad':
                for (const v of dir.values) {
                    let rem = typeof v === 'string' ? (labels[v] || 0) : v;
                    if (rem < 0) rem += 2 ** 64;
                    for (let b = 0; b < 8; b++) {
                        bytes.push(rem & 0xFF);
                        rem = Math.floor(rem / 256);
                    }
                }
                break;
            case '.ascii': case '.asciz': case '.string':
                for (const ch of dir.value) bytes.push(ch.charCodeAt(0));
                if (dir.type === '.asciz' || dir.type === '.string') bytes.push(0);
                break;
        }
        return bytes;
    }
}
