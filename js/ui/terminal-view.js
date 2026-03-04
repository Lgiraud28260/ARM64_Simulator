// terminal-view.js - Dedicated terminal for program output (SVC write)

export class TerminalView {
    constructor(container) {
        this.container = container;
        this.output = document.getElementById('terminal-output');
        this.cursor = this.output?.querySelector('.terminal-cursor');
        this.buffer = '';

        document.getElementById('btn-clear-terminal')?.addEventListener('click', () => this.clear());
    }

    clear() {
        if (!this.output) return;
        this.output.innerHTML = '';
        this.buffer = '';
        this._addCursor();
    }

    // Write raw text from SVC write syscall
    write(text) {
        if (!this.output) return;

        // Remove cursor before writing
        this.cursor?.remove();

        // Process text character by character for proper terminal behavior
        for (const ch of text) {
            if (ch === '\n') {
                this._finishCurrentLine();
                this._newLine();
            } else if (ch === '\r') {
                // Carriage return: move to start of current line
                this.buffer = '';
            } else if (ch === '\t') {
                this.buffer += '    ';
            } else if (ch === '\0') {
                // Null terminator: ignore
            } else {
                this.buffer += ch;
            }
        }

        // Flush buffer to current line
        this._flushBuffer();

        // Re-add cursor
        this._addCursor();

        // Scroll to bottom
        this.output.scrollTop = this.output.scrollHeight;
    }

    // Print a value (convenience for debugging)
    print(value) {
        this.write(String(value));
    }

    // Print a line (with newline)
    println(value) {
        this.write(String(value) + '\n');
    }

    _flushBuffer() {
        if (this.buffer.length === 0) return;

        // Get or create current line element
        let currentLine = this.output.lastElementChild;
        if (!currentLine || currentLine.classList.contains('terminal-cursor') || currentLine.dataset.complete === '1') {
            currentLine = document.createElement('div');
            currentLine.className = 'terminal-line';
            // Insert before cursor if it exists
            if (this.cursor?.parentNode === this.output) {
                this.output.insertBefore(currentLine, this.cursor);
            } else {
                this.output.appendChild(currentLine);
            }
        }

        currentLine.textContent += this.buffer;
        this.buffer = '';
    }

    _finishCurrentLine() {
        this._flushBuffer();
        const currentLine = this._getCurrentLine();
        if (currentLine) {
            currentLine.dataset.complete = '1';
        }
    }

    _newLine() {
        // The next write will create a new line element
    }

    _getCurrentLine() {
        const children = this.output.children;
        for (let i = children.length - 1; i >= 0; i--) {
            if (children[i].classList.contains('terminal-line')) {
                return children[i];
            }
        }
        return null;
    }

    _addCursor() {
        if (!this.output) return;
        this.cursor = document.createElement('span');
        this.cursor.className = 'terminal-cursor';
        this.output.appendChild(this.cursor);
    }
}
