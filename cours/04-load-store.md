# 04 — Load/Store et Accès Mémoire

## Objectifs d'apprentissage

- Comprendre le modèle Load/Store de l'architecture ARM64
- Maîtriser les différentes tailles d'accès mémoire (byte, halfword, word, doubleword)
- Connaître et utiliser les 4 modes d'adressage
- Savoir utiliser les directives de données (.word, .byte, .quad)
- Manipuler des tableaux en mémoire

---

## Théorie

### Le modèle Load/Store

En ARM64, **aucune instruction arithmétique ou logique n'accède directement à la mémoire**. Toute donnée doit être :
1. **Chargée** (Load) depuis la mémoire vers un registre
2. **Traitée** dans les registres
3. **Stockée** (Store) du registre vers la mémoire

### Tailles d'accès

| Taille | Load | Store | Bits chargés |
|---|---|---|---|
| Byte (1 octet) | LDRB | STRB | 8 bits, étendu à zéro |
| Halfword (2 octets) | LDRH | STRH | 16 bits, étendu à zéro |
| Word (4 octets) | LDR Wd | STR Wd | 32 bits |
| Doubleword (8 octets) | LDR Xd | STR Xd | 64 bits |

### Extension de signe

Lors d'un chargement plus petit que le registre, deux options :
- **Extension à zéro** (LDRB, LDRH) : les bits supérieurs sont mis à 0
- **Extension de signe** (LDRSB, LDRSH, LDRSW) : le bit de signe est répliqué

```
Valeur en mémoire : 0xF5 (= -11 en signé 8 bits)

LDRB W0, [X1]    → W0 = 0x000000F5 (245 non signé)
LDRSB W0, [X1]   → W0 = 0xFFFFFFF5 (-11 signé)
```

### Les 4 modes d'adressage

| Mode | Syntaxe | Comportement |
|---|---|---|
| Offset immédiat | `[Xn, #imm]` | Adresse = Xn + imm (Xn inchangé) |
| Offset registre | `[Xn, Xm]` | Adresse = Xn + Xm (Xn inchangé) |
| Pré-indexé | `[Xn, #imm]!` | Xn = Xn + imm, puis accès à [Xn] |
| Post-indexé | `[Xn], #imm` | Accès à [Xn], puis Xn = Xn + imm |

---

## Instructions

### Load (chargement mémoire → registre)

| Instruction | Syntaxe | Description |
|---|---|---|
| `LDR` | `LDR Xd, [Xn, #imm]` | Charge 64 bits depuis [Xn + imm] |
| `LDR` | `LDR Wd, [Xn, #imm]` | Charge 32 bits depuis [Xn + imm] |
| `LDRB` | `LDRB Wd, [Xn, #imm]` | Charge 1 octet (étendu à zéro) |
| `LDRH` | `LDRH Wd, [Xn, #imm]` | Charge 2 octets (étendu à zéro) |
| `LDRSB` | `LDRSB Xd, [Xn, #imm]` | Charge 1 octet (extension de signe) |
| `LDRSH` | `LDRSH Xd, [Xn, #imm]` | Charge 2 octets (extension de signe) |
| `LDRSW` | `LDRSW Xd, [Xn, #imm]` | Charge 4 octets (extension de signe → 64 bits) |
| `LDP` | `LDP Xt1, Xt2, [Xn, #imm]` | Charge une paire de registres |
| `LDR` | `LDR Xd, label` | Charge depuis une étiquette (PC-relative) |

### Store (stockage registre → mémoire)

| Instruction | Syntaxe | Description |
|---|---|---|
| `STR` | `STR Xd, [Xn, #imm]` | Stocke 64 bits à [Xn + imm] |
| `STR` | `STR Wd, [Xn, #imm]` | Stocke 32 bits à [Xn + imm] |
| `STRB` | `STRB Wd, [Xn, #imm]` | Stocke 1 octet |
| `STRH` | `STRH Wd, [Xn, #imm]` | Stocke 2 octets |
| `STP` | `STP Xt1, Xt2, [Xn, #imm]` | Stocke une paire de registres |

### Adressage PC-relatif

| Instruction | Syntaxe | Description |
|---|---|---|
| `ADR` | `ADR Xd, label` | Charge l'adresse d'une étiquette dans Xd |
| `ADRP` | `ADRP Xd, label` | Charge l'adresse de la page (4 KB) d'une étiquette |

### Directives de données

| Directive | Taille | Description |
|---|---|---|
| `.byte` | 1 octet | Définit un ou plusieurs octets |
| `.hword` | 2 octets | Définit un ou plusieurs demi-mots |
| `.word` | 4 octets | Définit un ou plusieurs mots |
| `.quad` | 8 octets | Définit un ou plusieurs doubles-mots |
| `.ascii` | variable | Chaîne de caractères (sans \0) |
| `.asciz` | variable | Chaîne de caractères (avec \0 final) |
| `.skip` | N octets | Réserve N octets (remplis de 0) |
| `.align` | - | Aligne sur une frontière |

---

## Exemples commentés

### Exemple 1 : Mode offset immédiat `[Xn, #imm]`

```arm
// === Offset immédiat : l'adresse de base n'est PAS modifiée ===

.data
valeurs: .word 10, 20, 30, 40, 50

.text
ADR X0, valeurs             // X0 = adresse de 'valeurs'

// Charger des éléments du tableau (.word = 4 octets chacun)
LDR W1, [X0]               // W1 = 10 (offset 0)
LDR W2, [X0, #4]           // W2 = 20 (offset 4)
LDR W3, [X0, #8]           // W3 = 30 (offset 8)
LDR W4, [X0, #12]          // W4 = 40 (offset 12)
LDR W5, [X0, #16]          // W5 = 50 (offset 16)

// X0 n'a PAS changé — il pointe toujours vers 'valeurs'
```

### Exemple 2 : Mode offset registre `[Xn, Xm]`

```arm
// === Offset registre : utile pour l'indexation dynamique ===

.data
tab: .word 100, 200, 300, 400

.text
ADR X0, tab                 // X0 = adresse de base du tableau
MOV X1, #0                  // X1 = index (en octets)

LDR W2, [X0, X1]           // W2 = tab[0] = 100

ADD X1, X1, #4              // Avancer de 4 octets (1 word)
LDR W3, [X0, X1]           // W3 = tab[1] = 200

ADD X1, X1, #4
LDR W4, [X0, X1]           // W4 = tab[2] = 300
```

### Exemple 3 : Mode pré-indexé `[Xn, #imm]!`

```arm
// === Pré-indexé : met à jour Xn AVANT l'accès ===
// Utile pour parcourir un tableau en avançant le pointeur

.data
nombres: .word 11, 22, 33, 44

.text
ADR X0, nombres
SUB X0, X0, #4              // Reculer d'une position pour le pré-indexé

LDR W1, [X0, #4]!          // X0 += 4, puis W1 = [X0] = 11
LDR W2, [X0, #4]!          // X0 += 4, puis W2 = [X0] = 22
LDR W3, [X0, #4]!          // X0 += 4, puis W3 = [X0] = 33
LDR W4, [X0, #4]!          // X0 += 4, puis W4 = [X0] = 44

// X0 pointe maintenant vers le dernier élément
```

### Exemple 4 : Mode post-indexé `[Xn], #imm`

```arm
// === Post-indexé : accède PUIS met à jour Xn ===
// Le mode le plus naturel pour parcourir un tableau

.data
serie: .word 5, 10, 15, 20, 25

.text
ADR X0, serie               // X0 pointe vers le début

LDR W1, [X0], #4           // W1 = [X0] = 5, puis X0 += 4
LDR W2, [X0], #4           // W2 = [X0] = 10, puis X0 += 4
LDR W3, [X0], #4           // W3 = [X0] = 15, puis X0 += 4
LDR W4, [X0], #4           // W4 = [X0] = 20, puis X0 += 4
LDR W5, [X0]               // W5 = [X0] = 25 (dernier, pas besoin d'avancer)
```

### Exemple 5 : Différentes tailles d'accès

```arm
// === Comparaison des tailles de chargement ===

.data
octets: .byte 0xFF, 0x80, 0x7F, 0x01, 0x00, 0x00, 0x00, 0x00

.text
ADR X0, octets

// Chargement non signé : extension à zéro
LDRB W1, [X0]              // W1 = 0x000000FF = 255
LDRB W2, [X0, #1]          // W2 = 0x00000080 = 128

// Chargement signé : extension de signe
LDRSB W3, [X0]             // W3 = 0xFFFFFFFF = -1 (0xFF signé = -1)
LDRSB W4, [X0, #1]         // W4 = 0xFFFFFF80 = -128 (0x80 signé = -128)
LDRSB W5, [X0, #2]         // W5 = 0x0000007F = 127 (0x7F signé = +127)
```

### Exemple 6 : Paires de registres (LDP/STP)

```arm
// === LDP/STP : charger/stocker deux registres en une instruction ===

.data
paire: .quad 0xAAAA, 0xBBBB
resultat: .quad 0, 0

.text
ADR X0, paire
ADR X3, resultat

// Charger deux registres 64 bits d'un coup
LDP X1, X2, [X0]           // X1 = 0xAAAA, X2 = 0xBBBB

// Modifier les valeurs
ADD X1, X1, #1              // X1 = 0xAAAB
ADD X2, X2, #1              // X2 = 0xBBBC

// Stocker deux registres d'un coup
STP X1, X2, [X3]           // Stocke X1 et X2 à l'adresse 'resultat'
```

### Exemple 7 : Tableau complet — lecture, modification, écriture

```arm
// === Programme complet : doubler chaque élément d'un tableau ===

.data
tableau: .word 3, 7, 11, 15, 19    // 5 éléments
taille:  .word 5

.text
ADR X0, tableau              // X0 = adresse du tableau
ADR X1, taille
LDR W2, [X1]                // W2 = 5 (nombre d'éléments)
MOV X3, #0                  // X3 = compteur

boucle:
    CMP W3, W2              // Comparer compteur avec taille
    B.GE fin                 // Si compteur >= taille, terminer

    // Calculer l'offset : index × 4 (car .word = 4 octets)
    LSL X4, X3, #2           // X4 = compteur × 4

    // Charger l'élément
    LDR W5, [X0, X4]        // W5 = tableau[compteur]

    // Doubler la valeur
    LSL W5, W5, #1           // W5 = W5 × 2

    // Réécrire dans le tableau
    STR W5, [X0, X4]        // tableau[compteur] = W5

    // Incrémenter le compteur
    ADD X3, X3, #1
    B boucle

fin:
    // Vérification : recharger les valeurs
    ADR X0, tableau
    LDR W10, [X0]           // W10 = 6   (3×2)
    LDR W11, [X0, #4]       // W11 = 14  (7×2)
    LDR W12, [X0, #8]       // W12 = 22  (11×2)
    LDR W13, [X0, #12]      // W13 = 30  (15×2)
    LDR W14, [X0, #16]      // W14 = 38  (19×2)
```

### Exemple 8 : Chaînes de caractères

```arm
// === Charger et parcourir une chaîne ASCII ===

.data
message: .asciz "Hello"     // 'H','e','l','l','o',0

.text
ADR X0, message              // X0 = adresse de la chaîne
MOV X1, #0                   // X1 = compteur de longueur

compter:
    LDRB W2, [X0], #1       // W2 = caractère courant, X0 avance
    CBZ W2, fini             // Si caractère = 0 (fin de chaîne), sortir
    ADD X1, X1, #1           // Incrémenter le compteur
    B compter

fini:
    // X1 contient la longueur de la chaîne (5 pour "Hello")
```

---

## Exercices suggérés

1. **Somme d'un tableau** : Calculez la somme de tous les éléments d'un tableau `.word` de 8 éléments. Stockez le résultat dans X0.

2. **Recherche du maximum** : Trouvez la valeur maximale dans un tableau `.word` et stockez-la dans X0.

3. **Copie de tableau** : Copiez un tableau source vers un tableau destination en utilisant le mode post-indexé.

4. **Inversion** : Inversez un tableau en place (le premier élément échange avec le dernier, etc.).

5. **Longueur de chaîne** : Écrivez un programme qui calcule la longueur d'une chaîne `.asciz` (sans compter le caractère nul).

6. **Conversion majuscules** : Convertissez une chaîne de minuscules en majuscules. (Indice : en ASCII, 'a' = 0x61, 'A' = 0x41, différence = 0x20.)
