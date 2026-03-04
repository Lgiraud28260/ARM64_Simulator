# 03 — Logique et Décalages

## Objectifs d'apprentissage

- Maîtriser les opérations logiques bit à bit (AND, ORR, EOR, BIC, MVN)
- Comprendre les différents types de décalages (LSL, LSR, ASR, ROR)
- Savoir créer et appliquer des masques pour extraire ou modifier des bits

---

## Théorie

### Opérations logiques bit à bit

Les opérations logiques travaillent **bit par bit** sur les registres :

```
AND : 1 ET 1 = 1, sinon 0     (intersection)
ORR : 0 OU 0 = 0, sinon 1     (union)
EOR : bits différents = 1      (ou exclusif)
BIC : AND avec NOT du 2e opérande (bit clear)
MVN : inverse tous les bits    (NOT)
```

### Types de décalages

```
LSL (Logical Shift Left)  : décale à gauche, remplit de 0
  Avant : 0011 0100  (0x34 = 52)
  LSL #2: 1101 0000  (0xD0 = 208)   → multiplication par 2^n

LSR (Logical Shift Right) : décale à droite, remplit de 0
  Avant : 1101 0000  (0xD0 = 208)
  LSR #2: 0011 0100  (0x34 = 52)    → division non signée par 2^n

ASR (Arithmetic Shift Right) : décale à droite, conserve le bit de signe
  Avant : 1111 0000  (-16 en signé 8 bits)
  ASR #2: 1111 1100  (-4)           → division signée par 2^n

ROR (Rotate Right) : rotation, les bits sortants reviennent de l'autre côté
  Avant : 0011 0100
  ROR #2: 0000 1101                 → rotation circulaire
```

### TST — Test de bits

`TST Xn, #mask` est un alias de `ANDS XZR, Xn, #mask`. Il effectue un AND mais ne conserve que les flags, utile pour tester si certains bits sont à 1.

---

## Instructions

### Opérations logiques

| Instruction | Syntaxe | Description |
|---|---|---|
| `AND` | `AND Xd, Xn, #imm` | Xd = Xn AND imm |
| `AND` | `AND Xd, Xn, Xm` | Xd = Xn AND Xm |
| `ANDS` | `ANDS Xd, Xn, Xm` | AND avec mise à jour des flags |
| `ORR` | `ORR Xd, Xn, #imm` | Xd = Xn OR imm |
| `ORR` | `ORR Xd, Xn, Xm` | Xd = Xn OR Xm |
| `EOR` | `EOR Xd, Xn, #imm` | Xd = Xn XOR imm |
| `EOR` | `EOR Xd, Xn, Xm` | Xd = Xn XOR Xm |
| `BIC` | `BIC Xd, Xn, Xm` | Xd = Xn AND (NOT Xm) — efface les bits |
| `MVN` | `MVN Xd, Xm` | Xd = NOT Xm |
| `TST` | `TST Xn, #imm` | AND sans résultat, met les flags (alias ANDS XZR) |
| `ORN` | `ORN Xd, Xn, Xm` | Xd = Xn OR (NOT Xm) |
| `EON` | `EON Xd, Xn, Xm` | Xd = Xn XOR (NOT Xm) |

### Décalages

| Instruction | Syntaxe | Description |
|---|---|---|
| `LSL` | `LSL Xd, Xn, #shift` | Décalage logique à gauche de shift bits |
| `LSL` | `LSL Xd, Xn, Xm` | Décalage logique à gauche de Xm bits |
| `LSR` | `LSR Xd, Xn, #shift` | Décalage logique à droite |
| `LSR` | `LSR Xd, Xn, Xm` | Décalage logique à droite de Xm bits |
| `ASR` | `ASR Xd, Xn, #shift` | Décalage arithmétique à droite (préserve le signe) |
| `ROR` | `ROR Xd, Xn, #shift` | Rotation à droite |

---

## Exemples commentés

### Exemple 1 : Masques et extraction de bits

```arm
// === Isoler un octet spécifique d'un registre ===

// Charger une valeur 32 bits : 0xAABBCCDD
MOVZ X0, #0xCCDD
MOVK X0, #0xAABB, LSL #16

// Extraire l'octet 0 (bits 7:0) = 0xDD
AND X1, X0, #0xFF          // X1 = 0xDD = 221

// Extraire l'octet 1 (bits 15:8) = 0xCC
LSR X2, X0, #8
AND X2, X2, #0xFF          // X2 = 0xCC = 204

// Extraire l'octet 2 (bits 23:16) = 0xBB
LSR X3, X0, #16
AND X3, X3, #0xFF          // X3 = 0xBB = 187

// Extraire l'octet 3 (bits 31:24) = 0xAA
LSR X4, X0, #24
AND X4, X4, #0xFF          // X4 = 0xAA = 170
```

### Exemple 2 : Tester un bit spécifique

```arm
// === Tester si un nombre est pair ou impair ===

MOV X0, #42                // Nombre à tester

// Le bit 0 indique la parité : 0 = pair, 1 = impair
TST X0, #1                 // AND X0, #1 → flags
// Après TST : Z=1 si pair (bit 0 = 0), Z=0 si impair

// === Tester le bit de signe (bit 63) ===
MOV X1, #-5                // Nombre négatif
TST X1, #0x8000000000000000  // Teste le bit 63
// Z=0 car le bit 63 est à 1 (nombre négatif)
```

### Exemple 3 : Manipulation de bits

```arm
// === Mettre à 1 un bit spécifique (Set bit) ===
MOV X0, #0b00001111        // X0 = 0x0F
MOV X1, #1
LSL X1, X1, #5             // X1 = 0b00100000 (masque bit 5)
ORR X0, X0, X1             // X0 = 0b00101111 = 0x2F

// === Mettre à 0 un bit spécifique (Clear bit) ===
MOV X2, #0xFF              // X2 = 0b11111111
MOV X3, #1
LSL X3, X3, #3             // X3 = 0b00001000 (masque bit 3)
BIC X2, X2, X3             // X2 = 0b11110111 = 0xF7

// === Inverser un bit (Toggle bit) ===
MOV X4, #0xAA              // X4 = 0b10101010
MOV X5, #1
LSL X5, X5, #4             // X5 = 0b00010000 (masque bit 4)
EOR X4, X4, X5             // X4 = 0b10111010 = 0xBA
```

### Exemple 4 : Swap de nibbles (demi-octets)

```arm
// === Échanger les nibbles bas et haut d'un octet ===
// Transformer 0xA7 en 0x7A

MOV X0, #0xA7              // X0 = 0xA7 = 0b1010_0111

// Nibble haut → position basse
LSR X1, X0, #4             // X1 = 0x0A
AND X1, X1, #0x0F          // X1 = 0x0A (isoler)

// Nibble bas → position haute
AND X2, X0, #0x0F          // X2 = 0x07
LSL X2, X2, #4             // X2 = 0x70

// Combiner
ORR X3, X1, X2             // X3 = 0x7A ✓
```

### Exemple 5 : Multiplication rapide par décalage

```arm
// === Multiplication par des puissances de 2 ===

MOV X0, #10

LSL X1, X0, #1             // X1 = 10 × 2 = 20
LSL X2, X0, #2             // X2 = 10 × 4 = 40
LSL X3, X0, #3             // X3 = 10 × 8 = 80
LSL X4, X0, #4             // X4 = 10 × 16 = 160

// Multiplication par 5 : x*4 + x = (x << 2) + x
LSL X5, X0, #2
ADD X5, X5, X0             // X5 = 40 + 10 = 50

// Multiplication par 10 : x*8 + x*2 = (x << 3) + (x << 1)
LSL X6, X0, #3
LSL X7, X0, #1
ADD X6, X6, X7             // X6 = 80 + 20 = 100
```

### Exemple 6 : Opérations sur les flags avec EOR

```arm
// === XOR : propriétés utiles ===

MOV X0, #0x55              // 0b01010101

// XOR avec soi-même = 0 (remise à zéro rapide)
EOR X1, X0, X0             // X1 = 0

// Double XOR restaure la valeur (chiffrement simple)
MOV X2, #0xAA              // clé
EOR X3, X0, X2             // X3 = 0x55 XOR 0xAA = 0xFF (chiffré)
EOR X4, X3, X2             // X4 = 0xFF XOR 0xAA = 0x55 (déchiffré)

// Échange sans variable temporaire (XOR swap)
MOV X5, #100
MOV X6, #200
EOR X5, X5, X6             // X5 = 100 XOR 200
EOR X6, X5, X6             // X6 = (100 XOR 200) XOR 200 = 100
EOR X5, X5, X6             // X5 = (100 XOR 200) XOR 100 = 200
// Résultat : X5=200, X6=100 (échangés !)
```

---

## Exercices suggérés

1. **Compter les bits** : Écrivez un programme qui compte le nombre de bits à 1 dans X0. (Indice : boucle avec LSR et AND #1.)

2. **Puissance de 2** : Testez si un nombre dans X0 est une puissance de 2. (Indice : `n & (n-1) == 0` pour n > 0.)

3. **Alignement** : Alignez une adresse dans X0 sur une frontière de 16 octets vers le bas. (Indice : `AND X0, X0, #~0xF`.)

4. **Extraction de champ** : Extrayez les bits 11:8 d'une valeur dans X0 (un champ de 4 bits). Le résultat doit être dans les bits 3:0 de X1.

5. **Inverse des nibbles** : Inversez l'ordre de tous les 16 nibbles d'un registre 64 bits. (Défi avancé.)
