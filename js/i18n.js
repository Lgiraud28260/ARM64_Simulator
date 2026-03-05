// i18n.js - Internationalization module
// Supports 'fr' (French) and 'en' (English)

const UI_STRINGS = {
    fr: {
        // Toolbar
        assemble: 'Assembler',
        step: 'Pas',
        stepBack: 'Reculer',
        run: 'Lancer',
        stop: 'Stop',
        reset: 'Reset',
        speed: 'Vitesse :',
        loadExample: 'Charger un exemple...',
        load: '📂 Ouvrir',
        save: '💾 Sauver',
        dualCore: 'Dual Core',
        stepLabel: 'Pas :',

        // Panel headers
        registers: 'Registres',
        neonRegisters: 'NEON V0-V31',
        assemblyEditor: 'Editeur Assembleur',
        machineCode: 'Code Machine',
        memory: 'Memoire',
        cacheL1: 'Cache L1',
        terminal: 'Terminal',
        console: 'Console',
        tutorial: 'Tutoriel',
        casm: 'C↔ASM',
        clear: 'Vider',

        // Console messages
        assembling: 'Assemblage...',
        noSourceCode: 'Pas de code source a assembler',
        assembledSuccess: (n) => `${n} instruction${n !== 1 ? 's' : ''} assemblee${n !== 1 ? 's' : ''} avec succes`,
        assemblyError: (msg) => `Erreur d'assemblage : ${msg}`,
        lineError: (line, msg) => `Ligne ${line} : ${msg}`,
        haltedMessage: 'Le programme est arrete. Faites Reset pour relancer.',
        noHistory: 'Plus d\'historique pour reculer',
        stopped: 'Arrete',
        nothingToSave: 'Rien a sauvegarder',
        savedAs: (name) => `Sauvegarde sous ${name}`,
        saveFailed: (msg) => `Echec sauvegarde : ${msg}`,
        fileSavedAs: (name) => `Fichier sauvegarde sous ${name}`,
        loadedFile: (name) => `Fichier charge : ${name}`,
        loadedExample: (name) => `Exemple charge : ${name}`,
        casmLoaded: 'Code C↔ASM charge — cliquez sur Assembler',
        tutorialLoaded: 'Code du tutoriel charge — cliquez sur Assembler',
        resetComplete: 'Reset termine',
        bothCPUsAssembled: 'Les deux CPUs assembles',
        raceCondition: (addr, step) => `CONDITION DE COURSE @ 0x${addr} (pas ${step})`,

        // CPU messages
        endOfProgram: 'Fin du programme',
        breakpointLine: 'Point d\'arret atteint (ligne)',
        haltedSVC: 'Programme arrete (SVC exit)',
        breakpointHit: 'Point d\'arret atteint',
        maxSteps: 'Nombre max de pas depasse (boucle infinie possible)',

        // Tutorial panel
        chapter: (n) => `Chapitre ${n}`,
        back: '← Retour',
        loadExercise: 'Charger l\'exercice',
        hint: '💡 Indice',
        viewSolution: 'Voir la solution',
        check: '✓ Verifier',
        correct: (reg, val) => `✓ Correct ! ${reg} = ${val}`,
        incorrect: (reg, actual, expected) => `✗ ${reg} = ${actual} (attendu : ${expected})`,

        // C↔ASM panel
        allCategories: 'Toutes les categories',
        loadAsmInEditor: 'Charger l\'ASM dans l\'editeur',

        // Cache panel
        size: 'Taille :',
        line: 'Ligne :',
        assoc: 'Assoc :',
        direct: 'Direct',
        recentAccesses: 'Derniers acces :',
        cacheStats: (h, m, r) => `Succes: ${h} | Echecs: ${m} | Taux: ${r}%`,

        // Multicore panel
        assembleBoth: 'Assembler les 2',
        activeCPU: (id) => `CPU actif : ${id}`,
        noConflict: 'Aucun conflit detecte',
        cpu0Code: '// Code CPU 0 ici...',
        cpu1Code: '// Code CPU 1 ici...',

        // Executor
        unhandledSyscall: (n) => `SVC #0 : syscall non gere ${n}\n`,

        // Misc
        error: (msg) => `Erreur : ${msg}`,
    },

    en: {
        // Toolbar
        assemble: 'Assemble',
        step: 'Step',
        stepBack: 'Step Back',
        run: 'Run',
        stop: 'Stop',
        reset: 'Reset',
        speed: 'Speed:',
        loadExample: 'Load Example...',
        load: '📂 Load',
        save: '💾 Save',
        dualCore: 'Dual Core',
        stepLabel: 'Step:',

        // Panel headers
        registers: 'Registers',
        neonRegisters: 'NEON V0-V31',
        assemblyEditor: 'Assembly Editor',
        machineCode: 'Machine Code',
        memory: 'Memory',
        cacheL1: 'L1 Cache',
        terminal: 'Terminal',
        console: 'Console',
        tutorial: 'Tutorial',
        casm: 'C↔ASM',
        clear: 'Clear',

        // Console messages
        assembling: 'Assembling...',
        noSourceCode: 'No source code to assemble',
        assembledSuccess: (n) => `Assembled ${n} instruction${n !== 1 ? 's' : ''} successfully`,
        assemblyError: (msg) => `Assembly error: ${msg}`,
        lineError: (line, msg) => `Line ${line}: ${msg}`,
        haltedMessage: 'Program has halted. Reset to run again.',
        noHistory: 'No more history to step back',
        stopped: 'Stopped',
        nothingToSave: 'Nothing to save',
        savedAs: (name) => `Saved as ${name}`,
        saveFailed: (msg) => `Save failed: ${msg}`,
        fileSavedAs: (name) => `File saved as ${name}`,
        loadedFile: (name) => `Loaded file: ${name}`,
        loadedExample: (name) => `Loaded example: ${name}`,
        casmLoaded: 'C↔ASM code loaded — click Assemble',
        tutorialLoaded: 'Tutorial code loaded — click Assemble',
        resetComplete: 'Reset complete',
        bothCPUsAssembled: 'Both CPUs assembled',
        raceCondition: (addr, step) => `RACE CONDITION @ 0x${addr} (step ${step})`,

        // CPU messages
        endOfProgram: 'End of program',
        breakpointLine: 'Breakpoint hit (line)',
        haltedSVC: 'Program halted (SVC exit)',
        breakpointHit: 'Breakpoint hit',
        maxSteps: 'Maximum step count exceeded (possible infinite loop)',

        // Tutorial panel
        chapter: (n) => `Chapter ${n}`,
        back: '← Back',
        loadExercise: 'Load exercise',
        hint: '💡 Hint',
        viewSolution: 'View solution',
        check: '✓ Check',
        correct: (reg, val) => `✓ Correct! ${reg} = ${val}`,
        incorrect: (reg, actual, expected) => `✗ ${reg} = ${actual} (expected: ${expected})`,

        // C↔ASM panel
        allCategories: 'All categories',
        loadAsmInEditor: 'Load ASM into editor',

        // Cache panel
        size: 'Size:',
        line: 'Line:',
        assoc: 'Assoc:',
        direct: 'Direct',
        recentAccesses: 'Recent accesses:',
        cacheStats: (h, m, r) => `Hits: ${h} | Misses: ${m} | Rate: ${r}%`,

        // Multicore panel
        assembleBoth: 'Assemble Both',
        activeCPU: (id) => `Active CPU: ${id}`,
        noConflict: 'No conflict detected',
        cpu0Code: '// CPU 0 code here...',
        cpu1Code: '// CPU 1 code here...',

        // Executor
        unhandledSyscall: (n) => `SVC #0: unhandled syscall ${n}\n`,

        // Misc
        error: (msg) => `Error: ${msg}`,
    }
};

class I18n {
    constructor() {
        this.lang = localStorage.getItem('arm64sim-lang') || 'fr';
        this.listeners = [];
    }

    t(key) {
        return UI_STRINGS[this.lang]?.[key] ?? UI_STRINGS['en']?.[key] ?? key;
    }

    setLang(lang) {
        this.lang = lang;
        localStorage.setItem('arm64sim-lang', lang);
        this.listeners.forEach(fn => fn(lang));
    }

    getLang() {
        return this.lang;
    }

    onChange(fn) {
        this.listeners.push(fn);
    }
}

export const i18n = new I18n();
