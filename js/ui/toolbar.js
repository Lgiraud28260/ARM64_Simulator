// toolbar.js - Toolbar controls

export class Toolbar {
    constructor(callbacks) {
        this.callbacks = callbacks;

        this.btnAssemble = document.getElementById('btn-assemble');
        this.btnStep = document.getElementById('btn-step');
        this.btnStepBack = document.getElementById('btn-step-back');
        this.btnRun = document.getElementById('btn-run');
        this.btnReset = document.getElementById('btn-reset');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedLabel = document.getElementById('speed-label');
        this.exampleSelect = document.getElementById('example-select');
        this.statusIndicator = document.getElementById('status-indicator');
        this.stepCounter = document.getElementById('step-counter');

        this.bind();
    }

    bind() {
        this.btnAssemble?.addEventListener('click', () => this.callbacks.onAssemble?.());
        this.btnStep?.addEventListener('click', () => this.callbacks.onStep?.());
        this.btnStepBack?.addEventListener('click', () => this.callbacks.onStepBack?.());
        this.btnRun?.addEventListener('click', () => this.callbacks.onRunStop?.());
        this.btnReset?.addEventListener('click', () => this.callbacks.onReset?.());

        this.speedSlider?.addEventListener('input', () => {
            const speed = this.getSpeed();
            if (this.speedLabel) this.speedLabel.textContent = `${speed}`;
            this.callbacks.onSpeedChange?.(speed);
        });

        this.exampleSelect?.addEventListener('change', () => {
            const val = this.exampleSelect.value;
            if (val) this.callbacks.onLoadExample?.(val);
        });
    }

    getSpeed() {
        const val = parseInt(this.speedSlider?.value || '50');
        // Exponential scale: 1-1000 steps/sec
        if (val <= 50) return Math.max(1, Math.floor(val / 5));
        return Math.floor(Math.pow(10, (val - 50) / 25));
    }

    setRunning(running) {
        if (this.btnRun) {
            this.btnRun.textContent = running ? 'Stop' : 'Run';
            this.btnRun.classList.toggle('danger', running);
        }
        this.btnStep && (this.btnStep.disabled = running);
        this.btnStepBack && (this.btnStepBack.disabled = running);
        this.btnAssemble && (this.btnAssemble.disabled = running);
    }

    setStatus(status) {
        if (this.statusIndicator) {
            this.statusIndicator.className = `status-indicator ${status}`;
        }
    }

    setStepCount(count) {
        if (this.stepCounter) {
            this.stepCounter.textContent = `Step: ${count}`;
        }
    }

    enableExecution(enabled) {
        this.btnStep && (this.btnStep.disabled = !enabled);
        this.btnRun && (this.btnRun.disabled = !enabled);
        this.btnStepBack && (this.btnStepBack.disabled = !enabled);
    }
}
