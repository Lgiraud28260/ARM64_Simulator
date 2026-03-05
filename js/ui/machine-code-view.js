// machine-code-view.js - Address | Bytes | Assembly display
import { toHex32, toBin } from '../utils.js';
import { i18n } from '../i18n.js';

export class MachineCodeView {
    constructor(container) {
        this.container = container;
        this.instructions = [];
        this.currentPC = -1;
    }

    setInstructions(instructions) {
        this.instructions = instructions;
        this.render();
    }

    setPC(pc) {
        this.currentPC = Number(pc);
        this.updateHighlight();
    }

    render() {
        const body = this.container.querySelector('.panel-body');
        if (this.instructions.length === 0) {
            body.innerHTML = `<div style="padding:8px;color:var(--text-muted)">${i18n.t('noProgramAssembled')}</div>`;
            return;
        }

        let html = '';
        for (const instr of this.instructions) {
            const addr = instr.address;
            const enc = instr.encoding;
            const bytes = [
                (enc & 0xFF).toString(16).padStart(2, '0'),
                ((enc >> 8) & 0xFF).toString(16).padStart(2, '0'),
                ((enc >> 16) & 0xFF).toString(16).padStart(2, '0'),
                ((enc >> 24) & 0xFF).toString(16).padStart(2, '0'),
            ].join(' ').toUpperCase();

            const isCurrent = addr === this.currentPC;
            const source = instr.source.trim();

            html += `<div class="machine-code-row${isCurrent ? ' pc-current' : ''}" data-addr="${addr}">
                <span class="mc-addr">0x${addr.toString(16).toUpperCase().padStart(5, '0')}</span>
                <span class="mc-bytes">${bytes}</span>
                <span class="mc-asm">${this.escapeHtml(source)}</span>
            </div>`;
        }

        body.innerHTML = html;
    }

    updateHighlight() {
        const rows = this.container.querySelectorAll('.machine-code-row');
        rows.forEach(row => {
            const addr = parseInt(row.dataset.addr);
            row.classList.toggle('pc-current', addr === this.currentPC);
        });

        // Scroll current into view
        const current = this.container.querySelector('.pc-current');
        if (current) {
            current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
