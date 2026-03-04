# 06 — Sélection Conditionnelle (sans branchement)

## Objectifs d'apprentissage

- Comprendre le concept de sélection conditionnelle (conditional select)
- Maîtriser CSEL, CSINC, CSINV, CSNEG et leurs alias
- Savoir écrire du code sans branchement pour les cas simples (branchless code)
- Implémenter abs, max, min, clamp sans branchement

---

## Théorie

### Pourquoi éviter les branchements ?

Les branchements conditionnels (B.cond) ont un **coût** sur les processeurs modernes :
- Ils cassent le pipeline d'exécution
- Le prédicteur de branchement peut se tromper

Pour les cas simples (choisir entre deux valeurs), ARM64 offre des instructions de **sélection conditionnelle** qui évitent tout branchement.

### Principe de CSEL

`CSEL Xd, Xn, Xm, cond` : Si la condition est vraie, Xd = Xn, sinon Xd = Xm.

```
CMP X0, X1
CSEL X2, X0, X1, GT    // X2 = (X0 > X1) ? X0 : X1 → max(X0, X1)
```

### Famille d'instructions

Les variantes appliquent une opération sur Xm quand la condition est **fausse** :

| Instruction | Si cond vraie | Si cond fausse |
|---|---|---|
| `CSEL Xd, Xn, Xm, cond` | Xd = Xn | Xd = Xm |
| `CSINC Xd, Xn, Xm, cond` | Xd = Xn | Xd = Xm + 1 |
| `CSINV Xd, Xn, Xm, cond` | Xd = Xn | Xd = NOT Xm |
| `CSNEG Xd, Xn, Xm, cond` | Xd = Xn | Xd = -Xm |

### Alias pratiques

Les alias simplifient les cas courants où Xn = Xm ou Xn = XZR :

| Alias | Équivalent | Signification |
|---|---|---|
| `CSET Xd, cond` | `CSINC Xd, XZR, XZR, invcond` | Xd = 1 si cond, sinon 0 |
| `CSETM Xd, cond` | `CSINV Xd, XZR, XZR, invcond` | Xd = -1 (tous les bits à 1) si cond, sinon 0 |
| `CINC Xd, Xn, cond` | `CSINC Xd, Xn, Xn, invcond` | Xd = Xn + 1 si cond, sinon Xn |
| `CINV Xd, Xn, cond` | `CSINV Xd, Xn, Xn, invcond` | Xd = NOT Xn si cond, sinon Xn |
| `CNEG Xd, Xn, cond` | `CSNEG Xd, Xn, Xn, invcond` | Xd = -Xn si cond, sinon Xn |

> **Attention** : Les alias utilisent la condition **inversée** en interne. Quand vous écrivez `CSET X0, EQ`, l'assembleur encode `CSINC X0, XZR, XZR, NE`.

---

## Instructions

| Instruction | Syntaxe | Description |
|---|---|---|
| `CSEL` | `CSEL Xd, Xn, Xm, cond` | Xd = cond ? Xn : Xm |
| `CSINC` | `CSINC Xd, Xn, Xm, cond` | Xd = cond ? Xn : Xm+1 |
| `CSINV` | `CSINV Xd, Xn, Xm, cond` | Xd = cond ? Xn : ~Xm |
| `CSNEG` | `CSNEG Xd, Xn, Xm, cond` | Xd = cond ? Xn : -Xm |
| `CSET` | `CSET Xd, cond` | Xd = cond ? 1 : 0 |
| `CSETM` | `CSETM Xd, cond` | Xd = cond ? -1 : 0 |
| `CINC` | `CINC Xd, Xn, cond` | Xd = cond ? Xn+1 : Xn |
| `CINV` | `CINV Xd, Xn, cond` | Xd = cond ? ~Xn : Xn |
| `CNEG` | `CNEG Xd, Xn, cond` | Xd = cond ? -Xn : Xn |

---

## Exemples commentés

### Exemple 1 : Valeur absolue — abs(x)

```arm
// === abs(x) sans branchement ===

MOV X0, #-42            // x = -42

// Méthode : si x < 0, résultat = -x, sinon résultat = x
CMP X0, #0
CNEG X1, X0, LT         // X1 = (X0 < 0) ? -X0 : X0

// X1 = 42 ✓
```

### Exemple 2 : Maximum de deux nombres — max(a, b)

```arm
// === max(a, b) sans branchement ===

MOV X0, #25             // a = 25
MOV X1, #17             // b = 17

CMP X0, X1
CSEL X2, X0, X1, GT     // X2 = (a > b) ? a : b

// X2 = 25 ✓
```

### Exemple 3 : Minimum de deux nombres — min(a, b)

```arm
// === min(a, b) sans branchement ===

MOV X0, #25             // a = 25
MOV X1, #17             // b = 17

CMP X0, X1
CSEL X2, X0, X1, LT     // X2 = (a < b) ? a : b

// X2 = 17 ✓
```

### Exemple 4 : Clamp — borner une valeur

```arm
// === clamp(x, min, max) : borne x entre min et max ===
// Équivalent C : x < min ? min : (x > max ? max : x)

MOV X0, #150            // x = 150
MOV X1, #0              // min = 0
MOV X2, #100            // max = 100

// Étape 1 : si x < min, prendre min
CMP X0, X1
CSEL X3, X1, X0, GT     // X3 = (min > x) ? min : x → borne inférieure

// Étape 2 : si résultat > max, prendre max
CMP X3, X2
CSEL X3, X2, X3, GT     // X3 = (X3 > max) ? max : X3

// X3 = 100 (150 borné à [0, 100]) ✓
```

### Exemple 5 : CSET — convertir une condition en booléen

```arm
// === Booléen : est-ce que a == b ? ===

MOV X0, #42
MOV X1, #42

CMP X0, X1
CSET X2, EQ             // X2 = 1 si X0 == X1, sinon 0

// X2 = 1 ✓

// === Est-ce que n > 0 ? ===
MOV X3, #-5
CMP X3, #0
CSET X4, GT             // X4 = 1 si X3 > 0, sinon 0

// X4 = 0 ✓
```

### Exemple 6 : CSINC — compteur conditionnel

```arm
// === Incrémenter un compteur seulement si une condition est vraie ===
// Compter combien de valeurs sont positives

MOV X0, #0              // compteur = 0

// Tester la valeur 1 : 5 (positif)
MOV X1, #5
CMP X1, #0
CINC X0, X0, GT         // compteur++ si positif → X0 = 1

// Tester la valeur 2 : -3 (négatif)
MOV X1, #-3
CMP X1, #0
CINC X0, X0, GT         // pas d'incrémentation → X0 = 1

// Tester la valeur 3 : 10 (positif)
MOV X1, #10
CMP X1, #0
CINC X0, X0, GT         // compteur++ → X0 = 2

// Tester la valeur 4 : 0 (pas positif)
MOV X1, #0
CMP X1, #0
CINC X0, X0, GT         // pas d'incrémentation → X0 = 2

// X0 = 2 (deux valeurs positives) ✓
```

### Exemple 7 : Signe d'un nombre — signum(x)

```arm
// === signum(x) : retourne -1, 0, ou 1 ===

MOV X0, #-42            // x = -42

// Étape 1 : X1 = (x > 0) ? 1 : 0
CMP X0, #0
CSET X1, GT             // X1 = 1 si positif, 0 sinon

// Étape 2 : X1 = (x < 0) ? -1 : X1
CSINV X1, X1, XZR, GE   // si x < 0, X1 = NOT(0) = -1

// X1 = -1 (car x = -42 est négatif) ✓

// Vérification avec x = 0
MOV X2, #0
CMP X2, #0
CSET X3, GT             // X3 = 0
CSINV X3, X3, XZR, GE   // X3 = 0 (pas < 0, donc on garde X3)
// X3 = 0 ✓
```

### Exemple 8 : Comparaison avec branchement (avant/après)

```arm
// === Version AVEC branchement (à éviter pour les cas simples) ===
MOV X0, #30
MOV X1, #20

CMP X0, X1
B.GT prendre_x0
MOV X2, X1
B suite
prendre_x0:
MOV X2, X0
suite:
// X2 = max(X0, X1) = 30 — nécessite 5 instructions + 2 étiquettes

// === Version SANS branchement (préférable) ===
MOV X3, #30
MOV X4, #20

CMP X3, X4
CSEL X5, X3, X4, GT     // X5 = max(X3, X4) = 30 — 1 seule instruction !
```

---

## Exercices suggérés

1. **Valeur absolue de la différence** : Calculez `|a - b|` sans branchement. (Indice : SUB puis CNEG.)

2. **Tri de 3 nombres** : Triez trois nombres dans X0, X1, X2 (croissant) en utilisant uniquement CMP et CSEL.

3. **Seuillage** : Si X0 > 128, mettez X1 = 255, sinon X1 = 0. (Traitement d'image simplifié.)

4. **Compteur pair/impair** : Parcourez un tableau et comptez séparément les nombres pairs et impairs, en utilisant CINC et TBZ.

5. **ReLU** : Implémentez la fonction ReLU(x) = max(0, x) sans branchement. (Fonction d'activation en réseaux de neurones.)
