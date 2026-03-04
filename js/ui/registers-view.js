// registers-view.js - Register panel display
import { toHex, toSigned64 } from '../utils.js';

export class RegistersView {
    constructor(container, registers) {
        this.container = container;
        this.registers = registers;
        this.prevValues = {};
        this.rows = {};
        this.build();
    }

    build() {
        const body = this.container.querySelector('.panel-body');
        let html = '';

        // X0-X30
        for (let i = 0; i < 31; i++) {
            const name = `X${i.toString().padStart(2, '0')}`;
            html += `<div class="register-row" id="reg-${name}">
                <span class="reg-name">${name}</span>
                <span class="reg-hex" id="reg-hex-${name}">0x0000000000000000</span>
            </div>`;
        }

        // SP
        html += `<div class="register-row" id="reg-SP">
            <span class="reg-name">SP</span>
            <span class="reg-hex" id="reg-hex-SP">0x0000000000000000</span>
        </div>`;

        // PC
        html += `<div class="register-row" id="reg-PC">
            <span class="reg-name">PC</span>
            <span class="reg-hex" id="reg-hex-PC">0x0000000000000000</span>
        </div>`;

        // Flags
        html += `<div class="flags-row">
            <div class="flag"><span class="flag-name">N</span>=<span class="flag-value" id="flag-N">0</span></div>
            <div class="flag"><span class="flag-name">Z</span>=<span class="flag-value" id="flag-Z">0</span></div>
            <div class="flag"><span class="flag-name">C</span>=<span class="flag-value" id="flag-C">0</span></div>
            <div class="flag"><span class="flag-name">V</span>=<span class="flag-value" id="flag-V">0</span></div>
        </div>`;

        body.innerHTML = html;
    }

    update() {
        const regs = this.registers;

        // X0-X30
        for (let i = 0; i < 31; i++) {
            const name = `X${i.toString().padStart(2, '0')}`;
            const val = regs.getX(i);
            const hexEl = document.getElementById(`reg-hex-${name}`);
            const rowEl = document.getElementById(`reg-${name}`);
            if (hexEl) hexEl.textContent = toHex(val);
            if (rowEl) {
                const prevVal = this.prevValues[name];
                if (prevVal !== undefined && prevVal !== val) {
                    rowEl.classList.add('flash');
                    setTimeout(() => rowEl.classList.remove('flash'), 1000);
                }
            }
            this.prevValues[name] = val;
        }

        // SP
        const spVal = regs.getSP();
        const spHex = document.getElementById('reg-hex-SP');
        const spRow = document.getElementById('reg-SP');
        if (spHex) spHex.textContent = toHex(spVal);
        if (spRow && this.prevValues['SP'] !== undefined && this.prevValues['SP'] !== spVal) {
            spRow.classList.add('flash');
            setTimeout(() => spRow.classList.remove('flash'), 1000);
        }
        this.prevValues['SP'] = spVal;

        // PC
        const pcVal = regs.getPC();
        const pcHex = document.getElementById('reg-hex-PC');
        const pcRow = document.getElementById('reg-PC');
        if (pcHex) pcHex.textContent = toHex(pcVal);
        if (pcRow && this.prevValues['PC'] !== undefined && this.prevValues['PC'] !== pcVal) {
            pcRow.classList.add('flash');
            setTimeout(() => pcRow.classList.remove('flash'), 1000);
        }
        this.prevValues['PC'] = pcVal;

        // Flags
        const flags = ['N', 'Z', 'C', 'V'];
        for (const f of flags) {
            const el = document.getElementById(`flag-${f}`);
            if (el) {
                const val = regs[f] ? 1 : 0;
                el.textContent = val;
                el.className = 'flag-value' + (val ? ' set' : '');
            }
        }
    }
}
