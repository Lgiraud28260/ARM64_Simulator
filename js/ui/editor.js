// editor.js - Syntax-highlighted editor (textarea + pre overlay)
import { getTooltip } from '../instruction-tooltips.js';

export class Editor {
    constructor(container) {
        this.container = container;
        this.textarea = document.getElementById('editor-textarea');
        this.highlight = document.getElementById('editor-highlight');
        this.lineNumbers = document.getElementById('editor-line-numbers');
        this.currentLine = -1;
        this.breakpoints = new Set();
        this.onBreakpointChange = null;

        this.textarea.addEventListener('input', () => this.update());
        this.textarea.addEventListener('scroll', () => this.syncScroll());
        this.textarea.addEventListener('keydown', (e) => this.handleKey(e));

        // Breakpoint toggle on line number click
        this.lineNumbers.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent textarea focus loss/re-trigger
            e.stopPropagation();
            const lineDiv = e.target.closest('[data-line]');
            if (!lineDiv) return;
            const lineNum = parseInt(lineDiv.dataset.line, 10);
            if (isNaN(lineNum)) return;
            if (this.breakpoints.has(lineNum)) {
                this.breakpoints.delete(lineNum);
            } else {
                this.breakpoints.add(lineNum);
            }
            this.renderLineNumbers();
            if (this.onBreakpointChange) this.onBreakpointChange(this.breakpoints);
        });

        // Instruction tooltip
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.className = 'mnemonic-tooltip';
        document.body.appendChild(this.tooltipEl);

        this.highlight.addEventListener('mouseover', (e) => {
            const mn = e.target.closest('[data-mn]');
            if (!mn) { this.tooltipEl.style.display = 'none'; return; }
            const tip = getTooltip(mn.dataset.mn);
            if (!tip) { this.tooltipEl.style.display = 'none'; return; }
            this.tooltipEl.textContent = tip;
            const rect = mn.getBoundingClientRect();
            this.tooltipEl.style.left = rect.left + 'px';
            this.tooltipEl.style.top = (rect.top - 28) + 'px';
            this.tooltipEl.style.display = 'block';
        });

        this.highlight.addEventListener('mouseout', (e) => {
            if (!e.target.closest('[data-mn]')) return;
            this.tooltipEl.style.display = 'none';
        });

        this.update();
    }

    getValue() {
        return this.textarea.value;
    }

    setValue(text) {
        this.textarea.value = text;
        this.update();
    }

    update() {
        this.renderHighlight();
        this.renderLineNumbers();
    }

    syncScroll() {
        this.highlight.scrollTop = this.textarea.scrollTop;
        this.highlight.scrollLeft = this.textarea.scrollLeft;
        this.lineNumbers.scrollTop = this.textarea.scrollTop;
    }

    handleKey(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;
            this.textarea.value = this.textarea.value.substring(0, start) + '    ' + this.textarea.value.substring(end);
            this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
            this.update();
        }
    }

    renderLineNumbers() {
        const lines = this.textarea.value.split('\n');
        let html = '';
        for (let i = 1; i <= lines.length; i++) {
            const isCurrent = (i === this.currentLine);
            const isBp = this.breakpoints.has(i);
            let cls = '';
            if (isBp) cls += ' line-bp';
            if (isCurrent) cls += ' line-pc';
            const style = isCurrent ? ' style="background:var(--pc-highlight);color:var(--accent-green)"' : '';
            html += `<div class="${cls.trim()}" data-line="${i}"${style}>${isBp ? '●' : i}</div>`;
        }
        this.lineNumbers.innerHTML = html;
    }

    renderHighlight() {
        const text = this.textarea.value;
        const lines = text.split('\n');
        let html = '';

        for (let i = 0; i < lines.length; i++) {
            html += this.highlightLine(lines[i]) + '\n';
        }

        this.highlight.innerHTML = html;
    }

    highlightLine(line) {
        // Simple regex-based syntax highlighting
        let result = this.escapeHtml(line);

        // Comments
        result = result.replace(/(\/\/.*|;.*)$/, '<span class="syn-comment">$1</span>');

        // Don't highlight inside comments
        const commentIdx = line.indexOf('//');
        const semiIdx = line.indexOf(';');
        const commentStart = commentIdx >= 0 ? (semiIdx >= 0 ? Math.min(commentIdx, semiIdx) : commentIdx) : semiIdx;

        if (commentStart >= 0) {
            const before = this.escapeHtml(line.substring(0, commentStart));
            const comment = this.escapeHtml(line.substring(commentStart));
            result = this.highlightCode(before) + '<span class="syn-comment">' + comment + '</span>';
        } else {
            result = this.highlightCode(result);
        }

        return result;
    }

    highlightCode(html) {
        // String literals
        html = html.replace(/"([^"]*)"/g, '<span class="syn-string">"$1"</span>');

        // Label definitions
        html = html.replace(/^(\s*)(\w+)(:)/, '$1<span class="syn-label-def">$2$3</span>');

        // Directives
        html = html.replace(/(\.\w+)/g, '<span class="syn-directive">$1</span>');

        // Vector registers V0-V31 with optional arrangement
        html = html.replace(/\b(V\d{1,2}(?:\.\d+[BDHSQ])?(?:\[\d+\])?)\b/gi,
            '<span class="syn-register">$&</span>');

        // Registers (must come before mnemonics)
        html = html.replace(/\b([XxWw]([0-9]|[12][0-9]|30)|SP|sp|XZR|xzr|WZR|wzr|LR|lr|FP|fp)\b/g,
            '<span class="syn-register">$&</span>');

        // Immediates
        html = html.replace(/(#-?(?:0x[0-9a-fA-F]+|0b[01]+|\d+))/g, '<span class="syn-immediate">$1</span>');
        // Standalone numbers after hash
        html = html.replace(/(?<=#\s*)(-?(?:0x[0-9a-fA-F]+|0b[01]+|\d+))/g, '<span class="syn-immediate">$1</span>');

        // Mnemonics (at start of line or after label)
        const mnemonics = 'MOV|MOVZ|MOVK|MOVN|ADD|ADDS|SUB|SUBS|MUL|SDIV|UDIV|MADD|MSUB|AND|ANDS|ORR|EOR|BIC|BICS|ORN|EON|LSL|LSR|ASR|ROR|NEG|NEGS|MVN|ADC|ADCS|SBC|SBCS|CMP|CMN|TST|LDR|STR|LDRB|STRB|LDRH|STRH|LDRSB|LDRSH|LDRSW|LDP|STP|B\\.\\w+|BL|BR|BLR|RET|CBZ|CBNZ|TBZ|TBNZ|CSEL|CSINC|CSINV|CSNEG|CSET|CSETM|CINC|CINV|CNEG|SVC|NOP|BRK|ADR|ADRP|MSR|MRS|LD1|ST1|DUP|INS|UMOV|MOVI|ADDV|CMEQ|CMGT|CMGE|FADD|FSUB|FMUL|FDIV|NOT';
        const mnRe = new RegExp(`\\b(${mnemonics})\\b(?![.:])`, 'gi');
        html = html.replace(mnRe, (match) => {
            return `<span class="syn-mnemonic" data-mn="${match.toUpperCase()}">${match}</span>`;
        });

        // Also highlight standalone B as mnemonic (tricky because it's one letter)
        html = html.replace(/(?<=^\s*|:\s*)\b(B)\b(?!\.)(?!\w)/gi, '<span class="syn-mnemonic" data-mn="B">$1</span>');

        // Brackets and braces
        html = html.replace(/([[\]!{}])/g, '<span class="syn-bracket">$1</span>');

        return html;
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    setCurrentLine(lineNum) {
        this.currentLine = lineNum;
        this.renderLineNumbers();
    }

    clearCurrentLine() {
        this.currentLine = -1;
        this.renderLineNumbers();
    }

    getBreakpoints() {
        return new Set(this.breakpoints);
    }

    clearBreakpoints() {
        this.breakpoints.clear();
        this.renderLineNumbers();
        if (this.onBreakpointChange) this.onBreakpointChange(this.breakpoints);
    }
}
