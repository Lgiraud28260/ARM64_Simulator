// cache-view.js - Cache simulator visualization
import { i18n } from '../i18n.js';

export class CacheView {
    constructor(container, cache) {
        this.container = container;
        this.cache = cache;
        this.build();
        i18n.onChange(() => this.build());
    }

    build() {
        const body = this.container.querySelector('.panel-body');
        body.innerHTML = `
            <div class="cache-controls">
                <label>${i18n.t('size')}
                    <select id="cache-size">
                        <option value="256" selected>256B</option>
                        <option value="512">512B</option>
                        <option value="1024">1KB</option>
                    </select>
                </label>
                <label>${i18n.t('line')}
                    <select id="cache-line-size">
                        <option value="16" selected>16B</option>
                        <option value="32">32B</option>
                    </select>
                </label>
                <label>${i18n.t('assoc')}
                    <select id="cache-assoc">
                        <option value="1" selected>${i18n.t('direct')}</option>
                        <option value="2">2-way</option>
                        <option value="4">4-way</option>
                    </select>
                </label>
                <button class="toolbar-btn" id="cache-reset" style="padding:2px 6px;font-size:10px">Reset</button>
            </div>
            <div class="cache-stats" id="cache-stats">Hits: 0 | Misses: 0 | Rate: 0%</div>
            <div class="cache-grid" id="cache-grid"></div>
            <div class="cache-log-title">${i18n.t('recentAccesses')}</div>
            <div class="cache-log" id="cache-log"></div>
        `;

        // Event listeners
        const reconfigure = () => {
            const size = parseInt(document.getElementById('cache-size').value);
            const lineSize = parseInt(document.getElementById('cache-line-size').value);
            const assoc = parseInt(document.getElementById('cache-assoc').value);
            this.cache.configure(size, lineSize, assoc);
            this.update();
        };

        body.querySelector('#cache-size').addEventListener('change', reconfigure);
        body.querySelector('#cache-line-size').addEventListener('change', reconfigure);
        body.querySelector('#cache-assoc').addEventListener('change', reconfigure);
        body.querySelector('#cache-reset').addEventListener('click', () => {
            this.cache.reset();
            this.update();
        });
    }

    update() {
        // Stats
        const stats = this.cache.getStats();
        const statsEl = document.getElementById('cache-stats');
        if (statsEl) {
            statsEl.textContent = i18n.t('cacheStats')(stats.hits, stats.misses, stats.hitRate.toFixed(1));
        }

        // Grid
        const gridEl = document.getElementById('cache-grid');
        if (gridEl) {
            const lines = this.cache.getLines();
            const lastAccess = this.cache.accessLog.length > 0
                ? this.cache.accessLog[this.cache.accessLog.length - 1]
                : null;

            let html = '';
            for (const line of lines) {
                let cls = 'cache-cell empty';
                if (line.valid) {
                    const isLastAccess = lastAccess &&
                        lastAccess.set === line.set &&
                        lastAccess.tag === line.tag;
                    if (isLastAccess) {
                        cls = lastAccess.hit ? 'cache-cell hit' : 'cache-cell miss';
                    } else {
                        cls = 'cache-cell valid';
                    }
                }
                const label = line.valid
                    ? `S${line.set}${this.cache.associativity > 1 ? 'W' + line.way : ''}`
                    : `S${line.set}`;
                const tag = line.valid ? `T:${line.tag.toString(16).toUpperCase()}` : '';
                html += `<div class="${cls}" title="Set ${line.set}, Way ${line.way}, Tag 0x${line.tag.toString(16)}">${label}<br><span class="cache-tag">${tag}</span></div>`;
            }
            gridEl.innerHTML = html;
        }

        // Log
        const logEl = document.getElementById('cache-log');
        if (logEl) {
            const recent = this.cache.accessLog.slice(-8).reverse();
            logEl.innerHTML = recent.map(e => {
                const type = e.isWrite ? 'W' : 'R';
                const result = e.hit ? '<span class="cache-hit">HIT</span>' : '<span class="cache-miss">MISS</span>';
                return `<div class="cache-log-entry">${type} 0x${e.addr.toString(16).toUpperCase()} → S${e.set} ${result}</div>`;
            }).join('');
        }
    }
}
