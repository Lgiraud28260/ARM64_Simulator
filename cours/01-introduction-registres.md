# 01 — Introduction et Registres ARM64

## Objectifs d'apprentissage

- Comprendre l'architecture ARM64 (AArch64) et ses différences avec x86
- Connaître les registres généraux et spéciaux
- Savoir charger des constantes dans les registres avec MOV, MOVZ, MOVK, MOVN

---

## Théorie

### Architecture ARM64

ARM64 (aussi appelée **AArch64**) est une architecture **RISC** (Reduced Instruction Set Computer) :

| Caractéristique | RISC (ARM64) | CISC (x86-64) |
|---|---|---|
| Taille des instructions | Fixe (32 bits) | Variable (1-15 octets) |
| Accès mémoire | Load/Store uniquement | Opérations directes sur mémoire |
| Nombre de registres | 31 registres généraux | 16 registres généraux |
| Complexité | Instructions simples | Instructions complexes |

En ARM64, **seules les instructions Load/Store accèdent à la mémoire**. Toutes les opérations arithmétiques et logiques travaillent exclusivement sur les registres.

### Registres généraux

ARM64 dispose de **31 registres généraux**, accessibles en deux tailles :

| 64 bits | 32 bits | Description |
|---|---|---|
| X0 - X7 | W0 - W7 | Arguments / valeurs de retour |
| X8 | W8 | Registre temporaire (résultat indirect) |
| X9 - X15 | W9 - W15 | Temporaires (caller-saved) |
| X16 - X17 | W16 - W17 | Intra-procedure call (IP0, IP1) |
| X18 | W18 | Registre de plateforme |
| X19 - X28 | W19 - W28 | Sauvegardés par l'appelé (callee-saved) |
| X29 | W29 | Frame Pointer (FP) |
| X30 | W30 | Link Register (LR) — adresse de retour |

> **Important** : Quand on écrit dans un registre W (32 bits), les 32 bits supérieurs du registre X correspondant sont automatiquement mis à zéro.

### Registres spéciaux

| Registre | Rôle |
|---|---|
| **SP** | Stack Pointer — pointe vers le sommet de la pile |
| **PC** | Program Counter — adresse de l'instruction en cours (non accessible directement) |
| **XZR / WZR** | Registre zéro — toujours égal à 0, les écritures sont ignorées |
| **LR (X30)** | Link Register — stocke l'adresse de retour lors d'un BL |
| **FP (X29)** | Frame Pointer — base du cadre de pile de la fonction courante |

### Drapeaux (Flags) NZCV

Les drapeaux sont mis à jour par les instructions qui se terminent par **S** (ADDS, SUBS, ANDS…) ou par CMP/CMN/TST :

| Flag | Nom | Signification |
|---|---|---|
| **N** | Negative | Le résultat est négatif (bit de poids fort = 1) |
| **Z** | Zero | Le résultat est zéro |
| **C** | Carry | Report (unsigned overflow ou shift-out) |
| **V** | Overflow | Débordement signé |

---

## Instructions

| Instruction | Syntaxe | Description |
|---|---|---|
| `MOV` | `MOV Xd, Xn` | Copie la valeur de Xn dans Xd |
| `MOV` | `MOV Xd, #imm` | Charge une constante 16 bits dans Xd |
| `MOVZ` | `MOVZ Xd, #imm, LSL #shift` | Met imm dans Xd, le reste à zéro. Shift : 0, 16, 32, 48 |
| `MOVK` | `MOVK Xd, #imm, LSL #shift` | Insère imm dans Xd sans modifier les autres bits (Keep) |
| `MOVN` | `MOVN Xd, #imm, LSL #shift` | Comme MOVZ puis NOT sur tout le registre |

> **MOV** est un pseudo-instruction : l'assembleur choisit automatiquement MOVZ, MOVN, ou ORR selon la valeur.

---

## Exemples commentés

### Exemple 1 : Chargement de constantes simples

```arm
// === Chargement de constantes dans les registres ===

// Constante 16 bits (tient dans un MOV direct)
MOV X0, #42              // X0 = 42
MOV X1, #0xFF            // X1 = 255

// Constante 32 bits avec MOVZ + MOVK
MOVZ X2, #0x5678         // X2 = 0x0000_0000_0000_5678
MOVK X2, #0x1234, LSL #16  // X2 = 0x0000_0000_1234_5678

// Constante 64 bits complète
MOVZ X3, #0xDEAD, LSL #48  // X3 = 0xDEAD_0000_0000_0000
MOVK X3, #0xBEEF, LSL #32  // X3 = 0xDEAD_BEEF_0000_0000
MOVK X3, #0xCAFE, LSL #16  // X3 = 0xDEAD_BEEF_CAFE_0000
MOVK X3, #0xBABE           // X3 = 0xDEAD_BEEF_CAFE_BABE
```

### Exemple 2 : Registres 32 bits vs 64 bits

```arm
// === Différence entre registres W et X ===

// Charger une valeur 64 bits
MOV X0, #0xFFFF
MOVK X0, #0xFFFF, LSL #16  // X0 = 0x0000_0000_FFFF_FFFF

// Écrire dans W0 efface les 32 bits supérieurs !
MOV W0, #1                  // X0 = 0x0000_0000_0000_0001
                             // Les bits 63-32 sont mis à zéro

// Copie entre registres
MOV X1, #100
MOV X2, X1                  // X2 = 100
```

### Exemple 3 : Valeurs négatives avec MOVN

```arm
// === Chargement de valeurs négatives ===

// MOVN charge NOT(imm << shift)
MOVN X0, #0                 // X0 = 0xFFFF_FFFF_FFFF_FFFF = -1
MOVN X1, #1                 // X1 = 0xFFFF_FFFF_FFFF_FFFE = -2
MOVN X2, #41                // X2 = -42

// MOV avec constante négative (l'assembleur utilise MOVN)
MOV X3, #-100               // X3 = -100
```

### Exemple 4 : Le registre zéro

```arm
// === Utilisation de XZR ===

// XZR vaut toujours 0
MOV X0, XZR                 // X0 = 0 (équivalent à MOV X0, #0)

// Écrire dans XZR ne fait rien (utile pour ignorer un résultat)
// CMP utilise XZR en interne : CMP X1, X2 == SUBS XZR, X1, X2
```

---

## Exercices suggérés

1. **Constante 32 bits** : Chargez la valeur `0xCAFEBABE` dans X0 en utilisant MOVZ et MOVK.

2. **Échange de registres** : Copiez X0 dans X1 et X1 dans X0 en utilisant un registre temporaire (X2).

3. **Exploration W vs X** : Chargez `0xFFFFFFFF` dans X0, puis écrivez `MOV W0, #5`. Observez que les 32 bits supérieurs sont effacés.

4. **Valeur négative** : Utilisez MOVN pour charger -256 dans X0. Vérifiez le résultat.

5. **Constante 64 bits** : Chargez votre numéro de téléphone (ou un nombre à 10 chiffres) dans X0 en utilisant MOVZ et MOVK.
