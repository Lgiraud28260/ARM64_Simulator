# Solutions des Exercices — Cours ARM64

---

## Cours 01 — Introduction et Registres

### Exercice 1 : Constante 32 bits

```arm
// Charger 0xCAFEBABE dans X0
MOVZ X0, #0xBABE            // X0 = 0x0000_0000_0000_BABE
MOVK X0, #0xCAFE, LSL #16   // X0 = 0x0000_0000_CAFE_BABE
```

### Exercice 2 : Échange de registres

```arm
// Échanger X0 et X1 via un registre temporaire
MOV X0, #111
MOV X1, #222

MOV X2, X0                  // X2 = 111 (sauvegarde)
MOV X0, X1                  // X0 = 222
MOV X1, X2                  // X1 = 111
// Résultat : X0 = 222, X1 = 111
```

### Exercice 3 : Exploration W vs X

```arm
// Les 32 bits supérieurs sont effacés quand on écrit dans W
MOV X0, #0xFFFF
MOVK X0, #0xFFFF, LSL #16   // X0 = 0x0000_0000_FFFF_FFFF

MOV W0, #5                  // X0 = 0x0000_0000_0000_0005
// Les bits 63-32 sont maintenant à zéro
```

### Exercice 4 : Valeur négative avec MOVN

```arm
// Charger -256 dans X0
// -256 = NOT(255) = NOT(0xFF)
MOVN X0, #255               // X0 = NOT(0x00FF) = 0xFFFF_FFFF_FFFF_FF00 = -256
```

### Exercice 5 : Constante 64 bits (nombre à 10 chiffres)

```arm
// Charger 1234567890 (0x499602D2) dans X0
MOVZ X0, #0x02D2            // X0 = 0x0000_0000_0000_02D2
MOVK X0, #0x4996, LSL #16   // X0 = 0x0000_0000_4996_02D2 = 1234567890
```

---

## Cours 02 — Arithmétique

### Exercice 1 : Expression `(15 * 4 + 7) / 3`

```arm
// (15 * 4 + 7) / 3 = 67 / 3 = quotient 22, reste 1

MOV X0, #15
MOV X1, #4
MUL X2, X0, X1              // X2 = 60

ADD X2, X2, #7              // X2 = 67

MOV X3, #3
SDIV X0, X2, X3             // X0 = 67 / 3 = 22 (quotient)

MSUB X1, X0, X3, X2         // X1 = 67 - (22 * 3) = 67 - 66 = 1 (reste)
// X0 = 22, X1 = 1
```

### Exercice 2 : Détection d'overflow

```arm
// 0x7FFFFFFFFFFFFFFF + 1 → overflow signé
MOVZ X0, #0xFFFF
MOVK X0, #0xFFFF, LSL #16
MOVK X0, #0xFFFF, LSL #32
MOVK X0, #0x7FFF, LSL #48   // X0 = 0x7FFFFFFFFFFFFFFF

ADDS X1, X0, #1             // X1 = 0x8000000000000000
// Flags : N=1 (résultat négatif), V=1 (overflow signé), Z=0, C=0
// Le résultat est devenu négatif → overflow signé détecté par V=1
```

### Exercice 3 : Moyenne de trois nombres

```arm
// Moyenne entière de 10, 20, 30
MOV X0, #10
MOV X1, #20
MOV X2, #30

ADD X3, X0, X1              // X3 = 30
ADD X3, X3, X2              // X3 = 60

MOV X4, #3
SDIV X3, X3, X4             // X3 = 60 / 3 = 20
```

### Exercice 4 : Conversion Fahrenheit → Celsius

```arm
// C = (F - 32) * 5 / 9
// Pour F = 100 : C = (100 - 32) * 5 / 9 = 68 * 5 / 9 = 340 / 9 = 37

MOV X0, #100                // F = 100
SUB X0, X0, #32             // X0 = 68

MOV X1, #5
MUL X0, X0, X1              // X0 = 340

MOV X2, #9
SDIV X0, X0, X2             // X0 = 37 (tronqué)
```

### Exercice 5 : PGCD (Euclide)

```arm
// PGCD de 48 et 18
// 48 = 2*18 + 12 → PGCD(18, 12)
// 18 = 1*12 + 6  → PGCD(12, 6)
// 12 = 2*6 + 0   → PGCD = 6

MOV X0, #48                 // a = 48
MOV X1, #18                 // b = 18

pgcd_boucle:
    CBZ X1, pgcd_fin         // Si b == 0, a contient le PGCD
    UDIV X2, X0, X1          // X2 = a / b
    MSUB X3, X2, X1, X0      // X3 = a - (a/b)*b = a mod b
    MOV X0, X1               // a = b
    MOV X1, X3               // b = reste
    B pgcd_boucle

pgcd_fin:
// X0 = 6 (PGCD de 48 et 18)
```

---

## Cours 03 — Logique et Décalages

### Exercice 1 : Compter les bits à 1

```arm
// Compter le nombre de bits à 1 dans X0 (popcount)

MOV X0, #0xFF              // X0 = 255 = 8 bits à 1
MOV X1, #0                  // Compteur = 0

compter:
    CBZ X0, fin_compter      // Si X0 == 0, terminé
    AND X2, X0, #1           // X2 = bit de poids faible
    ADD X1, X1, X2           // Ajouter au compteur
    LSR X0, X0, #1           // Décaler à droite
    B compter

fin_compter:
// X1 = 8 (nombre de bits à 1 dans 0xFF)
```

### Exercice 2 : Test puissance de 2

```arm
// Un nombre n est une puissance de 2 si n > 0 ET n & (n-1) == 0

MOV X0, #64                 // Nombre à tester (64 = 2^6)

// Vérifier n > 0
CMP X0, #0
B.LE pas_puissance

// Calculer n & (n-1)
SUB X1, X0, #1              // X1 = n - 1 = 63
ANDS X2, X0, X1             // X2 = n & (n-1), met les flags

B.NE pas_puissance           // Si != 0, pas une puissance de 2

// C'est une puissance de 2
MOV X3, #1                  // X3 = 1 (vrai)
B fin_test_p2

pas_puissance:
MOV X3, #0                  // X3 = 0 (faux)

fin_test_p2:
// X3 = 1 (64 est bien une puissance de 2)
```

### Exercice 3 : Alignement sur 16 octets

```arm
// Aligner une adresse vers le bas sur une frontière de 16 octets
// On efface les 4 bits de poids faible (16 = 2^4)

MOV X0, #0x1234             // Adresse non alignée

// Masque : ~0xF = 0xFFF...FFF0
AND X0, X0, #0xFFFFFFFFFFFFFFF0  // X0 = 0x1230

// Autre façon : BIC avec masque 0xF
// MOV X1, #0x1234
// BIC X1, X1, #0xF          // X1 = 0x1230
```

### Exercice 4 : Extraction de champ (bits 11:8)

```arm
// Extraire les bits 11:8 de X0 → bits 3:0 de X1

MOV X0, #0xABCD             // X0 = 0xABCD = 0b1010_1011_1100_1101

// Décaler à droite de 8 pour amener les bits 11:8 en position 3:0
LSR X1, X0, #8              // X1 = 0x00AB

// Masquer pour ne garder que les 4 bits de poids faible
AND X1, X1, #0xF            // X1 = 0xB = 11

// Les bits 11:8 de 0xABCD sont 0xB (= 1011 en binaire)
```

### Exercice 5 : Inverse des 16 nibbles (défi avancé)

```arm
// Inverser l'ordre des 16 nibbles d'un registre 64 bits
// Entrée : 0x0123456789ABCDEF → Sortie : 0xFEDCBA9876543210

MOVZ X0, #0xCDEF
MOVK X0, #0x89AB, LSL #16
MOVK X0, #0x4567, LSL #32
MOVK X0, #0x0123, LSL #48   // X0 = 0x0123456789ABCDEF

MOV X1, #0                  // Résultat = 0
MOV X2, #16                 // 16 nibbles à traiter

inverser:
    CBZ X2, fin_inverser
    AND X3, X0, #0xF        // Extraire le nibble de poids faible
    LSL X1, X1, #4           // Faire de la place dans le résultat
    ORR X1, X1, X3           // Insérer le nibble
    LSR X0, X0, #4           // Passer au nibble suivant
    SUB X2, X2, #1
    B inverser

fin_inverser:
// X1 = 0xFEDCBA9876543210
```

---

## Cours 04 — Load/Store

### Exercice 1 : Somme d'un tableau

```arm
// Somme de 8 éléments .word

.data
tab: .word 3, 7, 11, 15, 2, 8, 4, 10

.text
ADR X0, tab                 // Adresse du tableau
MOV X1, #8                  // Taille
MOV X2, #0                  // Somme = 0
MOV X3, #0                  // Index

somme_boucle:
    CMP X3, X1
    B.GE somme_fin

    LSL X4, X3, #2           // Offset = index × 4
    LDR W5, [X0, X4]        // Charger l'élément
    ADD X2, X2, X5           // Ajouter à la somme

    ADD X3, X3, #1
    B somme_boucle

somme_fin:
MOV X0, X2                  // X0 = 60 (3+7+11+15+2+8+4+10)
```

### Exercice 2 : Recherche du maximum

```arm
// Trouver le maximum dans un tableau de .word

.data
tab: .word 3, 42, 15, 7, 99, 23, 8, 55

.text
ADR X0, tab
MOV X1, #8                  // Taille

LDR W2, [X0]               // max = premier élément
MOV X3, #1                  // Index = 1 (on a déjà le premier)

max_boucle:
    CMP X3, X1
    B.GE max_fin

    LSL X4, X3, #2
    LDR W5, [X0, X4]        // Charger tab[i]

    CMP W5, W2
    B.LE pas_plus_grand
    MOV W2, W5              // Nouveau max

pas_plus_grand:
    ADD X3, X3, #1
    B max_boucle

max_fin:
MOV X0, X2                  // X0 = 99
```

### Exercice 3 : Copie de tableau (post-indexé)

```arm
// Copier un tableau source vers destination

.data
source: .word 10, 20, 30, 40, 50
dest:   .word 0, 0, 0, 0, 0

.text
ADR X0, source               // Pointeur source
ADR X1, dest                 // Pointeur destination
MOV X2, #5                  // Taille

copie_boucle:
    CBZ X2, copie_fin
    LDR W3, [X0], #4        // Charger et avancer source
    STR W3, [X1], #4        // Stocker et avancer destination
    SUB X2, X2, #1
    B copie_boucle

copie_fin:
// dest contient maintenant [10, 20, 30, 40, 50]

// Vérification
ADR X4, dest
LDR W5, [X4]                // W5 = 10
LDR W6, [X4, #4]            // W6 = 20
LDR W7, [X4, #8]            // W7 = 30
```

### Exercice 4 : Inversion d'un tableau en place

```arm
// Inverser [1, 2, 3, 4, 5] → [5, 4, 3, 2, 1]

.data
tab: .word 1, 2, 3, 4, 5

.text
ADR X0, tab                 // Début
MOV X1, #5
SUB X1, X1, #1              // Dernier index = 4
LSL X1, X1, #2              // Offset dernier = 16
ADD X1, X0, X1              // X1 = adresse du dernier

inv_boucle:
    CMP X0, X1
    B.GE inv_fin             // Si début >= fin, terminé

    LDR W2, [X0]            // Charger tab[début]
    LDR W3, [X1]            // Charger tab[fin]
    STR W3, [X0]            // Écrire tab[fin] au début
    STR W2, [X1]            // Écrire tab[début] à la fin

    ADD X0, X0, #4           // début++
    SUB X1, X1, #4           // fin--
    B inv_boucle

inv_fin:
// Vérification
ADR X4, tab
LDR W5, [X4]                // W5 = 5
LDR W6, [X4, #4]            // W6 = 4
LDR W7, [X4, #8]            // W7 = 3
LDR W8, [X4, #12]           // W8 = 2
LDR W9, [X4, #16]           // W9 = 1
```

### Exercice 5 : Longueur de chaîne

```arm
// Calculer la longueur d'une chaîne .asciz

.data
chaine: .asciz "Bonjour ARM64"

.text
ADR X0, chaine
MOV X1, #0                  // Longueur = 0

strlen_boucle:
    LDRB W2, [X0], #1       // Charger un octet, avancer
    CBZ W2, strlen_fin       // Si nul, fin de chaîne
    ADD X1, X1, #1
    B strlen_boucle

strlen_fin:
// X1 = 13 (longueur de "Bonjour ARM64")
```

### Exercice 6 : Conversion minuscules → majuscules

```arm
// Convertir une chaîne en majuscules
// 'a' = 0x61, 'A' = 0x41, différence = 0x20

.data
texte: .asciz "hello world"

.text
ADR X0, texte

toupper_boucle:
    LDRB W1, [X0]            // Charger un caractère
    CBZ W1, toupper_fin       // Si nul, fin

    // Vérifier si c'est une minuscule (entre 'a' = 97 et 'z' = 122)
    CMP W1, #97
    B.LT pas_minuscule
    CMP W1, #122
    B.GT pas_minuscule

    // Convertir : soustraire 0x20
    SUB W1, W1, #0x20
    STRB W1, [X0]            // Écrire le caractère converti

pas_minuscule:
    ADD X0, X0, #1           // Avancer au caractère suivant
    B toupper_boucle

toupper_fin:
// texte contient maintenant "HELLO WORLD"

// Vérification : charger les premiers caractères
ADR X2, texte
LDRB W3, [X2]               // W3 = 72 = 'H'
LDRB W4, [X2, #1]           // W4 = 69 = 'E'
```

---

## Cours 05 — Branchements

### Exercice 1 : Fibonacci itératif

```arm
// Calculer le N-ième nombre de Fibonacci
// fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2, ...

MOV X0, #10                 // N = 10

// Cas de base
CMP X0, #0
B.EQ fib_zero
CMP X0, #1
B.EQ fib_un

MOV X1, #0                  // fib(n-2) = 0
MOV X2, #1                  // fib(n-1) = 1
MOV X3, #2                  // i = 2

fib_boucle:
    CMP X3, X0
    B.GT fib_fin

    ADD X4, X1, X2           // fib(n) = fib(n-2) + fib(n-1)
    MOV X1, X2               // fib(n-2) = ancien fib(n-1)
    MOV X2, X4               // fib(n-1) = fib(n)
    ADD X3, X3, #1           // i++
    B fib_boucle

fib_zero:
    MOV X2, #0
    B fib_fin

fib_un:
    MOV X2, #1

fib_fin:
MOV X1, X2                  // X1 = fib(10) = 55
```

### Exercice 2 : Recherche linéaire

```arm
// Chercher la valeur 42 dans un tableau, retourner l'index ou -1

.data
tab: .word 10, 25, 42, 7, 99, 13, 42, 88
taille: .word 8

.text
ADR X0, tab
ADR X1, taille
LDR W1, [X1]                // W1 = 8
MOV X2, #42                 // Valeur cherchée
MOV X3, #0                  // Index

recherche:
    CMP X3, X1
    B.GE non_trouve

    LSL X4, X3, #2
    LDR W5, [X0, X4]        // Charger tab[i]
    CMP W5, W2
    B.EQ trouve

    ADD X3, X3, #1
    B recherche

non_trouve:
    MOV X3, #-1              // Retourner -1

trouve:
MOV X0, X3                  // X0 = 2 (index de la première occurrence de 42)
```

### Exercice 3 : Tri à bulles

```arm
// Tri à bulles de 5 éléments

.data
tab: .word 45, 12, 78, 3, 56

.text
ADR X0, tab
MOV X1, #5                  // Taille

// Boucle externe : n-1 passes
SUB X2, X1, #1              // X2 = 4 (nombre de passes)

passe:
    CBZ X2, tri_fin
    MOV X3, #0               // j = 0
    SUB X4, X2, #0           // Limite de la passe interne

boucle_interne:
    CMP X3, X4
    B.GE fin_passe

    LSL X5, X3, #2
    ADD X6, X5, #4           // Offset de l'élément suivant

    LDR W7, [X0, X5]        // tab[j]
    LDR W8, [X0, X6]        // tab[j+1]

    CMP W7, W8
    B.LE pas_echange         // Si tab[j] <= tab[j+1], pas d'échange

    // Échanger
    STR W8, [X0, X5]
    STR W7, [X0, X6]

pas_echange:
    ADD X3, X3, #1
    B boucle_interne

fin_passe:
    SUB X2, X2, #1
    B passe

tri_fin:
// Vérification : tableau trié [3, 12, 45, 56, 78]
ADR X0, tab
LDR W10, [X0]               // W10 = 3
LDR W11, [X0, #4]           // W11 = 12
LDR W12, [X0, #8]           // W12 = 45
LDR W13, [X0, #12]          // W13 = 56
LDR W14, [X0, #16]          // W14 = 78
```

### Exercice 4 : PGCD (Euclide avec boucle while)

```arm
// PGCD(252, 105) = 21

MOV X0, #252                // a
MOV X1, #105                // b

pgcd:
    CBZ X1, pgcd_done        // Si b == 0, PGCD = a
    UDIV X2, X0, X1          // q = a / b
    MSUB X3, X2, X1, X0      // r = a - q*b = a mod b
    MOV X0, X1               // a = b
    MOV X1, X3               // b = r
    B pgcd

pgcd_done:
// X0 = 21
```

### Exercice 5 : Menu (switch)

```arm
// Option 1 → X1 = 100, Option 2 → X1 = 200, Option 3 → X1 = 300

MOV X0, #2                  // Option choisie

CMP X0, #1
B.EQ option_1
CMP X0, #2
B.EQ option_2
CMP X0, #3
B.EQ option_3
B option_invalide

option_1:
    MOV X1, #100
    B fin_menu

option_2:
    MOV X1, #200
    B fin_menu

option_3:
    MOV X1, #300
    B fin_menu

option_invalide:
    MOV X1, #-1

fin_menu:
// X1 = 200 (option 2)
```

---

## Cours 06 — Sélection Conditionnelle

### Exercice 1 : Valeur absolue de la différence

```arm
// |a - b| sans branchement

MOV X0, #15                 // a = 15
MOV X1, #42                 // b = 42

SUB X2, X0, X1              // X2 = a - b = -27
CMP X0, X1
CNEG X2, X2, LT             // Si a < b, X2 = -X2 = 27

// X2 = 27 = |15 - 42|
```

### Exercice 2 : Tri de 3 nombres

```arm
// Trier X0, X1, X2 en ordre croissant avec CSEL

MOV X0, #30                 // a
MOV X1, #10                 // b
MOV X2, #20                 // c

// Étape 1 : trier X0, X1 (s'assurer X0 <= X1)
CMP X0, X1
CSEL X3, X0, X1, LE         // X3 = min(X0, X1) = 10
CSEL X4, X1, X0, LE         // X4 = max(X0, X1) = 30

// Étape 2 : insérer X2 au bon endroit
// Comparer X2 avec X4 (le plus grand des deux premiers)
CMP X2, X4
CSEL X5, X4, X2, LE         // X5 = max(X4, X2) = 30 (le plus grand des 3)
CSEL X4, X2, X4, LE         // X4 = min(X4, X2) = 20

// Comparer X4 (milieu potentiel) avec X3 (le plus petit)
CMP X4, X3
CSEL X6, X3, X4, LE         // X6 = min(X3, X4) = 10 (le plus petit)
CSEL X7, X4, X3, LE         // X7 = max(X3, X4) = 20 (le milieu)

// Résultat : X6=10, X7=20, X5=30 (trié croissant)
MOV X0, X6
MOV X1, X7
MOV X2, X5
// X0=10, X1=20, X2=30
```

### Exercice 3 : Seuillage

```arm
// Si X0 > 128, X1 = 255, sinon X1 = 0

MOV X0, #200                // Valeur du pixel

MOV X2, #255
CMP X0, #128
CSEL X1, X2, XZR, GT        // X1 = (X0 > 128) ? 255 : 0

// X1 = 255 (car 200 > 128)
```

### Exercice 4 : Compteur pair/impair

```arm
// Compter les pairs et impairs dans un tableau

.data
tab: .word 3, 8, 15, 22, 7, 10

.text
ADR X0, tab
MOV X1, #6                  // Taille
MOV X2, #0                  // Compteur pairs
MOV X3, #0                  // Compteur impairs
MOV X4, #0                  // Index

pi_boucle:
    CMP X4, X1
    B.GE pi_fin

    LSL X5, X4, #2
    LDR W6, [X0, X5]        // Charger tab[i]

    // Tester le bit 0 : 0 = pair, 1 = impair
    TBZ X6, #0, est_pair_ex
    // Impair
    ADD X3, X3, #1
    B pi_suite

est_pair_ex:
    ADD X2, X2, #1

pi_suite:
    ADD X4, X4, #1
    B pi_boucle

pi_fin:
// X2 = 3 (pairs : 8, 22, 10)
// X3 = 3 (impairs : 3, 15, 7)
```

### Exercice 5 : ReLU

```arm
// ReLU(x) = max(0, x) sans branchement

MOV X0, #-15                // x = -15

CMP X0, #0
CSEL X1, X0, XZR, GT        // X1 = (X0 > 0) ? X0 : 0

// X1 = 0 (car -15 < 0)

// Test avec valeur positive
MOV X2, #42
CMP X2, #0
CSEL X3, X2, XZR, GT        // X3 = 42
```

---

## Cours 07 — Pile et Fonctions

### Exercice 1 : Fonction puissance

```arm
// puissance(base, exp) = base^exp

MOV X0, #2                  // base = 2
MOV X1, #10                 // exp = 10
BL puissance
MOV X5, X0                  // X5 = 1024
B fin

puissance:
    STP X29, X30, [SP, #-32]!
    STP X19, X20, [SP, #16]
    MOV X29, SP

    MOV X19, X0              // Sauvegarder base
    MOV X20, X1              // Sauvegarder exp
    MOV X0, #1               // résultat = 1

pow_boucle:
    CBZ X20, pow_fin         // Si exp == 0, terminé
    MUL X0, X0, X19          // résultat *= base
    SUB X20, X20, #1         // exp--
    B pow_boucle

pow_fin:
    LDP X19, X20, [SP, #16]
    LDP X29, X30, [SP], #32
    RET

fin:
// X5 = 1024 (2^10)
```

### Exercice 2 : Fibonacci récursif

```arm
// fib(n) récursif

MOV X0, #10                 // N = 10
BL fib
MOV X5, X0                  // X5 = 55
B fin

fib:
    STP X29, X30, [SP, #-32]!
    STP X19, X20, [SP, #16]
    MOV X29, SP

    MOV X19, X0              // Sauvegarder n

    // Cas de base : n <= 1
    CMP X0, #1
    B.LE fib_base

    // fib(n-1)
    SUB X0, X19, #1
    BL fib
    MOV X20, X0              // X20 = fib(n-1)

    // fib(n-2)
    SUB X0, X19, #2
    BL fib                   // X0 = fib(n-2)

    ADD X0, X0, X20          // X0 = fib(n-1) + fib(n-2)
    B fib_epilogue

fib_base:
    // fib(0) = 0, fib(1) = 1
    MOV X0, X19              // Retourner n directement

fib_epilogue:
    LDP X19, X20, [SP, #16]
    LDP X29, X30, [SP], #32
    RET

fin:
// X5 = 55 (fib(10))
```

### Exercice 3 : Maximum d'un tableau

```arm
// max_tableau(tableau, taille) → maximum

.data
tab: .word 23, 67, 12, 89, 45, 3, 78, 56

.text
ADR X0, tab                 // Argument 1 : adresse du tableau
MOV X1, #8                  // Argument 2 : taille
BL max_tableau
MOV X5, X0                  // X5 = 89
B fin

max_tableau:
    // Pas de sous-appel → fonction feuille, pas besoin de sauvegarder LR
    LDR W2, [X0]            // max = premier élément
    MOV X3, #1               // i = 1

mt_boucle:
    CMP X3, X1
    B.GE mt_fin

    LSL X4, X3, #2
    LDR W5, [X0, X4]

    CMP W5, W2
    CSEL W2, W5, W2, GT     // max = (tab[i] > max) ? tab[i] : max

    ADD X3, X3, #1
    B mt_boucle

mt_fin:
    MOV W0, W2               // Retourner max
    RET

fin:
// X5 = 89
```

### Exercice 4 : Chaîne de fonctions

```arm
// traiter(x) appelle double(x) puis plus_un(résultat)

MOV X0, #7                  // x = 7
BL traiter
MOV X5, X0                  // X5 = 15 (7*2 + 1)
B fin

double:
    LSL X0, X0, #1           // X0 = x * 2
    RET

plus_un:
    ADD X0, X0, #1           // X0 = x + 1
    RET

traiter:
    STP X29, X30, [SP, #-16]!
    MOV X29, SP

    BL double                // X0 = 7 * 2 = 14
    BL plus_un               // X0 = 14 + 1 = 15

    LDP X29, X30, [SP], #16
    RET

fin:
// X5 = 15
```

### Exercice 5 : Tours de Hanoï

```arm
// Compter les mouvements pour N=4 disques
// hanoi(n) = 2^n - 1 mouvements, mais on le fait récursivement

MOV X0, #4                  // N = 4 disques
MOV X1, #0                  // Compteur de mouvements (variable globale via la pile)
BL hanoi
MOV X5, X1                  // X5 = 15 mouvements
B fin

// hanoi(n) : X0 = nombre de disques, X1 = compteur (accumulateur)
hanoi:
    STP X29, X30, [SP, #-32]!
    STP X19, X20, [SP, #16]
    MOV X29, SP

    MOV X19, X0              // Sauvegarder n

    // Cas de base : n == 0
    CBZ X0, hanoi_fin

    // hanoi(n-1) — déplacer n-1 disques
    SUB X0, X19, #1
    BL hanoi

    // Déplacer le disque n (1 mouvement)
    ADD X1, X1, #1

    // hanoi(n-1) — déplacer n-1 disques
    SUB X0, X19, #1
    BL hanoi

hanoi_fin:
    LDP X19, X20, [SP, #16]
    LDP X29, X30, [SP], #32
    RET

fin:
// X5 = 15 (2^4 - 1 = 15 mouvements)
```

---

## Cours 08 — NEON / SIMD

### Exercice 1 : Doubler un vecteur

```arm
// Doubler chaque élément en ajoutant le vecteur à lui-même

.data
vec: .word 5, 10, 15, 20

.text
ADR X0, vec
LD1 {V0.4S}, [X0]           // V0 = [5, 10, 15, 20]

ADD V1.4S, V0.4S, V0.4S     // V1 = [10, 20, 30, 40]

ST1 {V1.4S}, [X0]           // Écrire le résultat

// Vérification
UMOV W1, V1.S[0]            // W1 = 10
UMOV W2, V1.S[1]            // W2 = 20
UMOV W3, V1.S[2]            // W3 = 30
UMOV W4, V1.S[3]            // W4 = 40
```

### Exercice 2 : Maximum vectoriel (8 éléments)

```arm
// Trouver le maximum de 8 éléments avec SIMD

.data
tab: .word 12, 45, 7, 89, 23, 67, 3, 56

.text
ADR X0, tab

// Charger les 8 éléments dans 2 vecteurs
LD1 {V0.4S}, [X0]           // V0 = [12, 45, 7, 89]
ADD X1, X0, #16
LD1 {V1.4S}, [X1]           // V1 = [23, 67, 3, 56]

// Comparer V0 > V1, produire un masque
CMGT V2.4S, V0.4S, V1.4S    // V2 = masque (0xFFFFFFFF si V0 > V1)

// Sélectionner les maximums avec AND/BIC/ORR
AND V3.16B, V0.16B, V2.16B  // Garder V0 là où V0 > V1
BIC V4.16B, V1.16B, V2.16B  // Garder V1 là où V1 >= V0
ORR V5.16B, V3.16B, V4.16B  // Combiner : V5 = max(V0, V1) par lane
// V5 = [23, 67, 7, 89]

// Maintenant trouver le max dans V5 (réduction manuelle)
// Extraire et comparer
UMOV W2, V5.S[0]            // 23
UMOV W3, V5.S[1]            // 67
UMOV W4, V5.S[2]            // 7
UMOV W5, V5.S[3]            // 89

CMP W2, W3
CSEL W2, W2, W3, GT         // max(23, 67) = 67
CMP W2, W4
CSEL W2, W2, W4, GT         // max(67, 7) = 67
CMP W2, W5
CSEL W2, W2, W5, GT         // max(67, 89) = 89

MOV W0, W2                  // W0 = 89
```

### Exercice 3 : Moyenne vectorielle (8 éléments)

```arm
// Moyenne de 8 entiers avec SIMD

.data
tab: .word 10, 20, 30, 40, 50, 60, 70, 80

.text
ADR X0, tab

// Charger en 2 vecteurs
LD1 {V0.4S}, [X0]           // V0 = [10, 20, 30, 40]
ADD X1, X0, #16
LD1 {V1.4S}, [X1]           // V1 = [50, 60, 70, 80]

// Additionner les deux vecteurs
ADD V2.4S, V0.4S, V1.4S     // V2 = [60, 80, 100, 120]

// Somme horizontale
ADDV S3, V2.4S              // S3 = 60 + 80 + 100 + 120 = 360

// Extraire et diviser par 8
UMOV W0, V3.S[0]            // W0 = 360
MOV W1, #8
UDIV W0, W0, W1             // W0 = 360 / 8 = 45
```

### Exercice 4 : Produit scalaire 8D

```arm
// Produit scalaire de deux vecteurs de 8 éléments

.data
a: .word 1, 2, 3, 4, 5, 6, 7, 8
b: .word 2, 3, 4, 5, 6, 7, 8, 9

.text
ADR X0, a
ADR X1, b

// Charger les premières moitiés
LD1 {V0.4S}, [X0]           // V0 = [1, 2, 3, 4]
LD1 {V1.4S}, [X1]           // V1 = [2, 3, 4, 5]

// Multiplier élément par élément
MUL V4.4S, V0.4S, V1.4S     // V4 = [2, 6, 12, 20]

// Charger les secondes moitiés
ADD X0, X0, #16
ADD X1, X1, #16
LD1 {V2.4S}, [X0]           // V2 = [5, 6, 7, 8]
LD1 {V3.4S}, [X1]           // V3 = [6, 7, 8, 9]

// Multiplier et accumuler
MUL V5.4S, V2.4S, V3.4S     // V5 = [30, 42, 56, 72]

// Additionner les produits
ADD V6.4S, V4.4S, V5.4S     // V6 = [32, 48, 68, 92]

// Somme horizontale
ADDV S7, V6.4S              // S7 = 32 + 48 + 68 + 92 = 240

UMOV W0, V7.S[0]            // W0 = 240

// Vérification : 1×2 + 2×3 + 3×4 + 4×5 + 5×6 + 6×7 + 7×8 + 8×9
// = 2 + 6 + 12 + 20 + 30 + 42 + 56 + 72 = 240 ✓
```

### Exercice 5 : Seuillage d'image (16 octets)

```arm
// Pour chaque octet : si > 128, mettre 0xFF, sinon 0x00

.data
pixels: .byte 50, 200, 100, 180, 30, 255, 128, 130, 1, 90, 210, 64, 190, 10, 150, 70

.text
ADR X0, pixels

// Charger les 16 pixels
LD1 {V0.16B}, [X0]

// Créer le seuil : vecteur rempli de 128
MOV W1, #128
DUP V1.16B, W1              // V1 = [128, 128, ..., 128]

// Comparer : V0 > V1 ?
CMGT V2.16B, V0.16B, V1.16B
// V2[i] = 0xFF si pixel > 128, 0x00 sinon
// V2 = [0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF,
//        0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00]

// Stocker le résultat
ST1 {V2.16B}, [X0]
```

---

> **Note** : Tous les exemples utilisent exclusivement des instructions supportées par le simulateur ARM64. Le code peut être copié-collé directement dans l'éditeur du simulateur.
