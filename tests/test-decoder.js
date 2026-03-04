// test-decoder.js
import { decode } from '../js/cpu/decoder.js';

export async function runDecoderTests() {
    section('Decoder Tests');

    function testDecode(encoding, expectedType, desc) {
        try {
            const decoded = decode(encoding >>> 0);
            assert(decoded.type === expectedType, `${desc}: type=${decoded.type}, expected=${expectedType}`);
        } catch (e) {
            assert(false, `${desc}: decode error - ${e.message}`);
        }
    }

    // NOP
    testDecode(0xD503201F, 'NOP', 'Decode NOP');

    // MOVZ X0, #42
    testDecode(0xD2800540, 'MOVZ', 'Decode MOVZ');

    // ADD X0, X1, #1
    testDecode(0x91000420, 'ADD', 'Decode ADD immediate');

    // SUB X0, X1, #1
    testDecode(0xD1000420, 'SUB', 'Decode SUB immediate');

    // CMP X0, #10
    testDecode(0xF100281F, 'CMP', 'Decode CMP (SUBS XZR)');

    // ADD X0, X1, X2 (shifted register)
    testDecode(0x8B020020, 'ADD', 'Decode ADD register');

    // MOV X0, X1 (ORR X0, XZR, X1)
    testDecode(0xAA0103E0, 'MOV', 'Decode MOV register');

    // MUL X0, X1, X2
    testDecode(0x9B027C20, 'MUL', 'Decode MUL');

    // B #4
    testDecode(0x14000001, 'B', 'Decode B');

    // BL #8
    testDecode(0x94000002, 'BL', 'Decode BL');

    // RET
    testDecode(0xD65F03C0, 'RET', 'Decode RET');

    // SVC #0
    testDecode(0xD4000001, 'SVC', 'Decode SVC');

    // BRK #0
    testDecode(0xD4200000, 'BRK', 'Decode BRK');

    // LDR X0, [X1]
    testDecode(0xF9400020, 'LDR', 'Decode LDR');

    // STR X0, [X1]
    testDecode(0xF9000020, 'STR', 'Decode STR');

    // LDRB W0, [X1]
    testDecode(0x39400020, 'LDRB', 'Decode LDRB');

    // B.EQ (conditional)
    testDecode(0x54000000, 'B.cond', 'Decode B.EQ');

    // CBZ X0, #0
    testDecode(0xB4000000, 'CBZ', 'Decode CBZ');

    // CBNZ X0, #0
    testDecode(0xB5000000, 'CBNZ', 'Decode CBNZ');

    // UDIV
    testDecode(0x1AC20820, 'UDIV', 'Decode UDIV');

    // SDIV
    testDecode(0x1AC20C20, 'SDIV', 'Decode SDIV');

    // Roundtrip test: encode then decode
    section('Encoder-Decoder Roundtrip Tests');
    const { Assembler } = await import('../js/assembler/assembler.js');
    const asm = new Assembler();

    function testRoundtrip(source, expectedType, desc) {
        const result = asm.assemble(source);
        if (result.errors.length > 0) {
            assert(false, `${desc} - assembly error: ${result.errors[0].message}`);
            return;
        }
        const encoding = result.instructions[0].encoding;
        try {
            const decoded = decode(encoding >>> 0);
            assert(decoded.type === expectedType, `${desc}: encoded=0x${(encoding>>>0).toString(16)}, decoded=${decoded.type}, expected=${expectedType}`);
        } catch (e) {
            assert(false, `${desc}: decode failed - ${e.message}`);
        }
    }

    testRoundtrip('ADD X0, X1, #100', 'ADD', 'Roundtrip ADD imm');
    testRoundtrip('SUB X3, X4, X5', 'SUB', 'Roundtrip SUB reg');
    testRoundtrip('AND X0, X1, X2', 'AND', 'Roundtrip AND');
    testRoundtrip('MUL X0, X1, X2', 'MUL', 'Roundtrip MUL');
    testRoundtrip('MOV X0, #0xFF', 'MOVZ', 'Roundtrip MOV imm');
    testRoundtrip('MOV X0, X5', 'MOV', 'Roundtrip MOV reg');
    testRoundtrip('CMP X0, #5', 'CMP', 'Roundtrip CMP');
    testRoundtrip('LDRB W0, [X1]', 'LDRB', 'Roundtrip LDRB');
}
