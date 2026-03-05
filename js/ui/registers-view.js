// registers-view.js - Register panel display
import { toHex, toSigned64 } from '../utils.js';

export class RegistersView {
    constructor(container, registers) {
        this.container = container;
        this.registers = registers;
        this.prevValues = {};
        this.rows = {};
        this.format = 'hex'; // 'hex', 'dec', 'bin'
        this.build();
        this.bindFormatButtons();
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

    bindFormatButtons() {
        this.container.querySelectorAll('.reg-fmt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.container.querySelectorAll('.reg-fmt-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.format = btn.dataset.fmt;
                this.update();
            });
        });
    }

    formatValue(val) {
        const v = BigInt(val);
        if (this.format === 'dec') {
            return toSigned64(v).toString();
        } else if (this.format === 'bin') {
            // Show last 32 bits to keep it readable
            const lo = v & 0xFFFFFFFFn;
            return '0b' + lo.toString(2).padStart(32, '0');
        }
        return toHex(v);
    }

    _updateRegRow(name, val) {
        const hexEl = document.getElementById(`reg-hex-${name}`);
        const rowEl = document.getElementById(`reg-${name}`);
        if (hexEl) hexEl.textContent = this.formatValue(val);
        if (rowEl) {
            const prevVal = this.prevValues[name];
            const changed = prevVal !== undefined && prevVal !== val;
            rowEl.classList.toggle('reg-changed', changed);
            rowEl.classList.toggle('reg-zero', val === 0n);
            if (changed) {
                rowEl.classList.remove('flash');
                void rowEl.offsetWidth; // force reflow
                rowEl.classList.add('flash');
            }
        }
        this.prevValues[name] = val;
    }

    update() {
        const regs = this.registers;

        // X0-X30
        for (let i = 0; i < 31; i++) {
            const name = `X${i.toString().padStart(2, '0')}`;
            this._updateRegRow(name, regs.getX(i));
        }

        // SP
        this._updateRegRow('SP', regs.getSP());

        // PC
        this._updateRegRow('PC', regs.getPC());

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
