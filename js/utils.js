// utils.js - Hex formatting, bit manipulation, BigInt helpers

const MASK_64 = (1n << 64n) - 1n;
const MASK_32 = (1n << 32n) - 1n;
const SIGN_BIT_64 = 1n << 63n;
const SIGN_BIT_32 = 1n << 31n;

export function toHex(value, bits = 64) {
    const mask = (1n << BigInt(bits)) - 1n;
    const v = BigInt(value) & mask;
    const hexLen = bits / 4;
    return '0x' + v.toString(16).toUpperCase().padStart(hexLen, '0');
}

export function toHex32(value) {
    return toHex(value, 32);
}

export function toBin(value, bits = 32) {
    const mask = (1n << BigInt(bits)) - 1n;
    const v = BigInt(value) & mask;
    return v.toString(2).padStart(bits, '0');
}

export function signExtend(value, bitWidth) {
    value = BigInt(value);
    const signBit = 1n << (BigInt(bitWidth) - 1n);
    if (value & signBit) {
        const mask = (1n << BigInt(bitWidth)) - 1n;
        return (value | ~mask) & MASK_64;
    }
    return value & MASK_64;
}

export function extractBits(value, hi, lo) {
    value = BigInt(value);
    const width = hi - lo + 1;
    const mask = (1n << BigInt(width)) - 1n;
    return Number((value >> BigInt(lo)) & mask);
}

export function extractBitsBI(value, hi, lo) {
    value = BigInt(value);
    const width = hi - lo + 1;
    const mask = (1n << BigInt(width)) - 1n;
    return (value >> BigInt(lo)) & mask;
}

export function setBits(value, hi, lo, fieldValue) {
    value = Number(value);
    fieldValue = Number(fieldValue);
    const width = hi - lo + 1;
    const mask = ((1 << width) - 1) << lo;
    return (value & ~mask) | ((fieldValue << lo) & mask);
}

export function mask64(value) {
    return BigInt(value) & MASK_64;
}

export function mask32(value) {
    return BigInt(value) & MASK_32;
}

export function toSigned64(value) {
    value = BigInt(value) & MASK_64;
    if (value & SIGN_BIT_64) {
        return value - (1n << 64n);
    }
    return value;
}

export function toSigned32(value) {
    value = BigInt(value) & MASK_32;
    if (value & SIGN_BIT_32) {
        return value - (1n << 32n);
    }
    return value;
}

export function toUnsigned64(value) {
    return BigInt(value) & MASK_64;
}

// Parse an immediate value (decimal, hex, or binary)
export function parseImmediate(str) {
    str = str.trim();
    const negative = str.startsWith('-');
    if (negative) str = str.substring(1);

    let val;
    if (str.startsWith('0x') || str.startsWith('0X')) {
        val = BigInt(str);
    } else if (str.startsWith('0b') || str.startsWith('0B')) {
        val = BigInt(str);
    } else {
        val = BigInt(str);
    }

    return negative ? -val : val;
}

// Decode a logical immediate bitmask (ARM64 encoding)
export function decodeBitmask(immN, imms, immr, regSize) {
    const len = highestSetBit((immN << 6) | (~imms & 0x3F));
    if (len < 1) return null;

    const size = 1 << len;
    const levels = size - 1;
    const S = imms & levels;
    const R = immr & levels;

    let welem = (1n << BigInt(S + 1)) - 1n;
    // Rotate right
    if (R > 0) {
        const top = (welem >> BigInt(R)) & ((1n << BigInt(size - R)) - 1n);
        const bot = (welem & ((1n << BigInt(R)) - 1n)) << BigInt(size - R);
        welem = top | bot;
    }

    // Replicate
    let result = 0n;
    for (let i = 0; i < regSize; i += size) {
        result |= (welem & ((1n << BigInt(size)) - 1n)) << BigInt(i);
    }
    return result & ((1n << BigInt(regSize)) - 1n);
}

// Encode a logical immediate bitmask - returns {N, imms, immr} or null
export function encodeBitmask(value, regSize) {
    value = BigInt(value) & ((1n << BigInt(regSize)) - 1n);
    if (value === 0n || value === ((1n << BigInt(regSize)) - 1n)) return null;

    for (let size = 2; size <= regSize; size *= 2) {
        const mask = (1n << BigInt(size)) - 1n;
        const elem = value & mask;

        // Check if value is made of repeating elem
        let valid = true;
        for (let i = size; i < regSize; i += size) {
            if (((value >> BigInt(i)) & mask) !== elem) {
                valid = false;
                break;
            }
        }
        if (!valid) continue;

        // Find rotation and number of set bits
        for (let r = 0; r < size; r++) {
            // Rotate left by r
            let rotated = ((elem << BigInt(r)) | (elem >> BigInt(size - r))) & mask;
            // Check if rotated is a contiguous run of 1s starting from bit 0
            const ones = countTrailingOnes(rotated, size);
            if (ones > 0 && ones < size) {
                const check = (1n << BigInt(ones)) - 1n;
                if (rotated === check) {
                    const S = ones - 1;
                    const R = r;
                    const immN = (size === 64) ? 1 : 0;
                    const sizeBits = ~(size - 1) & 0x3F;
                    const imms = (sizeBits | S) & 0x3F;
                    return { N: immN, imms: imms, immr: R };
                }
            }
        }
    }
    return null;
}

function highestSetBit(value) {
    for (let i = 6; i >= 0; i--) {
        if (value & (1 << i)) return i;
    }
    return -1;
}

function countTrailingOnes(value, size) {
    let count = 0;
    for (let i = 0; i < size; i++) {
        if (value & (1n << BigInt(i))) count++;
        else break;
    }
    return count;
}

export { MASK_64, MASK_32, SIGN_BIT_64, SIGN_BIT_32 };
