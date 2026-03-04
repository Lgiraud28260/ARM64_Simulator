// conditions.js - NZCV condition evaluation

export const CONDITION_NAMES = [
    'EQ', 'NE', 'CS', 'CC', 'MI', 'PL', 'VS', 'VC',
    'HI', 'LS', 'GE', 'LT', 'GT', 'LE', 'AL', 'NV'
];

// Evaluate condition code against NZCV flags
export function evaluateCondition(condCode, N, Z, C, V) {
    switch (condCode & 0xF) {
        case 0b0000: return Z;                    // EQ - Equal
        case 0b0001: return !Z;                   // NE - Not equal
        case 0b0010: return C;                    // CS/HS - Carry set
        case 0b0011: return !C;                   // CC/LO - Carry clear
        case 0b0100: return N;                    // MI - Minus/negative
        case 0b0101: return !N;                   // PL - Plus/positive or zero
        case 0b0110: return V;                    // VS - Overflow set
        case 0b0111: return !V;                   // VC - Overflow clear
        case 0b1000: return C && !Z;              // HI - Unsigned higher
        case 0b1001: return !C || Z;              // LS - Unsigned lower or same
        case 0b1010: return N === V;              // GE - Signed >=
        case 0b1011: return N !== V;              // LT - Signed <
        case 0b1100: return !Z && (N === V);      // GT - Signed >
        case 0b1101: return Z || (N !== V);       // LE - Signed <=
        case 0b1110: return true;                 // AL - Always
        case 0b1111: return true;                 // NV - Always (in practice)
        default: return false;
    }
}

export function conditionName(code) {
    return CONDITION_NAMES[code & 0xF] || '??';
}
