// neon-view.js - NEON/SIMD Register panel display
import { toHex } from '../utils.js';

export class NEONRegistersView {
    constructor(container, registers) {
        this.container = container;
        this.registers = registers;
        this.prevValues = {};
        this.arrangement = '4S'; // default view
        this.build();
    }

    build() {
        const body = this.container.querySelector('.panel-body');
        let html = '';

        // V0-V31
        for (let i = 0; i < 32; i++) {
            const name = `V${i.toString().padStart(2, '0')}`;
            html += `<div class="register-row neon-row" id="neon-${name}">
                <span class="reg-name neon-reg-name">${name}</span>
                <span class="neon-lanes" id="neon-lanes-${name}"></span>
            </div>`;
        }

        body.innerHTML = html;
        this.updateLanes();
    }

    setArrangement(arr) {
        this.arrangement = arr;
        this.updateLanes();
    }

    updateLanes() {
        const regs = this.registers;
        const arr = this.arrangement;
        const width = this._laneWidth(arr);
        const count = parseInt(arr);
        const hexChars = width / 4;

        for (let i = 0; i < 32; i++) {
            const name = `V${i.toString().padStart(2, '0')}`;
            const el = document.getElementById(`neon-lanes-${name}`);
            if (!el) continue;

            let lanesHtml = '';
            for (let lane = count - 1; lane >= 0; lane--) {
                const val = regs.getLane(i, arr, lane);
                const hex = val.toString(16).toUpperCase().padStart(hexChars, '0');
                const isNonZero = val !== 0n;
                lanesHtml += `<span class="neon-lane${isNonZero ? ' nonzero' : ''}">${hex}</span>`;
            }
            el.innerHTML = lanesHtml;

            // Flash on change
            const rowEl = document.getElementById(`neon-${name}`);
            const v = regs.getV(i);
            const key = `${v.hi}:${v.lo}`;
            if (this.prevValues[name] !== undefined && this.prevValues[name] !== key) {
                if (rowEl) {
                    rowEl.classList.add('flash');
                    setTimeout(() => rowEl.classList.remove('flash'), 1000);
                }
            }
            this.prevValues[name] = key;
        }
    }

    update() {
        this.updateLanes();
    }

    _laneWidth(arrangement) {
        const ch = arrangement[arrangement.length - 1].toUpperCase();
        switch (ch) {
            case 'B': return 8;
            case 'H': return 16;
            case 'S': return 32;
            case 'D': return 64;
            default: return 32;
        }
    }
}
