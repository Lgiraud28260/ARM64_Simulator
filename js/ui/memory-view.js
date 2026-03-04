// memory-view.js - Memory panel with segment tabs
import { SEGMENTS } from '../memory.js';

export class MemoryView {
    constructor(container, memory) {
        this.container = container;
        this.memory = memory;
        this.currentSegment = 'CODE';
        this.bytesPerRow = 8;
        this.build();
    }

    build() {
        const header = this.container.querySelector('.panel-header');
        const tabs = document.createElement('div');
        tabs.className = 'memory-tabs';
        tabs.innerHTML = Object.keys(SEGMENTS).map(seg =>
            `<button class="memory-tab${seg === this.currentSegment ? ' active' : ''}" data-seg="${seg}">${seg}</button>`
        ).join('');
        header.appendChild(tabs);

        tabs.addEventListener('click', (e) => {
            const seg = e.target.dataset.seg;
            if (seg) {
                this.currentSegment = seg;
                tabs.querySelectorAll('.memory-tab').forEach(t =>
                    t.classList.toggle('active', t.dataset.seg === seg));
                this.update();
            }
        });
    }

    update() {
        const body = this.container.querySelector('.panel-body');
        const seg = SEGMENTS[this.currentSegment];
        let html = '';
        const rows = Math.min(Math.ceil(seg.size / this.bytesPerRow), 64); // Limit display rows

        for (let row = 0; row < rows; row++) {
            const addr = seg.start + row * this.bytesPerRow;
            const bytes = this.memory.getRange(addr, this.bytesPerRow);

            const hexBytes = bytes.map(b =>
                `<span class="mem-byte${b !== 0 ? ' nonzero' : ''}">${b.toString(16).padStart(2, '0').toUpperCase()}</span>`
            ).join(' ');

            const ascii = bytes.map(b =>
                (b >= 32 && b < 127) ? String.fromCharCode(b) : '.'
            ).join('');

            html += `<div class="memory-row">
                <span class="mem-addr">0x${addr.toString(16).toUpperCase().padStart(5, '0')}</span>
                <span class="mem-bytes">${hexBytes}</span>
                <span class="mem-ascii">${ascii}</span>
            </div>`;
        }

        body.innerHTML = html;
    }
}
