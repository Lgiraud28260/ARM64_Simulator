// tutorial-panel.js - Interactive tutorial mode
import { getTutorials } from '../tutorials.js';
import { i18n } from '../i18n.js';

export class TutorialPanel {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks; // { onLoadCode, onCheckResult }
        this.current = null;
        this.render();
        i18n.onChange(() => this.render());
    }

    render() {
        this.container.innerHTML = '';
        const tutorials = getTutorials();

        // Chapter selector
        const nav = document.createElement('div');
        nav.className = 'tutorial-nav';

        const chapters = [...new Set(tutorials.map(t => t.chapter))];
        for (const ch of chapters) {
            const btn = document.createElement('button');
            btn.className = 'tutorial-ch-btn';
            btn.textContent = ch;
            btn.title = i18n.t('chapter')(ch);
            btn.addEventListener('click', () => this.showChapter(ch));
            nav.appendChild(btn);
        }
        this.container.appendChild(nav);

        // Exercise list
        this.listEl = document.createElement('div');
        this.listEl.className = 'tutorial-list';
        this.container.appendChild(this.listEl);

        // Exercise detail
        this.detailEl = document.createElement('div');
        this.detailEl.className = 'tutorial-detail';
        this.detailEl.style.display = 'none';
        this.container.appendChild(this.detailEl);

        this.showChapter(1);
    }

    showChapter(ch) {
        const tutorials = getTutorials();
        // Highlight active chapter button
        this.container.querySelectorAll('.tutorial-ch-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.textContent) === ch);
        });

        const exercises = tutorials.filter(t => t.chapter === ch);
        this.listEl.innerHTML = '';
        this.listEl.style.display = '';
        this.detailEl.style.display = 'none';

        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            const row = document.createElement('div');
            row.className = 'tutorial-item';
            row.innerHTML = `<span class="tutorial-item-num">${ex.chapter}.${i + 1}</span> ${ex.title}`;
            row.addEventListener('click', () => this.showExercise(ex, `${ex.chapter}.${i + 1}`));
            this.listEl.appendChild(row);
        }
    }

    showExercise(ex, num) {
        this.current = ex;
        this.listEl.style.display = 'none';
        this.detailEl.style.display = 'flex';

        this.detailEl.innerHTML = `
            <div class="tutorial-header">
                <button class="tutorial-back-btn">${i18n.t('back')}</button>
                <span class="tutorial-num">${num}</span>
            </div>
            <div class="tutorial-title">${ex.title}</div>
            <div class="tutorial-desc">${ex.description}</div>
            <div class="tutorial-actions">
                <button class="toolbar-btn tutorial-btn" id="tut-load">${i18n.t('loadExercise')}</button>
                <button class="toolbar-btn tutorial-btn" id="tut-hint">${i18n.t('hint')}</button>
                <button class="toolbar-btn tutorial-btn" id="tut-solution">${i18n.t('viewSolution')}</button>
                <button class="toolbar-btn primary tutorial-btn" id="tut-check">${i18n.t('check')}</button>
            </div>
            <div class="tutorial-hint" style="display:none">${ex.hint}</div>
            <div class="tutorial-result"></div>
        `;

        this.detailEl.querySelector('.tutorial-back-btn').addEventListener('click', () => {
            this.listEl.style.display = '';
            this.detailEl.style.display = 'none';
        });

        this.detailEl.querySelector('#tut-load').addEventListener('click', () => {
            this.callbacks.onLoadCode(ex.code);
        });

        this.detailEl.querySelector('#tut-hint').addEventListener('click', () => {
            const hintEl = this.detailEl.querySelector('.tutorial-hint');
            hintEl.style.display = hintEl.style.display === 'none' ? '' : 'none';
        });

        this.detailEl.querySelector('#tut-solution').addEventListener('click', () => {
            this.callbacks.onLoadCode(ex.solution);
        });

        this.detailEl.querySelector('#tut-check').addEventListener('click', () => {
            this.checkResult();
        });
    }

    checkResult() {
        if (!this.current) return;
        const result = this.callbacks.onCheckResult(this.current.check);
        const el = this.detailEl.querySelector('.tutorial-result');
        if (result.pass) {
            el.innerHTML = `<span class="tutorial-pass">${i18n.t('correct')(this.current.check.reg, result.actual)}</span>`;
        } else {
            el.innerHTML = `<span class="tutorial-fail">${i18n.t('incorrect')(this.current.check.reg, result.actual, this.current.check.expected)}</span>`;
        }
    }
}
