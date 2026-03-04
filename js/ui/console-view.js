// console-view.js - Output/error console

export class ConsoleView {
    constructor(container) {
        this.container = container;
        this.output = document.getElementById('console-output');
    }

    clear() {
        if (this.output) this.output.innerHTML = '';
    }

    log(message, type = 'output') {
        if (!this.output) return;
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = message;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }

    info(message) { this.log(message, 'info'); }
    warn(message) { this.log(message, 'warn'); }
    error(message) { this.log(message, 'error'); }
    success(message) { this.log(message, 'success'); }

    // For SVC write output
    write(text) {
        if (!this.output) return;
        // Append to last output line if exists, or create new one
        const last = this.output.lastElementChild;
        if (last && last.classList.contains('output') && !last.textContent.endsWith('\n')) {
            last.textContent += text;
        } else {
            const line = document.createElement('div');
            line.className = 'console-line output';
            line.textContent = text;
            this.output.appendChild(line);
        }
        this.output.scrollTop = this.output.scrollHeight;
    }
}
