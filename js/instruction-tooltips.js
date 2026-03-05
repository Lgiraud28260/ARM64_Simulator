// instruction-tooltips.js - Descriptions courtes et claires des instructions ARM64
export const TOOLTIPS = {
    // Déplacement de données
    MOV:   "Copie une valeur dans un registre. Ex: MOV X0, #5 → X0 vaut 5",
    MOVZ:  "Charge un nombre 16 bits (les autres bits à zéro). Ex: MOVZ X0, #0xFFFF",
    MOVK:  "Insère 16 bits à une position sans toucher le reste. Ex: MOVK X0, #0xCAFE, LSL #16",
    MOVN:  "Charge l'inverse bit à bit d'un nombre. MOVN X0, #0 → X0 = -1",

    // Arithmétique
    ADD:   "Addition. Ex: ADD X0, X1, #10 → X0 = X1 + 10",
    ADDS:  "Addition + mise à jour des flags NZCV",
    SUB:   "Soustraction. Ex: SUB X0, X1, X2 → X0 = X1 - X2",
    SUBS:  "Soustraction + mise à jour des flags NZCV",
    MUL:   "Multiplication. Ex: MUL X0, X1, X2 → X0 = X1 × X2",
    SDIV:  "Division signée (avec signe). Ex: SDIV X0, X1, X2 → X0 = X1 / X2",
    UDIV:  "Division non signée (positive). Ex: UDIV X0, X1, X2 → X0 = X1 / X2",
    MADD:  "Multiplie puis ajoute. MADD Xd, Xn, Xm, Xa → Xd = Xa + Xn × Xm",
    MSUB:  "Multiplie puis soustrait. MSUB Xd, Xn, Xm, Xa → Xd = Xa - Xn × Xm. Utile pour le modulo",
    NEG:   "Négatif. NEG X0, X1 → X0 = -X1",
    NEGS:  "Négatif + mise à jour des flags",
    ADC:   "Addition avec retenue (carry). ADC Xd, Xn, Xm → Xd = Xn + Xm + C",
    ADCS:  "Addition avec retenue + flags",
    SBC:   "Soustraction avec retenue. SBC Xd, Xn, Xm → Xd = Xn - Xm - !C",
    SBCS:  "Soustraction avec retenue + flags",

    // Comparaison
    CMP:   "Compare deux valeurs (soustraction sans stocker le résultat, met à jour les flags). Ex: CMP X0, #10",
    CMN:   "Compare par addition (addition sans stocker, met à jour les flags)",
    TST:   "Teste des bits (AND sans stocker le résultat, met à jour les flags). Ex: TST X0, #1 → teste si impair",

    // Logique
    AND:   "ET logique bit à bit. Ex: AND X0, X1, #0xFF → garde les 8 bits bas",
    ANDS:  "ET logique + mise à jour des flags",
    ORR:   "OU logique bit à bit. Ex: ORR X0, X1, X2 → combine les bits",
    EOR:   "OU exclusif (XOR) bit à bit. Ex: EOR X0, X1, X2 → inverse les bits différents",
    BIC:   "Efface des bits. BIC X0, X1, #0xF → met à zéro les 4 bits bas de X1",
    BICS:  "Efface des bits + flags",
    ORN:   "OU avec l'inverse. ORN Xd, Xn, Xm → Xd = Xn | ~Xm",
    EON:   "XOR avec l'inverse. EON Xd, Xn, Xm → Xd = Xn ^ ~Xm",
    MVN:   "Inverse tous les bits. MVN X0, X1 → X0 = ~X1",

    // Décalages
    LSL:   "Décalage à gauche (× puissance de 2). Ex: LSL X0, X1, #3 → X0 = X1 × 8",
    LSR:   "Décalage à droite non signé (÷ puissance de 2). Ex: LSR X0, X1, #2 → X0 = X1 / 4",
    ASR:   "Décalage à droite signé (préserve le signe). Ex: ASR X0, X1, #1 → division par 2 signée",
    ROR:   "Rotation à droite : les bits qui sortent reviennent par le haut",

    // Chargement / Stockage mémoire
    LDR:   "Lit une valeur depuis la mémoire. Ex: LDR X0, [X1] → X0 = mémoire à l'adresse X1",
    STR:   "Écrit une valeur en mémoire. Ex: STR X0, [X1] → mémoire à l'adresse X1 = X0",
    LDRB:  "Lit 1 octet depuis la mémoire (8 bits, étendu à zéro)",
    STRB:  "Écrit 1 octet en mémoire (8 bits bas du registre)",
    LDRH:  "Lit 2 octets depuis la mémoire (16 bits, étendu à zéro)",
    STRH:  "Écrit 2 octets en mémoire (16 bits bas du registre)",
    LDRSB: "Lit 1 octet signé (étend le bit de signe à 64 bits)",
    LDRSH: "Lit 2 octets signés (étend le bit de signe à 64 bits)",
    LDRSW: "Lit 4 octets signés (étend le bit de signe de 32 à 64 bits)",
    LDP:   "Lit une paire de registres depuis la mémoire. Ex: LDP X0, X1, [SP]",
    STP:   "Écrit une paire de registres en mémoire. Ex: STP X0, X1, [SP, #-16]!",

    // Branchements
    B:     "Saut inconditionnel vers un label. Ex: B boucle",
    BL:    "Appel de fonction : sauvegarde l'adresse de retour dans LR, puis saute. Ex: BL ma_fonction",
    BR:    "Saut vers l'adresse contenue dans un registre. Ex: BR X0",
    BLR:   "Appel de fonction via registre : LR = adresse suivante, saute vers Xn",
    RET:   "Retour de fonction : saute à l'adresse dans LR (X30)",
    CBZ:   "Saute si le registre vaut zéro. Ex: CBZ X0, fin → si X0 == 0, va à fin",
    CBNZ:  "Saute si le registre n'est PAS zéro. Ex: CBNZ X0, boucle",
    TBZ:   "Saute si un bit spécifique est à 0. Ex: TBZ X0, #0, pair → teste le bit 0",
    TBNZ:  "Saute si un bit spécifique est à 1",

    // Sélection conditionnelle
    CSEL:  "Choisit entre deux valeurs selon une condition. Ex: CSEL X0, X1, X2, EQ → X0 = (égal?) X1 : X2",
    CSINC: "Comme CSEL mais incrémente si faux. CSINC Xd, Xn, Xm, cond → Xd = cond ? Xn : Xm+1",
    CSINV: "Comme CSEL mais inverse si faux. Xd = cond ? Xn : ~Xm",
    CSNEG: "Comme CSEL mais négatif si faux. Xd = cond ? Xn : -Xm",
    CSET:  "Met 1 si condition vraie, 0 sinon. Ex: CSET X0, EQ → X0 = 1 si égal",
    CSETM: "Met -1 (tous bits à 1) si condition vraie, 0 sinon",
    CINC:  "Incrémente si condition vraie. CINC X0, X1, GT → X0 = (plus grand?) X1+1 : X1",
    CINV:  "Inverse les bits si condition vraie",
    CNEG:  "Rend négatif si condition vraie. Ex: CNEG X0, X1, LT → X0 = (négatif?) -X1 : X1",

    // Adresses
    ADR:   "Calcule une adresse proche (label dans le code). Ex: ADR X0, message",
    ADRP:  "Calcule l'adresse d'une page mémoire (pour les grands programmes)",

    // Système
    SVC:   "Appel système (syscall). Le numéro du syscall est dans X8",
    NOP:   "Ne fait rien (utile pour l'alignement ou le timing)",
    BRK:   "Point d'arrêt : stoppe l'exécution du programme",
    MSR:   "Écrit dans un registre système (flags, contrôle...)",
    MRS:   "Lit un registre système",

    // NEON / SIMD (calcul vectoriel)
    LD1:   "Charge un vecteur depuis la mémoire. Ex: LD1 {V0.4S}, [X0] → 4 entiers 32 bits",
    ST1:   "Écrit un vecteur en mémoire. Ex: ST1 {V0.4S}, [X0]",
    DUP:   "Remplit toutes les cases du vecteur avec la même valeur. Ex: DUP V0.4S, W1",
    INS:   "Insère une valeur dans une case du vecteur. Ex: INS V0.S[2], W1",
    UMOV:  "Extrait une case du vecteur vers un registre. Ex: UMOV W0, V1.S[0]",
    MOVI:  "Remplit un vecteur avec une constante. Ex: MOVI V0.4S, #42",
    ADDV:  "Additionne toutes les cases du vecteur. Ex: ADDV S0, V1.4S → S0 = somme des 4 cases",
    CMEQ:  "Compare chaque case : met 0xFFFF… si égal, 0 sinon",
    CMGT:  "Compare chaque case : met 0xFFFF… si strictement plus grand",
    CMGE:  "Compare chaque case : met 0xFFFF… si plus grand ou égal",
    FADD:  "Addition flottante par case. Ex: FADD V0.2D, V1.2D, V2.2D",
    FSUB:  "Soustraction flottante par case",
    FMUL:  "Multiplication flottante par case",
    FDIV:  "Division flottante par case",
    NOT:   "Inverse tous les bits de chaque case du vecteur"
};
