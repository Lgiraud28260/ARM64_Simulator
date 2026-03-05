// multicore-panel.js - Dual-core split view

export class MulticorePanel {
    constructor(container) {
        this.container = container;
        this.dualCPU = null;
        this.visible = false;
    }

    setDualCPU(dualCPU) {
        this.dualCPU = dualCPU;
    }

    show() {
        this.visible = true;
        this.container.style.display = '';
        this.build();
    }

    hide() {
        this.visible = false;
        this.container.style.display = 'none';
    }

    build() {
        this.container.innerHTML = `
            <div class="mc-split">
                <div class="mc-cpu-panel">
                    <div class="mc-cpu-header"><span class="mc-cpu-dot mc-cpu0-dot"></span> CPU 0</div>
                    <textarea class="mc-editor" id="mc-editor-0" spellcheck="false" placeholder="// CPU 0 code here..."></textarea>
                    <div class="mc-regs" id="mc-regs-0"></div>
                </div>
                <div class="mc-cpu-panel">
                    <div class="mc-cpu-header"><span class="mc-cpu-dot mc-cpu1-dot"></span> CPU 1</div>
                    <textarea class="mc-editor" id="mc-editor-1" spellcheck="false" placeholder="// CPU 1 code here..."></textarea>
                    <div class="mc-regs" id="mc-regs-1"></div>
                </div>
            </div>
            <div class="mc-info">
                <div class="mc-active" id="mc-active-cpu">CPU actif: 0</div>
                <div class="mc-conflicts" id="mc-conflicts"></div>
                <div class="mc-access-log" id="mc-access-log"></div>
            </div>
        `;

        // Load default example
        const editor0 = document.getElementById('mc-editor-0');
        const editor1 = document.getElementById('mc-editor-1');
        if (editor0) editor0.value = DEFAULT_CPU0;
        if (editor1) editor1.value = DEFAULT_CPU1;
    }

    getCode(cpuIdx) {
        const el = document.getElementById(`mc-editor-${cpuIdx}`);
        return el ? el.value : '';
    }

    update() {
        if (!this.visible || !this.dualCPU) return;

        // Active CPU indicator
        const activeEl = document.getElementById('mc-active-cpu');
        if (activeEl) {
            activeEl.innerHTML = `CPU actif: <strong>${this.dualCPU.activeCPU}</strong>`;
        }

        // Update compact registers for both CPUs
        this._updateRegs(0, this.dualCPU.registers0);
        this._updateRegs(1, this.dualCPU.registers1);

        // Conflicts
        const conflEl = document.getElementById('mc-conflicts');
        if (conflEl) {
            const conflicts = this.dualCPU.getConflicts();
            if (conflicts.length === 0) {
                conflEl.innerHTML = '<span class="mc-no-conflict">Pas de conflit detecte</span>';
            } else {
                conflEl.innerHTML = conflicts.slice(-5).reverse().map(c =>
                    `<div class="mc-conflict-entry">RACE @ 0x${c.addr.toString(16).toUpperCase()} — CPU0:${c.cpu0} CPU1:${c.cpu1} (step ${c.step})</div>`
                ).join('');
            }
        }

        // Access log
        const logEl = document.getElementById('mc-access-log');
        if (logEl) {
            const log = this.dualCPU.getAccessLog().slice(-10).reverse();
            logEl.innerHTML = log.map(e => {
                const cls = e.cpu === 0 ? 'mc-log-cpu0' : 'mc-log-cpu1';
                return `<span class="${cls}">CPU${e.cpu} ${e.type} 0x${e.addr.toString(16).toUpperCase()}</span>`;
            }).join(' ');
        }
    }

    _updateRegs(cpuIdx, regs) {
        const el = document.getElementById(`mc-regs-${cpuIdx}`);
        if (!el) return;

        const important = [0, 1, 2, 3, 4, 5, 8, 19, 20];
        let html = '';
        for (const i of important) {
            const val = regs.getX(i);
            const cls = val === 0n ? 'mc-reg-zero' : 'mc-reg-val';
            html += `<span class="${cls}">X${i}=${val.toString()}</span> `;
        }
        html += `<span class="mc-reg-pc">PC=0x${regs.getPC().toString(16)}</span>`;
        el.innerHTML = html;
    }
}

const DEFAULT_CPU0 = `// CPU 0: Write shared variable
_start:
    ADR X0, shared
    MOV X1, #42
    STR X1, [X0]     // Write 42
    LDR X2, [X0]     // Read back
    BRK #0

shared:
    .quad 0
`;

const DEFAULT_CPU1 = `// CPU 1: Write same address
_start:
    ADR X0, shared
    MOV X1, #99
    STR X1, [X0]     // Write 99 (RACE!)
    LDR X2, [X0]     // Read back
    BRK #0

shared:
    .quad 0
`;
