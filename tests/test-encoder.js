// test-encoder.js
import { Assembler } from '../js/assembler/assembler.js';

export async function runEncoderTests() {
    section('Encoder Tests');
    const asm = new Assembler();

    function testEncode(source, expectedHex, desc) {
        const result = asm.assemble(source);
        if (result.errors.length > 0) {
            assert(false, `${desc} - assembly error: ${result.errors[0].message}`);
            return;
        }
        if (result.instructions.length === 0) {
            assert(false, `${desc} - no instructions generated`);
            return;
        }
        const encoding = result.instructions[0].encoding;
        const hex = '0x' + (encoding >>> 0).toString(16).toUpperCase().padStart(8, '0');
        const expected = expectedHex.toUpperCase();
        assert(hex === expected, `${desc}: got ${hex}, expected ${expected}`);
    }

    // NOP
    testEncode('NOP', '0xD503201F', 'NOP encoding');

    // MOV immediate (MOVZ)
    testEncode('MOV X0, #42', '0xD2800540', 'MOV X0, #42 -> MOVZ');
    testEncode('MOV W1, #0', '0x52800001', 'MOV W1, #0 -> MOVZ 32-bit');

    // MOVZ with shift
    testEncode('MOVZ X0, #0xFFFF, LSL #16', '0xD2BFFFE0', 'MOVZ X0, #0xFFFF, LSL #16');

    // MOVK
    testEncode('MOVK X0, #0x1234', '0xF2824680', 'MOVK X0, #0x1234');

    // ADD immediate
    testEncode('ADD X0, X1, #1', '0x91000420', 'ADD X0, X1, #1');
    testEncode('ADD W0, W1, #1', '0x11000420', 'ADD W0, W1, #1');

    // SUB immediate
    testEncode('SUB X0, X1, #1', '0xD1000420', 'SUB X0, X1, #1');

    // ADDS (sets flags)
    testEncode('ADDS X0, X1, #1', '0xB1000420', 'ADDS X0, X1, #1');

    // CMP (alias of SUBS XZR)
    testEncode('CMP X0, #10', '0xF100281F', 'CMP X0, #10');

    // ADD register
    testEncode('ADD X0, X1, X2', '0x8B020020', 'ADD X0, X1, X2');

    // SUB register
    testEncode('SUB X0, X1, X2', '0xCB020020', 'SUB X0, X1, X2');

    // AND register
    testEncode('AND X0, X1, X2', '0x8A020020', 'AND X0, X1, X2');

    // ORR register (MOV register is ORR Rd, XZR, Rm)
    testEncode('MOV X0, X1', '0xAA0103E0', 'MOV X0, X1 -> ORR');

    // MUL
    testEncode('MUL X0, X1, X2', '0x9B027C20', 'MUL X0, X1, X2');

    // B (unconditional)
    testEncode('B #4', '0x14000001', 'B #4');

    // BL
    testEncode('BL #8', '0x94000002', 'BL #8');

    // RET
    testEncode('RET', '0xD65F03C0', 'RET');

    // BR X0
    testEncode('BR X0', '0xD61F0000', 'BR X0');

    // SVC #0
    testEncode('SVC #0', '0xD4000001', 'SVC #0');

    // BRK #0
    testEncode('BRK #0', '0xD4200000', 'BRK #0');

    // LDR immediate offset
    testEncode('LDR X0, [X1]', '0xF9400020', 'LDR X0, [X1]');
    testEncode('LDR X0, [X1, #8]', '0xF9400420', 'LDR X0, [X1, #8]');

    // STR immediate offset
    testEncode('STR X0, [X1]', '0xF9000020', 'STR X0, [X1]');
    testEncode('STR X0, [X1, #8]', '0xF9000420', 'STR X0, [X1, #8]');

    // LDRB
    testEncode('LDRB W0, [X1]', '0x39400020', 'LDRB W0, [X1]');

    // LSL immediate
    testEncode('LSL X0, X1, #4', '0xD37CEC20', 'LSL X0, X1, #4');

    // LSR immediate
    testEncode('LSR X0, X1, #4', '0xD344FC20', 'LSR X0, X1, #4');
}
