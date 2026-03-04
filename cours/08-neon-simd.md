# 08 — NEON / SIMD (Instructions Vectorielles)

## Objectifs d'apprentissage

- Comprendre le concept SIMD (Single Instruction, Multiple Data)
- Connaître les registres vectoriels V0-V31 et leurs arrangements
- Savoir charger et stocker des données vectorielles
- Effectuer des opérations arithmétiques sur plusieurs données simultanément
- Utiliser les opérations flottantes vectorielles

---

## Théorie

### Qu'est-ce que SIMD ?

**SIMD** signifie « une instruction, plusieurs données ». Au lieu de traiter un seul nombre à la fois, une instruction SIMD traite **plusieurs nombres en parallèle** :

```
Scalaire (classique) :         SIMD (vectoriel) :
  A1 + B1 = C1                  A1 A2 A3 A4   (vecteur A)
  A2 + B2 = C2                + B1 B2 B3 B4   (vecteur B)
  A3 + B3 = C3                ─────────────────
  A4 + B4 = C4                  C1 C2 C3 C4   (résultat, 1 instruction !)
  → 4 instructions              → 1 instruction
```

### Registres vectoriels

ARM64 dispose de **32 registres vectoriels** de 128 bits : **V0 à V31**.

Chaque registre peut être vu selon différents **arrangements** (views) :

| Arrangement | Nombre d'éléments | Taille par élément | Bits utilisés |
|---|---|---|---|
| `16B` | 16 | Byte (8 bits) | 128 bits |
| `8B` | 8 | Byte (8 bits) | 64 bits |
| `8H` | 8 | Halfword (16 bits) | 128 bits |
| `4H` | 4 | Halfword (16 bits) | 64 bits |
| `4S` | 4 | Single (32 bits) | 128 bits |
| `2S` | 2 | Single (32 bits) | 64 bits |
| `2D` | 2 | Double (64 bits) | 128 bits |
| `1D` | 1 | Double (64 bits) | 64 bits |

```
V0 (128 bits) vu comme 4S (4 × 32 bits) :
┌──────────┬──────────┬──────────┬──────────┐
│  V0.S[3] │  V0.S[2] │  V0.S[1] │  V0.S[0] │
│  32 bits │  32 bits │  32 bits │  32 bits │
└──────────┴──────────┴──────────┴──────────┘

V0 (128 bits) vu comme 16B (16 × 8 bits) :
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│B[15]│B[14]│B[13]│...│...│...│...│...│...│...│...│...│B[3]│B[2]│B[1]│B[0]│
└────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
```

---

## Instructions

### Chargement et stockage vectoriels

| Instruction | Syntaxe | Description |
|---|---|---|
| `LD1` | `LD1 {Vt.4S}, [Xn]` | Charge un vecteur depuis la mémoire |
| `ST1` | `ST1 {Vt.4S}, [Xn]` | Stocke un vecteur en mémoire |

### Initialisation de vecteurs

| Instruction | Syntaxe | Description |
|---|---|---|
| `DUP` | `DUP Vd.4S, Wn` | Duplique un scalaire dans toutes les lanes |
| `MOVI` | `MOVI Vd.4S, #imm` | Met un immédiat dans toutes les lanes |
| `INS` | `INS Vd.S[i], Wn` | Insère un scalaire dans une lane spécifique |
| `UMOV` | `UMOV Wd, Vn.S[i]` | Extrait une lane vers un registre général |

### Arithmétique vectorielle entière

| Instruction | Syntaxe | Description |
|---|---|---|
| `ADD` | `ADD Vd.4S, Vn.4S, Vm.4S` | Addition élément par élément |
| `SUB` | `SUB Vd.4S, Vn.4S, Vm.4S` | Soustraction élément par élément |
| `MUL` | `MUL Vd.4S, Vn.4S, Vm.4S` | Multiplication élément par élément |

### Logique vectorielle

| Instruction | Syntaxe | Description |
|---|---|---|
| `AND` | `AND Vd.16B, Vn.16B, Vm.16B` | AND bit à bit |
| `ORR` | `ORR Vd.16B, Vn.16B, Vm.16B` | OR bit à bit |
| `EOR` | `EOR Vd.16B, Vn.16B, Vm.16B` | XOR bit à bit |

### Arithmétique flottante vectorielle

| Instruction | Syntaxe | Description |
|---|---|---|
| `FADD` | `FADD Vd.4S, Vn.4S, Vm.4S` | Addition flottante |
| `FSUB` | `FSUB Vd.4S, Vn.4S, Vm.4S` | Soustraction flottante |
| `FMUL` | `FMUL Vd.4S, Vn.4S, Vm.4S` | Multiplication flottante |
| `FDIV` | `FDIV Vd.4S, Vn.4S, Vm.4S` | Division flottante |

### Réduction

| Instruction | Syntaxe | Description |
|---|---|---|
| `ADDV` | `ADDV Sd, Vn.4S` | Somme de toutes les lanes → scalaire |

### Comparaison vectorielle

| Instruction | Syntaxe | Description |
|---|---|---|
| `CMEQ` | `CMEQ Vd.4S, Vn.4S, Vm.4S` | Chaque lane : -1 si égal, 0 sinon |
| `CMGT` | `CMGT Vd.4S, Vn.4S, Vm.4S` | Chaque lane : -1 si Vn > Vm, 0 sinon |
| `CMGE` | `CMGE Vd.4S, Vn.4S, Vm.4S` | Chaque lane : -1 si Vn >= Vm, 0 sinon |

---

## Exemples commentés

### Exemple 1 : Premiers pas — initialiser et manipuler un vecteur

```arm
// === Créer un vecteur et le manipuler ===

// Initialiser toutes les lanes à la même valeur
MOVI V0.4S, #10             // V0 = [10, 10, 10, 10]

// Dupliquer un scalaire
MOV W0, #42
DUP V1.4S, W0               // V1 = [42, 42, 42, 42]

// Insérer des valeurs individuelles
MOV W1, #100
MOV W2, #200
MOV W3, #300
MOV W4, #400
INS V2.S[0], W1             // V2.S[0] = 100
INS V2.S[1], W2             // V2.S[1] = 200
INS V2.S[2], W3             // V2.S[2] = 300
INS V2.S[3], W4             // V2.S[3] = 400
// V2 = [100, 200, 300, 400]

// Extraire une lane vers un registre général
UMOV W5, V2.S[2]            // W5 = 300
```

### Exemple 2 : Addition vectorielle

```arm
// === Additionner deux vecteurs de 4 entiers ===

.data
vec_a: .word 1, 2, 3, 4
vec_b: .word 10, 20, 30, 40
vec_c: .word 0, 0, 0, 0     // Résultat

.text
// Charger les vecteurs
ADR X0, vec_a
LD1 {V0.4S}, [X0]           // V0 = [1, 2, 3, 4]

ADR X1, vec_b
LD1 {V1.4S}, [X1]           // V1 = [10, 20, 30, 40]

// Addition vectorielle : 4 additions en une instruction !
ADD V2.4S, V0.4S, V1.4S     // V2 = [11, 22, 33, 44]

// Stocker le résultat
ADR X2, vec_c
ST1 {V2.4S}, [X2]           // Écrire en mémoire

// Extraire les résultats pour vérification
UMOV W10, V2.S[0]           // W10 = 11
UMOV W11, V2.S[1]           // W11 = 22
UMOV W12, V2.S[2]           // W12 = 33
UMOV W13, V2.S[3]           // W13 = 44
```

### Exemple 3 : Somme de tous les éléments (réduction)

```arm
// === Calculer la somme de tous les éléments d'un vecteur ===

.data
donnees: .word 10, 20, 30, 40

.text
ADR X0, donnees
LD1 {V0.4S}, [X0]           // V0 = [10, 20, 30, 40]

// ADDV additionne toutes les lanes
ADDV S1, V0.4S              // S1 = 10 + 20 + 30 + 40 = 100

// Extraire le résultat scalaire
UMOV W1, V1.S[0]            // W1 = 100
```

### Exemple 4 : Somme vectorisée d'un grand tableau

```arm
// === Somme de 16 éléments en utilisant SIMD ===
// Au lieu de 16 additions scalaires, on fait 4 additions vectorielles + 1 réduction

.data
tableau: .word 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16

.text
ADR X0, tableau

// Charger 4 vecteurs de 4 éléments chacun (16 éléments au total)
LD1 {V0.4S}, [X0]           // V0 = [1, 2, 3, 4]
ADD X0, X0, #16
LD1 {V1.4S}, [X0]           // V1 = [5, 6, 7, 8]
ADD X0, X0, #16
LD1 {V2.4S}, [X0]           // V2 = [9, 10, 11, 12]
ADD X0, X0, #16
LD1 {V3.4S}, [X0]           // V3 = [13, 14, 15, 16]

// Réduire : additionner les vecteurs entre eux
ADD V0.4S, V0.4S, V1.4S     // V0 = [6, 8, 10, 12]
ADD V0.4S, V0.4S, V2.4S     // V0 = [15, 18, 21, 24]
ADD V0.4S, V0.4S, V3.4S     // V0 = [28, 32, 36, 40]

// Somme horizontale finale
ADDV S4, V0.4S              // S4 = 28 + 32 + 36 + 40 = 136

UMOV W0, V4.S[0]            // W0 = 136

// Vérification : 1+2+...+16 = 16×17/2 = 136 ✓
```

### Exemple 5 : Opérations avec des octets (16B)

```arm
// === Traitement par octets — 16 opérations en parallèle ===

.data
pixels_a: .byte 100, 150, 200, 50, 100, 150, 200, 50, 100, 150, 200, 50, 100, 150, 200, 50
pixels_b: .byte  10,  20,  30, 40,  10,  20,  30, 40,  10,  20,  30, 40,  10,  20,  30, 40

.text
ADR X0, pixels_a
ADR X1, pixels_b

LD1 {V0.16B}, [X0]          // Charger 16 octets
LD1 {V1.16B}, [X1]          // Charger 16 octets

// Addition de 16 paires d'octets en une seule instruction
ADD V2.16B, V0.16B, V1.16B  // V2[i] = V0[i] + V1[i] pour i=0..15

// Stocker le résultat
ST1 {V2.16B}, [X0]          // Écrire sur pixels_a
```

### Exemple 6 : Multiplication et accumulation vectorielle

```arm
// === Produit scalaire de deux vecteurs (dot product) ===
// dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]

.data
vec_x: .word 1, 2, 3, 4
vec_y: .word 5, 6, 7, 8

.text
ADR X0, vec_x
ADR X1, vec_y

LD1 {V0.4S}, [X0]           // V0 = [1, 2, 3, 4]
LD1 {V1.4S}, [X1]           // V1 = [5, 6, 7, 8]

// Multiplication élément par élément
MUL V2.4S, V0.4S, V1.4S     // V2 = [5, 12, 21, 32]

// Réduction : somme des produits
ADDV S3, V2.4S              // S3 = 5 + 12 + 21 + 32 = 70

UMOV W0, V3.S[0]            // W0 = 70

// Vérification : 1×5 + 2×6 + 3×7 + 4×8 = 5+12+21+32 = 70 ✓
```

### Exemple 7 : Comparaison vectorielle

```arm
// === Comparer deux vecteurs élément par élément ===

MOV W0, #10
MOV W1, #20
MOV W2, #30
MOV W3, #40
INS V0.S[0], W0
INS V0.S[1], W1
INS V0.S[2], W2
INS V0.S[3], W3             // V0 = [10, 20, 30, 40]

MOV W0, #15
MOV W1, #20
MOV W2, #25
MOV W3, #45
INS V1.S[0], W0
INS V1.S[1], W1
INS V1.S[2], W2
INS V1.S[3], W3             // V1 = [15, 20, 25, 45]

// Comparer : V0 > V1 ?
CMGT V2.4S, V0.4S, V1.4S
// V2 = [0x00000000, 0x00000000, 0xFFFFFFFF, 0x00000000]
//       10>15? Non  20>20? Non  30>25? Oui   40>45? Non

// Comparer : V0 == V1 ?
CMEQ V3.4S, V0.4S, V1.4S
// V3 = [0x00000000, 0xFFFFFFFF, 0x00000000, 0x00000000]
//       10==15? Non  20==20? Oui  30==25? Non  40==45? Non
```

### Exemple 8 : Arithmétique flottante

```arm
// === Opérations sur des nombres à virgule flottante ===
// Note : les valeurs flottantes sont représentées en IEEE 754

.data
floats_a: .word 0x40A00000, 0x40400000, 0x3F800000, 0x40000000  // 5.0, 3.0, 1.0, 2.0
floats_b: .word 0x40000000, 0x40000000, 0x40000000, 0x40000000  // 2.0, 2.0, 2.0, 2.0

.text
ADR X0, floats_a
ADR X1, floats_b

LD1 {V0.4S}, [X0]           // V0 = [5.0, 3.0, 1.0, 2.0]
LD1 {V1.4S}, [X1]           // V1 = [2.0, 2.0, 2.0, 2.0]

FADD V2.4S, V0.4S, V1.4S    // V2 = [7.0, 5.0, 3.0, 4.0]
FMUL V3.4S, V0.4S, V1.4S    // V3 = [10.0, 6.0, 2.0, 4.0]
FSUB V4.4S, V0.4S, V1.4S    // V4 = [3.0, 1.0, -1.0, 0.0]
FDIV V5.4S, V0.4S, V1.4S    // V5 = [2.5, 1.5, 0.5, 1.0]
```

---

## Exercices suggérés

1. **Double vecteur** : Chargez un vecteur de 4 entiers et doublez chaque élément en utilisant ADD vectoriel (ajoutez le vecteur à lui-même).

2. **Maximum vectoriel** : Trouvez le maximum d'un tableau de 8 éléments en utilisant CMGT et une réduction manuelle.

3. **Moyenne vectorielle** : Calculez la moyenne de 8 entiers en utilisant des opérations SIMD.

4. **Produit scalaire 8D** : Calculez le produit scalaire de deux vecteurs de 8 éléments.

5. **Seuillage d'image** : Simulez un seuillage binaire : pour chaque octet d'un vecteur 16B, mettez 0xFF si la valeur est > 128, sinon 0x00. (Indice : utilisez CMGT avec DUP.)
