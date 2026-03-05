// c-asm-panel.js - C↔ASM comparison split view
import { getCASMExamples } from '../c-asm-examples.js';
import { i18n } from '../i18n.js';

export class CASMPanel {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks; // { onLoadCode }
        this.build();
        i18n.onChange(() => this.build());
    }

    build() {
        const examples = getCASMExamples();
        const categories = [...new Set(examples.map(e => e.category))];

        let html = `<div class="casm-controls">
            <select id="casm-category">
                <option value="">${i18n.t('allCategories')}</option>
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
        const examples = getCASMExamples();
        const listEl = document.getElementById('casm-list');
        const detailEl = document.getElementById('casm-detail');
        listEl.style.display = '';
        detailEl.style.display = 'none';

        const filtered = category
            ? examples.filter(e => e.category === category)
            : examples;

        listEl.innerHTML = filtered.map((ex) => {
            const idx = examples.indexOf(ex);
            return `<div class="casm-item" data-idx="${idx}">
                <span class="casm-cat">${ex.category}</span>
                <span class="casm-title">${ex.title}</span>
            </div>`;
        }).join('');

        listEl.querySelectorAll('.casm-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showDetail(parseInt(item.dataset.idx));
            });
        });
    }

    showDetail(idx) {
        const examples = getCASMExamples();
        const ex = examples[idx];
        const listEl = document.getElementById('casm-list');
        const detailEl = document.getElementById('casm-detail');
        listEl.style.display = 'none';
        detailEl.style.display = '';

        detailEl.innerHTML = `
            <div class="casm-header">
                <button class="tutorial-back-btn" id="casm-back">${i18n.t('back')}</button>
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
            <button class="toolbar-btn primary tutorial-btn" id="casm-load">${i18n.t('loadAsmInEditor')}</button>
        `;

        detailEl.querySelector('#casm-back').addEventListener('click', () => {
            const cat = document.getElementById('casm-category').value;
            this.showList(cat);
        });

        detailEl.querySelector('#casm-load').addEventListener('click', () => {
            const indented = ex.asmCode.split('\n').map(l => '    ' + l).join('\n');
            const hasBrk = /BRK\s+#0/i.test(ex.asmCode);
            const code = `// C↔ASM: ${ex.title}\n\n_start:\n${indented}${hasBrk ? '' : '\n    BRK #0'}\n`;
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
