# 05 — Branchements et Contrôle de Flux

## Objectifs d'apprentissage

- Comprendre les branchements conditionnels et inconditionnels
- Connaître les 16 codes de condition ARM64
- Savoir implémenter des structures de contrôle (if/else, boucles)
- Utiliser les branchements indirects (BR, BLR) et les appels de fonction (BL, RET)

---

## Théorie

### Branchements inconditionnels

- **B label** : saute toujours à l'étiquette
- **BL label** : saute à l'étiquette et sauvegarde l'adresse de retour dans LR (X30)
- **RET** : retourne à l'adresse contenue dans LR (X30)

### Branchements conditionnels

`B.cond label` : saute à l'étiquette **si** la condition est vraie, basée sur les flags NZCV.

Les flags doivent avoir été mis à jour par une instruction précédente (CMP, SUBS, ADDS, TST…).

### Tableau complet des 16 conditions

| Code | Signification | Flags testés | Complément |
|---|---|---|---|
| `EQ` | Equal (égal) | Z = 1 | `NE` |
| `NE` | Not Equal (différent) | Z = 0 | `EQ` |
| `CS` / `HS` | Carry Set / Higher or Same (≥ non signé) | C = 1 | `CC` / `LO` |
| `CC` / `LO` | Carry Clear / Lower (< non signé) | C = 0 | `CS` / `HS` |
| `MI` | Minus (négatif) | N = 1 | `PL` |
| `PL` | Plus (positif ou zéro) | N = 0 | `MI` |
| `VS` | Overflow Set (débordement) | V = 1 | `VC` |
| `VC` | Overflow Clear (pas de débordement) | V = 0 | `VS` |
| `HI` | Higher (> non signé) | C = 1 ET Z = 0 | `LS` |
| `LS` | Lower or Same (≤ non signé) | C = 0 OU Z = 1 | `HI` |
| `GE` | Greater or Equal (≥ signé) | N = V | `LT` |
| `LT` | Less Than (< signé) | N ≠ V | `GE` |
| `GT` | Greater Than (> signé) | Z = 0 ET N = V | `LE` |
| `LE` | Less or Equal (≤ signé) | Z = 1 OU N ≠ V | `GT` |
| `AL` | Always (toujours) | — | — |
| `NV` | Never (jamais, réservé) | — | — |

> **Signé vs Non signé** : Pour comparer des entiers signés, utilisez GE/LT/GT/LE. Pour des entiers non signés, utilisez HS/LO/HI/LS.

### CBZ, CBNZ, TBZ, TBNZ

Ces instructions combinent un test et un branchement **sans avoir besoin de CMP** :

| Instruction | Action |
|---|---|
| `CBZ Xn, label` | Branche si Xn == 0 |
| `CBNZ Xn, label` | Branche si Xn != 0 |
| `TBZ Xn, #bit, label` | Branche si le bit #bit de Xn == 0 |
| `TBNZ Xn, #bit, label` | Branche si le bit #bit de Xn != 0 |

---

## Instructions

| Instruction | Syntaxe | Description |
|---|---|---|
| `B` | `B label` | Branchement inconditionnel |
| `BL` | `BL label` | Branch and Link (appel de fonction) |
| `RET` | `RET` | Retour de fonction (saute à LR) |
| `B.cond` | `B.EQ label` | Branchement conditionnel |
| `CBZ` | `CBZ Xn, label` | Branch si Xn == 0 |
| `CBNZ` | `CBNZ Xn, label` | Branch si Xn != 0 |
| `TBZ` | `TBZ Xn, #bit, label` | Branch si bit == 0 |
| `TBNZ` | `TBNZ Xn, #bit, label` | Branch si bit != 0 |
| `BR` | `BR Xn` | Branch indirect (saute à l'adresse dans Xn) |
| `BLR` | `BLR Xn` | Branch and Link indirect |

---

## Exemples commentés

### Exemple 1 : Structure if/else

```arm
// === Équivalent C : if (x > 10) { y = 1; } else { y = 0; } ===

MOV X0, #15             // x = 15

CMP X0, #10             // Comparer x avec 10
B.GT alors              // Si x > 10, aller à 'alors'

// Bloc else
MOV X1, #0              // y = 0
B fin_if                // Sauter la partie 'alors'

alors:
MOV X1, #1              // y = 1

fin_if:
// X1 contient le résultat (ici X1 = 1 car 15 > 10)
```

### Exemple 2 : Boucle for

```arm
// === Équivalent C : sum = 0; for (i = 1; i <= 10; i++) { sum += i; } ===

MOV X0, #0              // sum = 0
MOV X1, #1              // i = 1

boucle_for:
    CMP X1, #10         // Comparer i avec 10
    B.GT fin_for        // Si i > 10, sortir

    ADD X0, X0, X1      // sum += i
    ADD X1, X1, #1      // i++
    B boucle_for        // Recommencer

fin_for:
// X0 = 55 (somme de 1 à 10)
```

### Exemple 3 : Boucle while avec CBZ

```arm
// === Équivalent C : while (n != 0) { count++; n = n >> 1; } ===
// Compte le nombre de bits nécessaires pour représenter n

MOV X0, #255            // n = 255 (= 0xFF = 0b11111111)
MOV X1, #0              // count = 0

compter_bits:
    CBZ X0, fin_while   // Si n == 0, sortir
    ADD X1, X1, #1      // count++
    LSR X0, X0, #1      // n = n >> 1
    B compter_bits

fin_while:
// X1 = 8 (il faut 8 bits pour représenter 255)
```

### Exemple 4 : Boucle do-while (décompte)

```arm
// === Décompte de 5 à 1 ===

MOV X0, #5              // compteur = 5

decompte:
    SUB X0, X0, #1      // compteur--
    CBNZ X0, decompte   // Si compteur != 0, continuer

// X0 = 0 (la boucle s'est exécutée 5 fois)
```

### Exemple 5 : TBZ/TBNZ — tester un bit spécifique

```arm
// === Tester si un nombre est pair (bit 0 = 0) ===

MOV X0, #42             // Nombre à tester

TBZ X0, #0, est_pair    // Si bit 0 = 0, c'est pair
// Ici, c'est impair
MOV X1, #1              // X1 = 1 (impair)
B fin_test

est_pair:
MOV X1, #0              // X1 = 0 (pair)

fin_test:
// X1 = 0 car 42 est pair
```

### Exemple 6 : Structure switch (chaîne de if)

```arm
// === switch(x) : 1 → "un", 2 → "deux", 3 → "trois", default → "autre" ===

MOV X0, #2              // x = 2

CMP X0, #1
B.EQ cas_1
CMP X0, #2
B.EQ cas_2
CMP X0, #3
B.EQ cas_3
B cas_default

cas_1:
    MOV X1, #10         // Résultat pour cas 1
    B fin_switch

cas_2:
    MOV X1, #20         // Résultat pour cas 2
    B fin_switch

cas_3:
    MOV X1, #30         // Résultat pour cas 3
    B fin_switch

cas_default:
    MOV X1, #0          // Résultat par défaut

fin_switch:
// X1 = 20 (cas 2)
```

### Exemple 7 : Appel de fonction avec BL/RET

```arm
// === Programme principal ===
MOV X0, #5              // Argument : n = 5
BL doubler              // Appeler la fonction 'doubler'
// Au retour, X0 = 10
MOV X1, X0              // Sauvegarder le résultat dans X1
B fin_prog

// === Fonction doubler(n) : retourne n × 2 ===
doubler:
    LSL X0, X0, #1      // X0 = X0 × 2
    RET                  // Retour à l'appelant (adresse dans LR)

fin_prog:
// X1 = 10
```

### Exemple 8 : Boucle avec condition complexe

```arm
// === Trouver le premier multiple de 7 supérieur à 50 ===

MOV X0, #1              // n = 1

chercher:
    MOV X1, #7
    MUL X2, X0, X1      // X2 = n × 7

    CMP X2, #50          // X2 > 50 ?
    B.GT trouve          // Si oui, on a trouvé

    ADD X0, X0, #1       // n++
    B chercher

trouve:
// X0 = 8 (8 × 7 = 56 > 50)
// X2 = 56
```

---

## Exercices suggérés

1. **Fibonacci** : Calculez le N-ième nombre de Fibonacci (N dans X0). Résultat dans X1.

2. **Recherche linéaire** : Cherchez une valeur dans un tableau et retournez son index (ou -1 si absente).

3. **Tri à bulles** : Triez un tableau de 5 éléments `.word` en ordre croissant.

4. **PGCD** : Implémentez l'algorithme d'Euclide avec une boucle while.

5. **Menu** : Simulez un menu à 3 options avec une structure switch. L'option est dans X0 (1, 2, ou 3), le résultat correspondant dans X1.
