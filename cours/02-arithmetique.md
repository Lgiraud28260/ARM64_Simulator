# 02 — Arithmétique

## Objectifs d'apprentissage

- Maîtriser les opérations arithmétiques de base (ADD, SUB, MUL, DIV)
- Comprendre la différence entre instructions avec et sans mise à jour des flags
- Savoir utiliser CMP et CMN pour les comparaisons

---

## Théorie

### Instructions avec et sans flags

En ARM64, la plupart des instructions arithmétiques existent en deux variantes :
- **Sans S** (ADD, SUB) : effectue l'opération sans modifier les flags NZCV
- **Avec S** (ADDS, SUBS) : effectue l'opération **et** met à jour les flags

Cette séparation permet d'effectuer des calculs sans perturber une condition testée précédemment.

### CMP et CMN

- **CMP Xn, Op2** est un alias de `SUBS XZR, Xn, Op2` — soustrait et jette le résultat, ne garde que les flags
- **CMN Xn, Op2** est un alias de `ADDS XZR, Xn, Op2` — additionne et jette le résultat, ne garde que les flags

### Division entière

La division entière ARM64 **tronque** vers zéro (pas d'arrondi). Il n'y a pas d'instruction modulo ; pour obtenir le reste, on utilise : `reste = a - (a / b) * b`, soit avec MSUB.

---

## Instructions

| Instruction | Syntaxe | Description |
|---|---|---|
| `ADD` | `ADD Xd, Xn, #imm` | Xd = Xn + imm |
| `ADD` | `ADD Xd, Xn, Xm` | Xd = Xn + Xm |
| `ADDS` | `ADDS Xd, Xn, Xm` | Xd = Xn + Xm, met à jour NZCV |
| `SUB` | `SUB Xd, Xn, #imm` | Xd = Xn - imm |
| `SUB` | `SUB Xd, Xn, Xm` | Xd = Xn - Xm |
| `SUBS` | `SUBS Xd, Xn, Xm` | Xd = Xn - Xm, met à jour NZCV |
| `CMP` | `CMP Xn, #imm` | Compare Xn avec imm (= SUBS XZR, Xn, #imm) |
| `CMP` | `CMP Xn, Xm` | Compare Xn avec Xm |
| `CMN` | `CMN Xn, #imm` | Compare négatif (= ADDS XZR, Xn, #imm) |
| `MUL` | `MUL Xd, Xn, Xm` | Xd = Xn × Xm |
| `MADD` | `MADD Xd, Xn, Xm, Xa` | Xd = Xa + (Xn × Xm) |
| `MSUB` | `MSUB Xd, Xn, Xm, Xa` | Xd = Xa - (Xn × Xm) |
| `MNEG` | `MNEG Xd, Xn, Xm` | Xd = -(Xn × Xm) |
| `SDIV` | `SDIV Xd, Xn, Xm` | Xd = Xn ÷ Xm (signé) |
| `UDIV` | `UDIV Xd, Xn, Xm` | Xd = Xn ÷ Xm (non signé) |
| `NEG` | `NEG Xd, Xm` | Xd = -Xm (alias de SUB Xd, XZR, Xm) |
| `NEGS` | `NEGS Xd, Xm` | Xd = -Xm, met à jour les flags |

---

## Exemples commentés

### Exemple 1 : Opérations de base

```arm
// === Addition et soustraction ===

MOV X0, #50
MOV X1, #30

ADD X2, X0, X1          // X2 = 50 + 30 = 80
SUB X3, X0, X1          // X3 = 50 - 30 = 20

// Addition avec immédiat
ADD X4, X0, #10         // X4 = 50 + 10 = 60

// Soustraction avec immédiat
SUB X5, X0, #5          // X5 = 50 - 5 = 45
```

### Exemple 2 : Flags et comparaisons

```arm
// === CMP et flags ===

MOV X0, #10
MOV X1, #10

// CMP met à jour les flags sans stocker le résultat
CMP X0, X1              // Z=1 (égaux), N=0, C=1, V=0

MOV X2, #20
CMP X0, X2              // Z=0, N=1 (10-20 < 0), C=0

// ADDS met à jour les flags ET stocke le résultat
MOV X3, #0xFFFFFFFF
ADDS W4, W3, #1         // W4 = 0, Z=1, C=1 (overflow non signé)
```

### Exemple 3 : Multiplication et division

```arm
// === Multiplication ===

MOV X0, #7
MOV X1, #8
MUL X2, X0, X1          // X2 = 7 × 8 = 56

// Multiply-Add : calcul de a*b + c
MOV X3, #3
MADD X4, X0, X1, X3     // X4 = 3 + (7 × 8) = 59

// === Division ===

MOV X5, #100
MOV X6, #7
SDIV X7, X5, X6         // X7 = 100 ÷ 7 = 14 (tronqué)

// Calcul du modulo : reste = a - (a/b)*b
MSUB X8, X7, X6, X5     // X8 = 100 - (14 × 7) = 100 - 98 = 2
```

### Exemple 4 : Calcul d'une expression complète

```arm
// === Calcul de : résultat = (a + b) * c - d ===
// avec a=5, b=3, c=4, d=10

MOV X0, #5              // a = 5
MOV X1, #3              // b = 3
MOV X2, #4              // c = 4
MOV X3, #10             // d = 10

ADD X4, X0, X1          // X4 = a + b = 8
MUL X5, X4, X2          // X5 = (a + b) * c = 32
SUB X6, X5, X3          // X6 = (a + b) * c - d = 22
```

### Exemple 5 : Négation et valeur absolue (aperçu)

```arm
// === Négation ===

MOV X0, #42
NEG X1, X0              // X1 = -42

// Vérification avec NEGS (met les flags)
NEGS X2, X0             // X2 = -42, N=1 (négatif)

// Négation d'une valeur déjà négative
MOV X3, #-10
NEG X4, X3              // X4 = 10
```

---

## Exercices suggérés

1. **Expression** : Calculez `(15 * 4 + 7) / 3` et stockez le quotient dans X0 et le reste dans X1.

2. **Détection d'overflow** : Additionnez `0x7FFFFFFFFFFFFFFF` (plus grand entier signé 64 bits) et `1` avec ADDS. Observez les flags V et N.

3. **Moyenne** : Calculez la moyenne entière de trois nombres (X0=10, X1=20, X2=30) et stockez le résultat dans X3.

4. **Conversion température** : Convertissez 100°F en °C avec la formule `C = (F - 32) * 5 / 9`. Utilisez uniquement des opérations entières.

5. **PGCD** : Implémentez l'algorithme d'Euclide pour calculer le PGCD de deux nombres. (Indice : utilisez UDIV, MSUB et des branchements — voir cours 05.)
