// c-asm-examples.js - Pre-written C/ASM comparison pairs

export const C_ASM_EXAMPLES = [
    // === Variables ===
    {
        title: 'Variable simple',
        category: 'Variables',
        cCode: `int x = 42;`,
        asmCode: `MOV W0, #42        // x = 42`,
        notes: 'Une variable locale tient dans un registre. W0 = registre 32 bits.'
    },
    {
        title: 'Deux variables',
        category: 'Variables',
        cCode: `int a = 10;
int b = 20;
int c = a + b;`,
        asmCode: `MOV W0, #10        // a = 10
MOV W1, #20        // b = 20
ADD W2, W0, W1     // c = a + b`,
        notes: 'Chaque variable locale utilise un registre different.'
    },
    {
        title: 'Variable 64 bits',
        category: 'Variables',
        cCode: `long x = 100000;`,
        asmCode: `MOV X0, #100000    // long → registre 64 bits (X)`,
        notes: 'long utilise X (64 bits) au lieu de W (32 bits).'
    },

    // === Conditions ===
    {
        title: 'if simple',
        category: 'Conditions',
        cCode: `if (x > 0) {
    y = 1;
}`,
        asmCode: `    CMP W0, #0          // compare x avec 0
    B.LE skip           // si x <= 0, sauter
    MOV W1, #1          // y = 1
skip:`,
        notes: 'CMP positionne les flags, B.LE branche si Less or Equal.'
    },
    {
        title: 'if / else',
        category: 'Conditions',
        cCode: `if (x > y) {
    max = x;
} else {
    max = y;
}`,
        asmCode: `    CMP W0, W1          // compare x, y
    CSEL W2, W0, W1, GT // max = (x>y) ? x : y`,
        notes: 'CSEL (Conditional SELect) remplace un if/else en une instruction.'
    },
    {
        title: 'switch (petit)',
        category: 'Conditions',
        cCode: `switch (x) {
    case 0: y = 10; break;
    case 1: y = 20; break;
    default: y = 0;
}`,
        asmCode: `    CBZ W0, case0       // x == 0 ?
    CMP W0, #1
    B.EQ case1          // x == 1 ?
    MOV W1, #0          // default: y = 0
    B end
case0:
    MOV W1, #10
    B end
case1:
    MOV W1, #20
end:`,
        notes: 'Un switch se traduit par une serie de comparaisons et branchements.'
    },

    // === Boucles ===
    {
        title: 'while',
        category: 'Boucles',
        cCode: `int i = 0;
while (i < 10) {
    i++;
}`,
        asmCode: `    MOV W0, #0          // i = 0
loop:
    CMP W0, #10         // i < 10 ?
    B.GE done           // si i >= 10, sortir
    ADD W0, W0, #1      // i++
    B loop              // repeter
done:`,
        notes: 'Le while se traduit par: test au debut, branchement en arriere.'
    },
    {
        title: 'for',
        category: 'Boucles',
        cCode: `int sum = 0;
for (int i = 1; i <= 100; i++) {
    sum += i;
}`,
        asmCode: `    MOV W0, #0          // sum = 0
    MOV W1, #1          // i = 1
loop:
    CMP W1, #100
    B.GT done           // i > 100 ? sortir
    ADD W0, W0, W1      // sum += i
    ADD W1, W1, #1      // i++
    B loop
done:
    // W0 = 5050`,
        notes: 'Un for est un while deguise. Le resultat est la somme de Gauss.'
    },
    {
        title: 'do-while',
        category: 'Boucles',
        cCode: `int n = 5;
do {
    n--;
} while (n > 0);`,
        asmCode: `    MOV W0, #5          // n = 5
loop:
    SUB W0, W0, #1      // n--
    CMP W0, #0
    B.GT loop           // si n > 0, repeter`,
        notes: 'do-while: le test est a la fin, on execute toujours au moins une fois.'
    },

    // === Fonctions ===
    {
        title: 'Appel de fonction',
        category: 'Fonctions',
        cCode: `int double_val(int x) {
    return x * 2;
}
int r = double_val(21);`,
        asmCode: `    MOV W0, #21         // argument dans W0
    BL double_val       // appel
    // W0 = 42 (retour)
    BRK #0

double_val:
    LSL W0, W0, #1      // x * 2
    RET                  // retour`,
        notes: 'BL sauvegarde l\'adresse retour dans LR. RET revient a LR.'
    },
    {
        title: 'Fonction avec stack',
        category: 'Fonctions',
        cCode: `int add3(int a, int b, int c) {
    return a + b + c;
}
// Appel: add3(10, 20, 30)`,
        asmCode: `    MOV W0, #10         // arg1
    MOV W1, #20         // arg2
    MOV W2, #30         // arg3
    BL add3
    BRK #0

add3:
    ADD W0, W0, W1      // a + b
    ADD W0, W0, W2      // + c
    RET`,
        notes: 'Convention ARM64: premiers args dans W0-W7, retour dans W0.'
    },
    {
        title: 'Sauvegarder les registres',
        category: 'Fonctions',
        cCode: `void foo() {
    // utilise des registres
    // sauvegardés
}`,
        asmCode: `foo:
    STP X29, X30, [SP, #-16]!  // sauver FP + LR
    MOV X29, SP                // frame pointer

    // ... corps de la fonction ...

    LDP X29, X30, [SP], #16   // restaurer
    RET`,
        notes: 'Prologue/epilogue standard. STP/LDP sauvent 2 registres d\'un coup.'
    },

    // === Pointeurs & Tableaux ===
    {
        title: 'Pointeur',
        category: 'Pointeurs',
        cCode: `int x = 42;
int *p = &x;
int y = *p;`,
        asmCode: `    MOV W1, #42
    STR W1, [X0]        // *p = 42  (X0 = adresse)
    LDR W2, [X0]        // y = *p`,
        notes: 'En ASM, un pointeur est juste une adresse. LDR/STR = lecture/ecriture.'
    },
    {
        title: 'Tableau (acces indexe)',
        category: 'Pointeurs',
        cCode: `int arr[4] = {10,20,30,40};
int x = arr[2]; // x = 30`,
        asmCode: `    ADR X0, arr
    MOV W1, #2          // index
    LSL W1, W1, #2      // * sizeof(int)
    LDR W2, [X0, W1, SXTW]  // arr[2]

arr:
    .word 10, 20, 30, 40`,
        notes: 'L\'index est multiplie par la taille de l\'element (4 pour int).'
    },
    {
        title: 'Parcours de tableau',
        category: 'Pointeurs',
        cCode: `int arr[4] = {1,2,3,4};
int sum = 0;
for (int i = 0; i < 4; i++)
    sum += arr[i];`,
        asmCode: `    ADR X0, arr
    MOV W1, #0          // sum = 0
    MOV W2, #0          // i = 0
loop:
    CMP W2, #4
    B.GE done
    LDR W3, [X0, W2, SXTW #2]  // arr[i]
    ADD W1, W1, W3      // sum += arr[i]
    ADD W2, W2, #1
    B loop
done:
    // W1 = 10

arr:
    .word 1, 2, 3, 4`,
        notes: 'SXTW #2 = sign-extend et shift left 2 (x4) pour adressage int.'
    },

    // === Structs ===
    {
        title: 'Acces struct',
        category: 'Structs',
        cCode: `struct Point {
    int x;  // offset 0
    int y;  // offset 4
};
struct Point p = {10, 20};
int a = p.x;
int b = p.y;`,
        asmCode: `    ADR X0, point
    LDR W1, [X0]        // p.x (offset 0)
    LDR W2, [X0, #4]    // p.y (offset 4)
    BRK #0

point:
    .word 10, 20`,
        notes: 'Un champ struct = un offset fixe depuis l\'adresse de base.'
    },
    {
        title: 'Tableau de structs',
        category: 'Structs',
        cCode: `struct Pair { int a, b; };
struct Pair pairs[2] = {
    {1, 2}, {3, 4}
};
// Acceder pairs[1].b`,
        asmCode: `    ADR X0, pairs
    // pairs[1].b = base + 1*8 + 4
    LDR W1, [X0, #12]   // offset 12 = 8+4
    BRK #0

pairs:
    .word 1, 2           // pairs[0]
    .word 3, 4           // pairs[1]`,
        notes: 'sizeof(Pair)=8. pairs[1].b = base + index*sizeof + field_offset.'
    }
];
