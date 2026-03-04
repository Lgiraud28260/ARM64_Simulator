// lexer.js - ARM64 Assembly Tokenizer

export const TokenType = {
    MNEMONIC: 'MNEMONIC',
    REGISTER: 'REGISTER',
    VECTOR_REGISTER: 'VECTOR_REGISTER',
    IMMEDIATE: 'IMMEDIATE',
    LABEL_DEF: 'LABEL_DEF',
    LABEL_REF: 'LABEL_REF',
    COMMA: 'COMMA',
    LBRACKET: 'LBRACKET',
    RBRACKET: 'RBRACKET',
    LBRACE: 'LBRACE',
    RBRACE: 'RBRACE',
    EXCL: 'EXCL',       // ! for pre-index
    HASH: 'HASH',
    SHIFT: 'SHIFT',     // LSL, LSR, ASR, ROR
    EXTEND: 'EXTEND',   // UXTB, UXTH, UXTW, UXTX, SXTB, SXTH, SXTW, SXTX
    DIRECTIVE: 'DIRECTIVE',
    STRING: 'STRING',
    NEWLINE: 'NEWLINE',
    EOF: 'EOF',
    CONDITION: 'CONDITION',
    DOT: 'DOT',
};

const MNEMONICS = new Set([
    // Data processing
    'MOV', 'MOVZ', 'MOVK', 'MOVN',
    'ADD', 'ADDS', 'SUB', 'SUBS',
    'MUL', 'SDIV', 'UDIV', 'MADD', 'MSUB',
    'AND', 'ANDS', 'ORR', 'EOR', 'BIC', 'ORN', 'EON', 'BICS',
    'LSL', 'LSR', 'ASR', 'ROR',
    'NEG', 'NEGS', 'MVN',
    'ADC', 'ADCS', 'SBC', 'SBCS',
    'CMP', 'CMN', 'TST',
    // Memory
    'LDR', 'STR', 'LDRB', 'STRB', 'LDRH', 'STRH', 'LDRSB', 'LDRSH', 'LDRSW', 'LDRW', 'STRW',
    'LDP', 'STP',
    // Branch
    'B', 'BL', 'BR', 'BLR', 'RET',
    'CBZ', 'CBNZ', 'TBZ', 'TBNZ',
    // Conditional
    'CSEL', 'CSINC', 'CSINV', 'CSNEG', 'CSET', 'CSETM', 'CINC', 'CINV', 'CNEG',
    // System
    'SVC', 'NOP', 'BRK',
    'ADR', 'ADRP',
    'MSR', 'MRS',
    // NEON/SIMD
    'LD1', 'ST1',
    'DUP', 'INS', 'UMOV', 'MOVI',
    'ADDV',
    'CMEQ', 'CMGT', 'CMGE',
    'FADD', 'FSUB', 'FMUL', 'FDIV',
    'NOT',
]);

const CONDITIONS = new Set([
    'EQ', 'NE', 'CS', 'HS', 'CC', 'LO', 'MI', 'PL',
    'VS', 'VC', 'HI', 'LS', 'GE', 'LT', 'GT', 'LE', 'AL', 'NV'
]);

const SHIFTS = new Set(['LSL', 'LSR', 'ASR', 'ROR']);
const EXTENDS = new Set(['UXTB', 'UXTH', 'UXTW', 'UXTX', 'SXTB', 'SXTH', 'SXTW', 'SXTX']);

const DIRECTIVES = new Set(['.text', '.data', '.global', '.globl', '.byte', '.hword', '.word', '.quad', '.ascii', '.asciz', '.string', '.align', '.balign', '.skip', '.space', '.equ', '.set']);

export class Token {
    constructor(type, value, line, col) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.col = col;
    }
}

export class Lexer {
    tokenize(source) {
        const lines = source.split('\n');
        const tokens = [];

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const lineTokens = this.tokenizeLine(lines[lineNum], lineNum + 1);
            tokens.push(...lineTokens);
            tokens.push(new Token(TokenType.NEWLINE, '\\n', lineNum + 1, lines[lineNum].length));
        }

        tokens.push(new Token(TokenType.EOF, '', lines.length, 0));
        return tokens;
    }

    tokenizeLine(line, lineNum) {
        const tokens = [];
        let i = 0;

        while (i < line.length) {
            // Skip whitespace
            if (line[i] === ' ' || line[i] === '\t') {
                i++;
                continue;
            }

            // Comment
            if (line[i] === '/' && line[i + 1] === '/') break;
            if (line[i] === ';') break;

            const col = i;

            // String literal
            if (line[i] === '"') {
                let str = '';
                i++; // skip opening quote
                while (i < line.length && line[i] !== '"') {
                    if (line[i] === '\\' && i + 1 < line.length) {
                        i++;
                        switch (line[i]) {
                            case 'n': str += '\n'; break;
                            case 't': str += '\t'; break;
                            case '\\': str += '\\'; break;
                            case '"': str += '"'; break;
                            case '0': str += '\0'; break;
                            default: str += line[i];
                        }
                    } else {
                        str += line[i];
                    }
                    i++;
                }
                i++; // skip closing quote
                tokens.push(new Token(TokenType.STRING, str, lineNum, col));
                continue;
            }

            // Punctuation
            if (line[i] === ',') { tokens.push(new Token(TokenType.COMMA, ',', lineNum, col)); i++; continue; }
            if (line[i] === '[') { tokens.push(new Token(TokenType.LBRACKET, '[', lineNum, col)); i++; continue; }
            if (line[i] === ']') { tokens.push(new Token(TokenType.RBRACKET, ']', lineNum, col)); i++; continue; }
            if (line[i] === '!') { tokens.push(new Token(TokenType.EXCL, '!', lineNum, col)); i++; continue; }
            if (line[i] === '#') { tokens.push(new Token(TokenType.HASH, '#', lineNum, col)); i++; continue; }
            if (line[i] === '{') { tokens.push(new Token(TokenType.LBRACE, '{', lineNum, col)); i++; continue; }
            if (line[i] === '}') { tokens.push(new Token(TokenType.RBRACE, '}', lineNum, col)); i++; continue; }

            // Directive or dot-prefixed label
            if (line[i] === '.') {
                let word = '.';
                i++;
                while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
                    word += line[i];
                    i++;
                }
                // Check if it's a label definition (followed by ':')
                if (i < line.length && line[i] === ':') {
                    i++; // consume ':'
                    tokens.push(new Token(TokenType.LABEL_DEF, word, lineNum, col));
                    continue;
                }
                // Check if it's a known directive
                if (DIRECTIVES.has(word.toLowerCase())) {
                    tokens.push(new Token(TokenType.DIRECTIVE, word.toLowerCase(), lineNum, col));
                } else {
                    // Treat as label reference (e.g., .loop, .done)
                    tokens.push(new Token(TokenType.LABEL_REF, word, lineNum, col));
                }
                continue;
            }

            // Number (immediate)
            if (line[i] === '-' && i + 1 < line.length && /[0-9]/.test(line[i + 1])) {
                let num = '-';
                i++;
                num += this.readNumber(line, i);
                i += num.length - 1;
                tokens.push(new Token(TokenType.IMMEDIATE, num, lineNum, col));
                continue;
            }

            if (/[0-9]/.test(line[i])) {
                const num = this.readNumber(line, i);
                i += num.length;
                tokens.push(new Token(TokenType.IMMEDIATE, num, lineNum, col));
                continue;
            }

            // Identifier (register, mnemonic, label, condition)
            if (/[a-zA-Z_]/.test(line[i])) {
                let word = '';
                while (i < line.length && /[a-zA-Z0-9_.]/.test(line[i])) {
                    word += line[i];
                    i++;
                }

                // Check for label definition
                if (i < line.length && line[i] === ':') {
                    i++; // consume ':'
                    tokens.push(new Token(TokenType.LABEL_DEF, word, lineNum, col));
                    continue;
                }

                const upper = word.toUpperCase();

                // B.cond special handling
                if (upper === 'B' && i < line.length && line[i] === '.') {
                    // This is a conditional branch like B.EQ
                    // The dot was consumed as part of the word (since we allow dots in identifiers)
                    // Actually let's handle B.XX as a mnemonic
                    i++; // consume '.'
                    let cond = '';
                    while (i < line.length && /[a-zA-Z]/.test(line[i])) {
                        cond += line[i];
                        i++;
                    }
                    tokens.push(new Token(TokenType.MNEMONIC, 'B.' + cond.toUpperCase(), lineNum, col));
                    continue;
                }

                // Check mnemonic with condition suffix for B.cond already in word (e.g. "B.EQ" as one token)
                if (upper.startsWith('B.') && CONDITIONS.has(upper.substring(2))) {
                    tokens.push(new Token(TokenType.MNEMONIC, upper, lineNum, col));
                    continue;
                }

                // Vector register: V0-V31 with optional .arrangement and [index]
                // word may contain dot (e.g., V0.4S) since identifier regex allows dots
                const vecMatchFull = upper.match(/^V(\d+)\.((?:\d+)?[BDHSQ])$/);
                const vecMatchPlain = upper.match(/^V(\d+)$/);
                if (vecMatchFull || vecMatchPlain) {
                    const vIdx = parseInt(vecMatchFull ? vecMatchFull[1] : vecMatchPlain[1]);
                    if (vIdx >= 0 && vIdx <= 31) {
                        let arrangement = vecMatchFull ? vecMatchFull[2].toUpperCase() : null;
                        let elemIndex = null;
                        // If plain V0, check for .arrangement after the word
                        if (!vecMatchFull && i < line.length && line[i] === '.') {
                            i++; // consume '.'
                            let arr = '';
                            while (i < line.length && /[a-zA-Z0-9]/.test(line[i])) {
                                arr += line[i];
                                i++;
                            }
                            arrangement = arr.toUpperCase();
                        }
                        // Check for [index] (e.g., V0.S[2])
                        if (i < line.length && line[i] === '[') {
                            i++; // consume '['
                            let idx = '';
                            while (i < line.length && /[0-9]/.test(line[i])) {
                                idx += line[i];
                                i++;
                            }
                            if (i < line.length && line[i] === ']') {
                                i++; // consume ']'
                            }
                            elemIndex = parseInt(idx);
                        }
                        tokens.push(new Token(TokenType.VECTOR_REGISTER, {
                            reg: `V${vIdx}`,
                            index: vIdx,
                            arrangement: arrangement,
                            elemIndex: elemIndex
                        }, lineNum, col));
                        continue;
                    }
                }

                // Scalar NEON sub-register aliases: Q0-Q31, D0-D31, S0-S31, H0-H31, B0-B31
                const scalarVecMatch = upper.match(/^([QDHSB])(\d+)$/);
                if (scalarVecMatch) {
                    const scType = scalarVecMatch[1];
                    const scIdx = parseInt(scalarVecMatch[2]);
                    // Avoid collision with B (branch) mnemonic and other B-prefixed mnemonics
                    const isBMnemonic = scType === 'B' && /^(BIC|BICS|BL|BLR|BR|BRK|BFM)$/.test(upper);
                    if (!isBMnemonic && scIdx >= 0 && scIdx <= 31) {
                        // Check for [index] after scalar name (e.g., V0.S[2] already handled above,
                        // but S4[0] style might appear)
                        let elemIndex = null;
                        if (i < line.length && line[i] === '[') {
                            i++;
                            let idx = '';
                            while (i < line.length && /[0-9]/.test(line[i])) {
                                idx += line[i];
                                i++;
                            }
                            if (i < line.length && line[i] === ']') i++;
                            elemIndex = parseInt(idx);
                        }
                        tokens.push(new Token(TokenType.VECTOR_REGISTER, {
                            reg: `V${scIdx}`,
                            index: scIdx,
                            arrangement: null,
                            elemIndex: elemIndex,
                            scalar: scType
                        }, lineNum, col));
                        continue;
                    }
                }

                // Register
                if (/^[XxWw]([0-9]|[12][0-9]|30)$/.test(word) ||
                    upper === 'SP' || upper === 'XZR' || upper === 'WZR' ||
                    upper === 'LR' || upper === 'FP' ||
                    upper === 'NZCV') {
                    tokens.push(new Token(TokenType.REGISTER, upper, lineNum, col));
                    continue;
                }

                // Shift keyword
                if (SHIFTS.has(upper) && tokens.length > 0 &&
                    tokens[tokens.length - 1].type !== TokenType.NEWLINE) {
                    // Could be a shift modifier or an instruction
                    // If we already have a mnemonic on this line, it's a shift modifier
                    const hasMnemonic = tokens.some(t =>
                        t.type === TokenType.MNEMONIC && t.line === lineNum);
                    if (hasMnemonic) {
                        tokens.push(new Token(TokenType.SHIFT, upper, lineNum, col));
                        continue;
                    }
                }

                // Extend keyword
                if (EXTENDS.has(upper)) {
                    tokens.push(new Token(TokenType.EXTEND, upper, lineNum, col));
                    continue;
                }

                // Mnemonic
                if (MNEMONICS.has(upper)) {
                    tokens.push(new Token(TokenType.MNEMONIC, upper, lineNum, col));
                    continue;
                }

                // Condition (when used as operand, e.g., in CSEL)
                // Store upper for condition value, but keep original for potential label use
                if (CONDITIONS.has(upper)) {
                    tokens.push(new Token(TokenType.CONDITION, upper, lineNum, col));
                    tokens[tokens.length - 1].originalValue = word;
                    continue;
                }

                // Otherwise it's a label reference
                tokens.push(new Token(TokenType.LABEL_REF, word, lineNum, col));
                continue;
            }

            // Skip unknown character
            i++;
        }

        return tokens;
    }

    readNumber(line, start) {
        let i = start;
        if (line[i] === '0' && i + 1 < line.length && (line[i + 1] === 'x' || line[i + 1] === 'X')) {
            i += 2;
            while (i < line.length && /[0-9a-fA-F]/.test(line[i])) i++;
        } else if (line[i] === '0' && i + 1 < line.length && (line[i + 1] === 'b' || line[i + 1] === 'B')) {
            i += 2;
            while (i < line.length && /[01]/.test(line[i])) i++;
        } else {
            while (i < line.length && /[0-9]/.test(line[i])) i++;
        }
        return line.substring(start, i);
    }
}
