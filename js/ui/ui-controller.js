// ui-controller.js - Central coordinator
import { RegisterFile } from '../registers.js';
import { Memory } from '../memory.js';
import { Assembler } from '../assembler/assembler.js';
import { CPU } from '../cpu/cpu.js';
import { Editor } from './editor.js';
import { RegistersView } from './registers-view.js';
import { MemoryView } from './memory-view.js';
import { MachineCodeView } from './machine-code-view.js';
import { ConsoleView } from './console-view.js';
import { TerminalView } from './terminal-view.js';
import { Toolbar } from './toolbar.js';
import { NEONRegistersView } from './neon-view.js';
import { TutorialPanel } from './tutorial-panel.js';
import { EXAMPLES } from '../../examples/examples.js';

export class UIController {
    constructor() {
        this.registers = new RegisterFile();
        this.memory = new Memory();
        this.assembler = new Assembler();
        this.cpu = new CPU(this.registers, this.memory);
        this.assemblerResult = null;

        // UI components
        this.editor = new Editor(document.getElementById('editor-panel'));
        this.registersView = new RegistersView(
            document.getElementById('registers-panel'), this.registers);
        this.memoryView = new MemoryView(
            document.getElementById('memory-panel'), this.memory);
        this.machineCodeView = new MachineCodeView(
            document.getElementById('machine-code-panel'));
        this.consoleView = new ConsoleView(
            document.getElementById('console-panel'));
        this.terminalView = new TerminalView(
            document.getElementById('terminal-panel'));
        this.neonView = new NEONRegistersView(
            document.getElementById('neon-registers-panel'), this.registers);

        this.tutorialPanel = new TutorialPanel(
            document.getElementById('tutorial-content'), {
                onLoadCode: (code) => {
                    this.editor.setValue(code);
                    this.consoleView.clear();
                    this.consoleView.info('Tutorial code loaded — click Assemble');
                    this.cpu.reset();
                    this.toolbar.enableExecution(false);
                    this.machineCodeView.setInstructions([]);
                    this.updateUI();
                },
                onCheckResult: (check) => {
                    const regName = check.reg.toUpperCase();
                    let actual;
                    if (regName === 'PC') {
                        actual = this.registers.getPC();
                    } else if (regName === 'SP') {
                        actual = this.registers.getSP();
                    } else {
                        const idx = parseInt(regName.replace(/^[XW]/, ''), 10);
                        actual = this.registers.getX(idx);
                    }
                    const actualNum = typeof actual === 'bigint' ? actual : BigInt(actual);
                    let expectedNum;
                    const exp = check.expected;
                    if (typeof exp === 'string' && exp.startsWith('0x')) {
                        expectedNum = BigInt(exp);
                    } else if (typeof exp === 'string' && exp.startsWith('-')) {
                        // Negative: convert to unsigned 64-bit
                        expectedNum = BigInt(exp) & BigInt('0xFFFFFFFFFFFFFFFF');
                    } else {
                        expectedNum = BigInt(exp);
                    }
                    return {
                        pass: actualNum === expectedNum,
                        actual: actualNum.toString()
                    };
                }
            }
        );

        // NEON view selector buttons
        document.querySelectorAll('.neon-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.neon-view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.neonView.setArrangement(btn.dataset.arr);
            });
        });

        this.toolbar = new Toolbar({
            onAssemble: () => this.assemble(),
            onStep: () => this.step(),
            onStepBack: () => this.stepBack(),
            onRunStop: () => this.runStop(),
            onReset: () => this.reset(),
            onSpeedChange: (speed) => this.cpu.setSpeed(speed),
            onLoadExample: (name) => this.loadExample(name),
            onLoadFile: (name, content) => this.loadFile(name, content),
        });

        // Load file button — direct wiring
        const btnLoadFile = document.getElementById('btn-load-file');
        if (btnLoadFile) {
            btnLoadFile.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.s,.asm,.S,.txt';
                input.onchange = () => {
                    const file = input.files[0];
                    if (!file) return;
                    file.text().then(content => this.loadFile(file.name, content));
                };
                input.click();
            });
        }

        // Save file button
        const btnSaveFile = document.getElementById('btn-save-file');
        if (btnSaveFile) {
            btnSaveFile.addEventListener('click', () => this.saveFile());
        }

        // CPU callbacks
        this.cpu.onStep = (count) => {
            this.updateUI();
            this.toolbar.setStepCount(count);
        };
        this.cpu.onHalt = (msg) => {
            this.consoleView.info(msg);
            this.toolbar.setRunning(false);
            this.toolbar.setStatus('halted');
            this.updateUI();
        };
        this.cpu.onError = (msg) => {
            this.consoleView.error(`Error: ${msg}`);
            this.toolbar.setRunning(false);
            this.toolbar.setStatus('error');
            this.updateUI();
        };
        this.cpu.setConsoleOutput((text) => this.terminalView.write(text));

        // Breakpoint callback
        this.editor.onBreakpointChange = () => this.updateBreakpointAddresses();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Initial state
        this.toolbar.enableExecution(false);
        this.toolbar.setStatus('idle');

        // Load default example
        if (EXAMPLES.length > 0) {
            this.loadExample(EXAMPLES[0].name);
        }

        this.updateUI();
    }

    assemble() {
        this.consoleView.clear();
        this.terminalView.clear();
        this.consoleView.info('Assembling...');

        const source = this.editor.getValue();
        if (!source.trim()) {
            this.consoleView.warn('No source code to assemble');
            return;
        }

        try {
            this.assemblerResult = this.assembler.assemble(source);

            if (this.assemblerResult.errors.length > 0) {
                for (const err of this.assemblerResult.errors) {
                    this.consoleView.error(`Line ${err.line}: ${err.message}`);
                }
                this.toolbar.enableExecution(false);
                return;
            }

            const count = this.assemblerResult.instructions.length;
            this.consoleView.success(`Assembled ${count} instruction${count !== 1 ? 's' : ''} successfully`);

            // Load into CPU
            this.cpu.loadProgram(this.assemblerResult);

            // Update machine code view
            this.machineCodeView.setInstructions(this.assemblerResult.instructions);

            // Enable execution
            this.toolbar.enableExecution(true);
            this.toolbar.setStatus('idle');
            this.toolbar.setStepCount(0);

            // Recalculate breakpoint addresses with new sourceMap
            this.updateBreakpointAddresses();

            this.updateUI();
        } catch (e) {
            this.consoleView.error(`Assembly error: ${e.message}`);
            this.toolbar.enableExecution(false);
        }
    }

    step() {
        if (this.cpu.halted) {
            this.consoleView.warn('Program has halted. Reset to run again.');
            return;
        }
        this.cpu.step();
        this.updateUI();
    }

    stepBack() {
        if (!this.cpu.stepBack()) {
            this.consoleView.warn('No more history to step back');
            return;
        }
        this.updateUI();
    }

    runStop() {
        if (this.cpu.running) {
            this.cpu.stop();
            this.toolbar.setRunning(false);
            this.toolbar.setStatus('idle');
            this.consoleView.info('Stopped');
        } else {
            if (this.cpu.halted) {
                this.consoleView.warn('Program has halted. Reset to run again.');
                return;
            }
            this.cpu.run();
            this.toolbar.setRunning(true);
            this.toolbar.setStatus('running');
        }
    }

    reset() {
        this.cpu.stop();
        this.toolbar.setRunning(false);

        if (this.assemblerResult && this.assemblerResult.errors.length === 0) {
            this.cpu.loadProgram(this.assemblerResult);
            this.toolbar.enableExecution(true);
            this.toolbar.setStatus('idle');
            this.toolbar.setStepCount(0);
            this.consoleView.clear();
            this.terminalView.clear();
            this.consoleView.info('Reset complete');
        } else {
            this.cpu.reset();
            this.toolbar.enableExecution(false);
            this.toolbar.setStatus('idle');
        }

        this.editor.clearCurrentLine();
        this.updateUI();
    }

    async saveFile() {
        const code = this.editor.getValue();
        if (!code.trim()) {
            this.consoleView.warn('Nothing to save');
            return;
        }
        // Use File System Access API if available (Chrome/Edge)
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'program.s',
                    types: [{
                        description: 'ARM64 Assembly',
                        accept: { 'text/plain': ['.s', '.asm', '.S', '.txt'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(code);
                await writable.close();
                this.consoleView.info(`Saved as ${handle.name}`);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    this.consoleView.error(`Save failed: ${e.message}`);
                }
            }
        } else {
            // Fallback for Safari/Firefox
            const blob = new Blob([code], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'program.s';
            a.click();
            URL.revokeObjectURL(a.href);
            this.consoleView.info('File saved as program.s');
        }
    }

    loadFile(name, content) {
        this.editor.setValue(content);
        this.consoleView.clear();
        this.consoleView.info(`Loaded file: ${name}`);
        this.cpu.reset();
        this.toolbar.enableExecution(false);
        this.machineCodeView.setInstructions([]);
        this.updateUI();
    }

    loadExample(name) {
        const example = EXAMPLES.find(e => e.name === name);
        if (example) {
            this.editor.setValue(example.code);
            this.consoleView.clear();
            this.consoleView.info(`Loaded example: ${example.name}`);
            this.cpu.reset();
            this.toolbar.enableExecution(false);
            this.machineCodeView.setInstructions([]);
            this.updateUI();
        }
    }

    handleKeyboard(e) {
        // F5 = Run/Stop, F10 = Step, F9 = toggle breakpoint
        // Shift+F10 = Step Back, Ctrl+Shift+A = Assemble, Ctrl+R = Reset
        if (e.key === 'F5') {
            e.preventDefault();
            this.runStop();
        } else if (e.key === 'F10' && !e.shiftKey) {
            e.preventDefault();
            this.step();
        } else if (e.key === 'F10' && e.shiftKey) {
            e.preventDefault();
            this.stepBack();
        } else if (e.key === 'F9') {
            e.preventDefault();
            // Toggle breakpoint on current editor cursor line
            const textarea = this.editor.textarea;
            const lineNum = textarea.value.substring(0, textarea.selectionStart).split('\n').length;
            if (this.editor.breakpoints.has(lineNum)) {
                this.editor.breakpoints.delete(lineNum);
            } else {
                this.editor.breakpoints.add(lineNum);
            }
            this.editor.renderLineNumbers();
            this.updateBreakpointAddresses();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.assemble();
        } else if (e.key === 'r' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
            e.preventDefault();
            this.reset();
        } else if (e.key === 's' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            this.saveFile();
        }
    }

    updateBreakpointAddresses() {
        if (!this.assemblerResult) {
            this.cpu.setBreakpoints(new Set());
            return;
        }
        const sm = this.assemblerResult.sourceMap; // address → line
        const bpLines = this.editor.getBreakpoints();
        const addresses = new Set();
        for (const [addr, line] of Object.entries(sm)) {
            if (bpLines.has(line)) {
                addresses.add(Number(addr));
            }
        }
        this.cpu.setBreakpoints(addresses);
    }

    updateUI() {
        this.registersView.update();
        this.neonView.update();
        this.memoryView.update();

        // Update PC highlighting
        const pc = Number(this.registers.getPC());
        this.machineCodeView.setPC(pc);

        // Highlight current line in editor
        if (this.assemblerResult && this.assemblerResult.sourceMap[pc] !== undefined) {
            this.editor.setCurrentLine(this.assemblerResult.sourceMap[pc]);
        } else {
            this.editor.clearCurrentLine();
        }
    }
}
