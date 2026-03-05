// c-asm-panel.js - C↔ASM comparison split view
import { C_ASM_EXAMPLES } from '../c-asm-examples.js';

export class CASMPanel {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks; // { onLoadCode }
        this.build();
    }

    build() {
        const categories = [...new Set(C_ASM_EXAMPLES.map(e => e.category))];

        let html = `<div class="casm-controls">
            <select id="casm-category">
                <option value="">Toutes les categories</option>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
        </div>
        <div class="casm-list" id="casm-list"></div>
        <div class="casm-detail" id="casm-detail" style="display:none"></div>`;

        this.container.innerHTML = html;

        document.getElementById('casm-category').addEventListener('change', (e) => {
            this.showList(e.target.value);
        });

        this.showList('');
    }

    showList(category) {
        const listEl = document.getElementById('casm-list');
        const detailEl = document.getElementById('casm-detail');
        listEl.style.display = '';
        detailEl.style.display = 'none';

        const filtered = category
            ? C_ASM_EXAMPLES.filter(e => e.category === category)
            : C_ASM_EXAMPLES;

        listEl.innerHTML = filtered.map((ex, i) => `
            <div class="casm-item" data-idx="${C_ASM_EXAMPLES.indexOf(ex)}">
                <span class="casm-cat">${ex.category}</span>
                <span class="casm-title">${ex.title}</span>
            </div>
        `).join('');

        listEl.querySelectorAll('.casm-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showDetail(parseInt(item.dataset.idx));
            });
        });
    }

    showDetail(idx) {
        const ex = C_ASM_EXAMPLES[idx];
        const listEl = document.getElementById('casm-list');
        const detailEl = document.getElementById('casm-detail');
        listEl.style.display = 'none';
        detailEl.style.display = '';

        detailEl.innerHTML = `
            <div class="casm-header">
                <button class="tutorial-back-btn" id="casm-back">← Retour</button>
                <span class="casm-detail-title">${ex.title}</span>
                <span class="casm-cat">${ex.category}</span>
            </div>
            <div class="casm-split">
                <div class="casm-pane">
                    <div class="casm-pane-title">C</div>
                    <pre class="casm-code casm-c">${this._highlightC(ex.cCode)}</pre>
                </div>
                <div class="casm-pane">
                    <div class="casm-pane-title">ARM64 ASM</div>
                    <pre class="casm-code casm-asm">${this._highlightASM(ex.asmCode)}</pre>
                </div>
            </div>
            <div class="casm-notes">${ex.notes}</div>
            <button class="toolbar-btn primary tutorial-btn" id="casm-load">Charger l'ASM dans l'editeur</button>
        `;

        detailEl.querySelector('#casm-back').addEventListener('click', () => {
            const cat = document.getElementById('casm-category').value;
            this.showList(cat);
        });

        detailEl.querySelector('#casm-load').addEventListener('click', () => {
            // Build a full program from the ASM snippet
            const code = `// C↔ASM: ${ex.title}\n\n_start:\n${ex.asmCode.split('\n').map(l => '    ' + l).join('\n')}\n    BRK #0\n`;
            this.callbacks.onLoadCode(code);
        });
    }

    _highlightC(code) {
        return code
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\b(int|long|void|return|if|else|while|for|do|switch|case|default|break|struct)\b/g,
                '<span class="c-keyword">$1</span>')
            .replace(/\/\/.*$/gm, '<span class="c-comment">$&</span>')
            .replace(/\b(\d+)\b/g, '<span class="c-number">$1</span>');
    }

    _highlightASM(code) {
        return code
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\/\/.*$/gm, '<span class="syn-comment">$&</span>')
            .replace(/\b([A-Z]{2,}(?:\.[A-Z0-9]+)?)\b/g, '<span class="syn-mnemonic">$1</span>')
            .replace(/\b([WX]\d+|SP|LR|PC)\b/g, '<span class="syn-register">$1</span>')
            .replace(/#(\d+|0x[0-9A-Fa-f]+)/g, '<span class="syn-immediate">#$1</span>');
    }
}
