// tutorials.js - Tutorial data extracted from course materials
// Each tutorial has: chapter, title, description, code (starter), solution, check (register/memory expectations)

export const TUTORIALS = [
    // === Chapter 1: Introduction et Registres ===
    {
        chapter: 1,
        title: "Constante 32 bits",
        description: "Chargez la valeur 0xCAFEBABE dans X0 en utilisant MOVZ et MOVK.",
        hint: "MOVZ charge les 16 bits bas, MOVK insère 16 bits à un décalage (LSL #16).",
        code: `// Exercice : Charger 0xCAFEBABE dans X0
// Utilisez MOVZ pour les 16 bits bas, puis MOVK pour les 16 bits hauts

// Votre code ici :

`,
        solution: `// Charger 0xCAFEBABE dans X0
MOVZ X0, #0xBABE            // X0 = 0x0000_0000_0000_BABE
MOVK X0, #0xCAFE, LSL #16   // X0 = 0x0000_0000_CAFE_BABE
`,
        check: { reg: "X0", expected: "0xCAFEBABE" }
    },
    {
        chapter: 1,
        title: "Échange de registres",
        description: "Échangez les valeurs de X0 (111) et X1 (222) en utilisant un registre temporaire.",
        hint: "Sauvegardez X0 dans X2, puis copiez X1 dans X0, puis X2 dans X1.",
        code: `// Exercice : Échanger X0 et X1
MOV X0, #111
MOV X1, #222

// Votre code ici (utilisez X2 comme temporaire) :

// Résultat attendu : X0 = 222, X1 = 111
`,
        solution: `MOV X0, #111
MOV X1, #222
MOV X2, X0
MOV X0, X1
MOV X1, X2
`,
        check: { reg: "X0", expected: "222" }
    },
    {
        chapter: 1,
        title: "W vs X : 32 bits vs 64 bits",
        description: "Observez que écrire dans W0 efface les 32 bits supérieurs de X0.",
        hint: "Chargez 0xFFFFFFFF dans X0, puis écrivez 5 dans W0 et observez X0.",
        code: `// Exercice : Observer le comportement W vs X
MOV X0, #0xFFFF
MOVK X0, #0xFFFF, LSL #16   // X0 = 0x0000_0000_FFFF_FFFF

// Écrivez 5 dans W0 et observez X0 :

// Question : que vaut X0 maintenant ?
`,
        solution: `MOV X0, #0xFFFF
MOVK X0, #0xFFFF, LSL #16
MOV W0, #5
`,
        check: { reg: "X0", expected: "5" }
    },
    {
        chapter: 1,
        title: "Valeur négative avec MOVN",
        description: "Chargez -256 dans X0 en utilisant MOVN.",
        hint: "-256 = NOT(255). MOVN charge NOT(imm) dans le registre.",
        code: `// Exercice : Charger -256 dans X0 avec MOVN
// -256 = NOT(255) = NOT(0xFF)

// Votre code ici :

`,
        solution: `MOVN X0, #255
`,
        check: { reg: "X0", expected: "-256" }
    },

    // === Chapter 2: Arithmétique ===
    {
        chapter: 2,
        title: "Expression arithmétique",
        description: "Calculez (15 × 4 + 7) / 3. Stockez le quotient dans X0 et le reste dans X1.",
        hint: "Utilisez MUL, ADD, SDIV, puis MSUB pour le reste (r = a - q×b).",
        code: `// Exercice : (15 * 4 + 7) / 3
// Résultat attendu : X0 = 22 (quotient), X1 = 1 (reste)

// Votre code ici :

`,
        solution: `MOV X0, #15
MOV X1, #4
MUL X2, X0, X1
ADD X2, X2, #7
MOV X3, #3
SDIV X0, X2, X3
MSUB X1, X0, X3, X2
`,
        check: { reg: "X0", expected: "22" }
    },
    {
        chapter: 2,
        title: "Détection d'overflow",
        description: "Ajoutez 1 à 0x7FFFFFFFFFFFFFFF avec ADDS et observez le flag V (overflow).",
        hint: "Construisez 0x7FFF...FFFF avec MOVZ/MOVK, puis ADDS X1, X0, #1.",
        code: `// Exercice : Détection d'overflow signé
// Construisez 0x7FFFFFFFFFFFFFFF dans X0 puis ajoutez 1 avec ADDS
// Observez les flags : V devrait être à 1

// Votre code ici :

`,
        solution: `MOVZ X0, #0xFFFF
MOVK X0, #0xFFFF, LSL #16
MOVK X0, #0xFFFF, LSL #32
MOVK X0, #0x7FFF, LSL #48
ADDS X1, X0, #1
`,
        check: { reg: "X1", expected: "0x8000000000000000" }
    },
    {
        chapter: 2,
        title: "Moyenne de 3 nombres",
        description: "Calculez la moyenne entière de 10, 20 et 30 dans X3.",
        hint: "Additionnez les 3 valeurs, puis SDIV par 3.",
        code: `// Exercice : Moyenne de 10, 20, 30
// Résultat attendu : X3 = 20

// Votre code ici :

`,
        solution: `MOV X0, #10
MOV X1, #20
MOV X2, #30
ADD X3, X0, X1
ADD X3, X3, X2
MOV X4, #3
SDIV X3, X3, X4
`,
        check: { reg: "X3", expected: "20" }
    },
    {
        chapter: 2,
        title: "Fahrenheit → Celsius",
        description: "Convertissez 100°F en Celsius : C = (F - 32) × 5 / 9. Résultat dans X0.",
        hint: "SUB pour -32, MUL par 5, SDIV par 9.",
        code: `// Exercice : Conversion 100°F → Celsius
// C = (F - 32) * 5 / 9
// Résultat attendu : X0 = 37

// Votre code ici :

`,
        solution: `MOV X0, #100
SUB X0, X0, #32
MOV X1, #5
MUL X0, X0, X1
MOV X2, #9
SDIV X0, X0, X2
`,
        check: { reg: "X0", expected: "37" }
    },
    {
        chapter: 2,
        title: "PGCD (Euclide)",
        description: "Calculez le PGCD de 48 et 18 avec l'algorithme d'Euclide. Résultat dans X0.",
        hint: "Boucle : tant que b≠0, calculer r = a mod b, a = b, b = r.",
        code: `// Exercice : PGCD de 48 et 18
// Résultat attendu : X0 = 6

MOV X0, #48
MOV X1, #18

// Votre boucle ici :

`,
        solution: `MOV X0, #48
MOV X1, #18
pgcd_boucle:
    CBZ X1, pgcd_fin
    UDIV X2, X0, X1
    MSUB X3, X2, X1, X0
    MOV X0, X1
    MOV X1, X3
    B pgcd_boucle
pgcd_fin:
`,
        check: { reg: "X0", expected: "6" }
    },

    // === Chapter 3: Logique et Décalages ===
    {
        chapter: 3,
        title: "Compter les bits à 1",
        description: "Comptez le nombre de bits à 1 dans 0xFF (X0). Résultat dans X1.",
        hint: "Boucle : extraire le bit de poids faible (AND #1), l'ajouter au compteur, décaler à droite (LSR #1).",
        code: `// Exercice : Popcount de 0xFF
// Résultat attendu : X1 = 8

MOV X0, #0xFF
MOV X1, #0

// Votre boucle ici :

`,
        solution: `MOV X0, #0xFF
MOV X1, #0
compter:
    CBZ X0, fin_compter
    AND X2, X0, #1
    ADD X1, X1, X2
    LSR X0, X0, #1
    B compter
fin_compter:
`,
        check: { reg: "X1", expected: "8" }
    },
    {
        chapter: 3,
        title: "Test puissance de 2",
        description: "Testez si 64 est une puissance de 2. Stockez 1 dans X3 si oui, 0 sinon.",
        hint: "Un nombre n est puissance de 2 si n > 0 ET n & (n-1) == 0.",
        code: `// Exercice : 64 est-il une puissance de 2 ?
// Résultat attendu : X3 = 1

MOV X0, #64

// Votre code ici :

`,
        solution: `MOV X0, #64
CMP X0, #0
B.LE pas_puissance
SUB X1, X0, #1
ANDS X2, X0, X1
B.NE pas_puissance
MOV X3, #1
B fin_test_p2
pas_puissance:
MOV X3, #0
fin_test_p2:
`,
        check: { reg: "X3", expected: "1" }
    },
    {
        chapter: 3,
        title: "Extraction de champ de bits",
        description: "Extrayez les bits 11:8 de 0xABCD dans les bits 3:0 de X1.",
        hint: "LSR de 8 positions, puis AND avec 0xF.",
        code: `// Exercice : Extraire bits 11:8 de 0xABCD
// 0xABCD = ...1010_1011_1100_1101, bits 11:8 = 0xB = 11
// Résultat attendu : X1 = 11

MOV X0, #0xABCD

// Votre code ici :

`,
        solution: `MOV X0, #0xABCD
LSR X1, X0, #8
AND X1, X1, #0xF
`,
        check: { reg: "X1", expected: "11" }
    },

    // === Chapter 4: Load/Store ===
    {
        chapter: 4,
        title: "Somme d'un tableau",
        description: "Calculez la somme de 8 éléments .word. Résultat dans X0.",
        hint: "Boucle avec index, LSL #2 pour l'offset, LDR W pour charger chaque élément.",
        code: `// Exercice : Somme de [3, 7, 11, 15, 2, 8, 4, 10]
// Résultat attendu : X0 = 60

_start:
ADR X1, tab
MOV X2, #8
MOV X0, #0
MOV X3, #0

// Votre boucle ici :


B done

tab: .word 3, 7, 11, 15, 2, 8, 4, 10

done:
`,
        solution: `_start:
ADR X1, tab
MOV X2, #8
MOV X0, #0
MOV X3, #0
somme_boucle:
    CMP X3, X2
    B.GE done
    LSL X4, X3, #2
    LDR W5, [X1, X4]
    ADD X0, X0, X5
    ADD X3, X3, #1
    B somme_boucle
B done
tab: .word 3, 7, 11, 15, 2, 8, 4, 10
done:
`,
        check: { reg: "X0", expected: "60" }
    },
    {
        chapter: 4,
        title: "Recherche du maximum",
        description: "Trouvez le maximum dans un tableau .word. Résultat dans X0.",
        hint: "Initialisez max = tab[0], parcourez le reste en comparant chaque élément.",
        code: `// Exercice : Maximum de [3, 42, 15, 7, 99, 23, 8, 55]
// Résultat attendu : X0 = 99

_start:
ADR X1, tab
MOV X2, #8

// Votre code ici :


B done
tab: .word 3, 42, 15, 7, 99, 23, 8, 55
done:
`,
        solution: `_start:
ADR X1, tab
MOV X2, #8
LDR W0, [X1]
MOV X3, #1
max_boucle:
    CMP X3, X2
    B.GE done
    LSL X4, X3, #2
    LDR W5, [X1, X4]
    CMP W5, W0
    B.LE pas_plus_grand
    MOV W0, W5
pas_plus_grand:
    ADD X3, X3, #1
    B max_boucle
B done
tab: .word 3, 42, 15, 7, 99, 23, 8, 55
done:
`,
        check: { reg: "X0", expected: "99" }
    },
    {
        chapter: 4,
        title: "Longueur de chaîne",
        description: "Calculez la longueur de \"Bonjour ARM64\" (sans le \\0). Résultat dans X1.",
        hint: "LDRB en post-indexé [X0], #1, CBZ pour détecter le NUL.",
        code: `// Exercice : strlen de "Bonjour ARM64"
// Résultat attendu : X1 = 13

_start:
ADR X0, chaine
MOV X1, #0

// Votre boucle ici :


B done
chaine: .asciz "Bonjour ARM64"
done:
`,
        solution: `_start:
ADR X0, chaine
MOV X1, #0
strlen_boucle:
    LDRB W2, [X0], #1
    CBZ W2, done
    ADD X1, X1, #1
    B strlen_boucle
B done
chaine: .asciz "Bonjour ARM64"
done:
`,
        check: { reg: "X1", expected: "13" }
    },

    // === Chapter 5: Branchements ===
    {
        chapter: 5,
        title: "Fibonacci itératif",
        description: "Calculez fib(10) itérativement. Résultat dans X1.",
        hint: "Deux variables fib(n-2) et fib(n-1), boucle de 2 à N.",
        code: `// Exercice : Fibonacci(10)
// Résultat attendu : X1 = 55

MOV X0, #10

// Votre code ici :

`,
        solution: `MOV X0, #10
CMP X0, #0
B.EQ fib_zero
CMP X0, #1
B.EQ fib_un
MOV X1, #0
MOV X2, #1
MOV X3, #2
fib_boucle:
    CMP X3, X0
    B.GT fib_fin
    ADD X4, X1, X2
    MOV X1, X2
    MOV X2, X4
    ADD X3, X3, #1
    B fib_boucle
fib_zero:
    MOV X2, #0
    B fib_fin
fib_un:
    MOV X2, #1
fib_fin:
MOV X1, X2
`,
        check: { reg: "X1", expected: "55" }
    },
    {
        chapter: 5,
        title: "Recherche linéaire",
        description: "Cherchez 42 dans un tableau. Retournez l'index dans X0 (ou -1 si absent).",
        hint: "Boucle avec CMP de chaque élément à 42, B.EQ si trouvé.",
        code: `// Exercice : Trouver 42 dans [10, 25, 42, 7, 99, 13]
// Résultat attendu : X0 = 2 (index)

_start:
ADR X1, tab
MOV X2, #6
MOV X3, #42
MOV X0, #0

// Votre boucle ici :


B done
tab: .word 10, 25, 42, 7, 99, 13
done:
`,
        solution: `_start:
ADR X1, tab
MOV X2, #6
MOV X3, #42
MOV X0, #0
recherche:
    CMP X0, X2
    B.GE non_trouve
    LSL X4, X0, #2
    LDR W5, [X1, X4]
    CMP W5, W3
    B.EQ done
    ADD X0, X0, #1
    B recherche
non_trouve:
    MOV X0, #-1
B done
tab: .word 10, 25, 42, 7, 99, 13
done:
`,
        check: { reg: "X0", expected: "2" }
    },
    {
        chapter: 5,
        title: "Tri à bulles",
        description: "Triez [45, 12, 78, 3, 56] par tri à bulles. Vérifiez W10=3 après tri.",
        hint: "Double boucle : passes externes (n-1 fois), boucle interne avec comparaison et échange.",
        code: `// Exercice : Tri à bulles de [45, 12, 78, 3, 56]
// Résultat attendu : tableau trié [3, 12, 45, 56, 78]
// W10 = 3 (premier élément après tri)

_start:
ADR X0, tab
MOV X1, #5

// Votre code de tri ici :


// Vérification
ADR X0, tab
LDR W10, [X0]
B done

tab: .word 45, 12, 78, 3, 56
done:
`,
        solution: `_start:
ADR X0, tab
MOV X1, #5
SUB X2, X1, #1
passe:
    CBZ X2, tri_fin
    MOV X3, #0
    SUB X4, X2, #0
boucle_interne:
    CMP X3, X4
    B.GE fin_passe
    LSL X5, X3, #2
    ADD X6, X5, #4
    LDR W7, [X0, X5]
    LDR W8, [X0, X6]
    CMP W7, W8
    B.LE pas_echange
    STR W8, [X0, X5]
    STR W7, [X0, X6]
pas_echange:
    ADD X3, X3, #1
    B boucle_interne
fin_passe:
    SUB X2, X2, #1
    B passe
tri_fin:
ADR X0, tab
LDR W10, [X0]
B done
tab: .word 45, 12, 78, 3, 56
done:
`,
        check: { reg: "X10", expected: "3" }
    },

    // === Chapter 6: Sélection Conditionnelle ===
    {
        chapter: 6,
        title: "Valeur absolue sans branchement",
        description: "Calculez |15 - 42| dans X2 sans utiliser de branchement (B).",
        hint: "SUB X2, X0, X1 puis CMP et CNEG X2, X2, LT.",
        code: `// Exercice : |a - b| sans branchement
// Résultat attendu : X2 = 27

MOV X0, #15
MOV X1, #42

// Votre code ici (pas de B/B.xx !) :

`,
        solution: `MOV X0, #15
MOV X1, #42
SUB X2, X0, X1
CMP X0, X1
CNEG X2, X2, LT
`,
        check: { reg: "X2", expected: "27" }
    },
    {
        chapter: 6,
        title: "Seuillage",
        description: "Si X0 > 128, X1 = 255, sinon X1 = 0. Sans branchement.",
        hint: "MOV X2, #255, puis CMP X0, #128, CSEL X1, X2, XZR, GT.",
        code: `// Exercice : Seuillage
// X0 = 200, résultat attendu : X1 = 255

MOV X0, #200

// Votre code ici (pas de B !) :

`,
        solution: `MOV X0, #200
MOV X2, #255
CMP X0, #128
CSEL X1, X2, XZR, GT
`,
        check: { reg: "X1", expected: "255" }
    },
    {
        chapter: 6,
        title: "ReLU sans branchement",
        description: "Implémentez ReLU(x) = max(0, x) pour x = -15. Résultat dans X1.",
        hint: "CMP X0, #0, puis CSEL X1, X0, XZR, GT.",
        code: `// Exercice : ReLU(-15) = max(0, -15) = 0
// Résultat attendu : X1 = 0

MOV X0, #-15

// Votre code ici :

`,
        solution: `MOV X0, #-15
CMP X0, #0
CSEL X1, X0, XZR, GT
`,
        check: { reg: "X1", expected: "0" }
    },

    // === Chapter 7: Pile et Fonctions ===
    {
        chapter: 7,
        title: "Fonction puissance",
        description: "Implémentez puissance(2, 10) avec BL/RET. Résultat dans X5.",
        hint: "Prologue STP X29/X30, boucle MUL, épilogue LDP, RET.",
        code: `// Exercice : puissance(2, 10) = 1024
// Résultat attendu : X5 = 1024

MOV X0, #2
MOV X1, #10
BL puissance
MOV X5, X0
B fin

// Implémentez la fonction puissance ici :
puissance:


fin:
`,
        solution: `MOV X0, #2
MOV X1, #10
BL puissance
MOV X5, X0
B fin
puissance:
    STP X29, X30, [SP, #-32]!
    STP X19, X20, [SP, #16]
    MOV X29, SP
    MOV X19, X0
    MOV X20, X1
    MOV X0, #1
pow_boucle:
    CBZ X20, pow_fin
    MUL X0, X0, X19
    SUB X20, X20, #1
    B pow_boucle
pow_fin:
    LDP X19, X20, [SP, #16]
    LDP X29, X30, [SP], #32
    RET
fin:
`,
        check: { reg: "X5", expected: "1024" }
    },
    {
        chapter: 7,
        title: "Chaîne de fonctions",
        description: "traiter(7) appelle double(x) puis plus_un(résultat). Résultat dans X5.",
        hint: "traiter doit sauvegarder LR (STP), appeler BL double, BL plus_un, restaurer (LDP), RET.",
        code: `// Exercice : traiter(7) = double(7) + 1 = 15
// Résultat attendu : X5 = 15

MOV X0, #7
BL traiter
MOV X5, X0
B fin

double:
    LSL X0, X0, #1
    RET

plus_un:
    ADD X0, X0, #1
    RET

// Implémentez traiter ici :
traiter:


fin:
`,
        solution: `MOV X0, #7
BL traiter
MOV X5, X0
B fin
double:
    LSL X0, X0, #1
    RET
plus_un:
    ADD X0, X0, #1
    RET
traiter:
    STP X29, X30, [SP, #-16]!
    MOV X29, SP
    BL double
    BL plus_un
    LDP X29, X30, [SP], #16
    RET
fin:
`,
        check: { reg: "X5", expected: "15" }
    },

    // === Chapter 8: NEON / SIMD ===
    {
        chapter: 8,
        title: "Doubler un vecteur",
        description: "Doublez chaque élément de [5, 10, 15, 20] en utilisant ADD vectoriel.",
        hint: "LD1 {V0.4S}, ADD V1.4S, V0.4S, V0.4S, puis UMOV pour vérifier.",
        code: `// Exercice : Doubler [5, 10, 15, 20]
// Résultat attendu : W1 = 10 (premier élément doublé)

_start:
ADR X0, vec
LD1 {V0.4S}, [X0]

// Votre code ici :


B done
vec: .word 5, 10, 15, 20
done:
`,
        solution: `_start:
ADR X0, vec
LD1 {V0.4S}, [X0]
ADD V1.4S, V0.4S, V0.4S
UMOV W1, V1.S[0]
UMOV W2, V1.S[1]
UMOV W3, V1.S[2]
UMOV W4, V1.S[3]
B done
vec: .word 5, 10, 15, 20
done:
`,
        check: { reg: "X1", expected: "10" }
    },
    {
        chapter: 8,
        title: "Produit scalaire SIMD",
        description: "Calculez le produit scalaire de [1,2,3,4] · [2,3,4,5] = 40. Résultat dans W0.",
        hint: "LD1 les deux vecteurs, MUL V2.4S, ADDV S3, puis UMOV W0.",
        code: `// Exercice : Dot product [1,2,3,4] · [2,3,4,5]
// = 1×2 + 2×3 + 3×4 + 4×5 = 2+6+12+20 = 40
// Résultat attendu : W0 = 40

_start:
ADR X0, a
ADR X1, b

// Votre code ici :


B done
a: .word 1, 2, 3, 4
b: .word 2, 3, 4, 5
done:
`,
        solution: `_start:
ADR X0, a
ADR X1, b
LD1 {V0.4S}, [X0]
LD1 {V1.4S}, [X1]
MUL V2.4S, V0.4S, V1.4S
ADDV S3, V2.4S
UMOV W0, V3.S[0]
B done
a: .word 1, 2, 3, 4
b: .word 2, 3, 4, 5
done:
`,
        check: { reg: "X0", expected: "40" }
    },
    {
        chapter: 8,
        title: "Moyenne vectorielle",
        description: "Calculez la moyenne de [10,20,30,40,50,60,70,80] avec SIMD. Résultat dans W0.",
        hint: "2 × LD1, ADD vectoriel, ADDV pour la somme, UDIV par 8.",
        code: `// Exercice : Moyenne de 8 entiers avec SIMD
// Somme = 360, Moyenne = 360/8 = 45
// Résultat attendu : W0 = 45

_start:
ADR X0, tab

// Votre code ici :


B done
tab: .word 10, 20, 30, 40, 50, 60, 70, 80
done:
`,
        solution: `_start:
ADR X0, tab
LD1 {V0.4S}, [X0]
ADD X1, X0, #16
LD1 {V1.4S}, [X1]
ADD V2.4S, V0.4S, V1.4S
ADDV S3, V2.4S
UMOV W0, V3.S[0]
MOV W1, #8
UDIV W0, W0, W1
B done
tab: .word 10, 20, 30, 40, 50, 60, 70, 80
done:
`,
        check: { reg: "X0", expected: "45" }
    }
];
