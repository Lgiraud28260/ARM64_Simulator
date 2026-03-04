# 07 — Pile et Fonctions

## Objectifs d'apprentissage

- Comprendre le fonctionnement de la pile (stack) en ARM64
- Connaître la convention d'appel AAPCS64
- Savoir écrire un prologue et un épilogue de fonction
- Maîtriser le passage de paramètres et la valeur de retour
- Implémenter des fonctions récursives

---

## Théorie

### La pile (Stack)

La pile est une zone mémoire qui **grandit vers les adresses basses** (vers le bas) :

```
Adresses hautes
┌──────────────────┐
│  ...              │
├──────────────────┤
│  Données empilées │
├──────────────────┤
│  Données empilées │
├──────────────────┤  ← SP (Stack Pointer)
│  (espace libre)   │
│  ...              │
└──────────────────┘
Adresses basses
```

- **Push** (empiler) : diminuer SP, puis écrire
- **Pop** (dépiler) : lire, puis augmenter SP
- SP doit toujours être **aligné sur 16 octets**

### Convention d'appel AAPCS64

La convention AAPCS64 (ARM Architecture Procedure Call Standard) définit les règles d'appel :

| Registres | Usage | Sauvegardé par |
|---|---|---|
| X0 - X7 | Arguments de fonction + valeur de retour (X0) | Appelant (caller) |
| X8 | Résultat indirect | Appelant |
| X9 - X15 | Temporaires | Appelant |
| X16 - X17 | IP0/IP1, temporaires intra-procédure | Appelant |
| X19 - X28 | Variables locales | **Appelé (callee)** |
| X29 (FP) | Frame Pointer | **Appelé** |
| X30 (LR) | Link Register (adresse de retour) | **Appelé** |
| SP | Stack Pointer | **Appelé** |

**Règles clés** :
- Les **arguments** sont passés dans X0 à X7 (8 registres max)
- La **valeur de retour** est dans X0
- Les registres X19-X28 doivent être **restaurés** par la fonction si elle les utilise
- **LR (X30)** doit être sauvegardé si la fonction appelle d'autres fonctions

### Prologue et épilogue

```
ma_fonction:
    // === PROLOGUE ===
    STP X29, X30, [SP, #-16]!   // Sauvegarder FP et LR, SP -= 16
    MOV X29, SP                  // Établir le frame pointer

    // ... corps de la fonction ...

    // === ÉPILOGUE ===
    LDP X29, X30, [SP], #16     // Restaurer FP et LR, SP += 16
    RET                          // Retourner à l'appelant
```

### Sauvegarder des registres callee-saved

Si la fonction utilise X19-X28, elle doit les sauvegarder :

```
ma_fonction:
    STP X29, X30, [SP, #-32]!   // Sauvegarder FP, LR (et réserver 32 octets)
    STP X19, X20, [SP, #16]     // Sauvegarder X19, X20
    MOV X29, SP

    // ... utiliser X19, X20 librement ...

    LDP X19, X20, [SP, #16]     // Restaurer X19, X20
    LDP X29, X30, [SP], #32     // Restaurer FP, LR
    RET
```

---

## Instructions clés

| Instruction | Syntaxe | Description |
|---|---|---|
| `STP` | `STP Xt1, Xt2, [SP, #-N]!` | Push : sauvegarder deux registres sur la pile |
| `LDP` | `LDP Xt1, Xt2, [SP], #N` | Pop : restaurer deux registres depuis la pile |
| `BL` | `BL label` | Appel de fonction (sauvegarde LR) |
| `RET` | `RET` | Retour de fonction (saute à LR) |
| `MOV` | `MOV X29, SP` | Établir le frame pointer |

---

## Exemples commentés

### Exemple 1 : Fonction feuille simple (sans sous-appel)

```arm
// === Programme principal ===
MOV X0, #10             // Premier argument
MOV X1, #20             // Deuxième argument
BL additionner           // Appeler la fonction
// X0 contient le résultat (30)
MOV X2, X0              // Sauvegarder le résultat
B fin

// === Fonction additionner(a, b) → a + b ===
// Fonction "feuille" : elle n'appelle aucune autre fonction
// Pas besoin de sauvegarder LR
additionner:
    ADD X0, X0, X1       // X0 = a + b (résultat dans X0)
    RET

fin:
```

### Exemple 2 : Fonction non-feuille (avec sous-appel)

```arm
// === Programme principal ===
MOV X0, #3              // a = 3
MOV X1, #4              // b = 4
BL somme_carres          // Appeler somme_carres(3, 4)
MOV X5, X0              // X5 = résultat = 25
B fin

// === Fonction carre(n) → n² ===
carre:
    MUL X0, X0, X0       // X0 = n × n
    RET

// === Fonction somme_carres(a, b) → a² + b² ===
// Non-feuille : elle appelle carre(), donc doit sauvegarder LR
somme_carres:
    // Prologue
    STP X29, X30, [SP, #-32]!
    STP X19, X20, [SP, #16]
    MOV X29, SP

    MOV X19, X0          // Sauvegarder a dans X19 (callee-saved)
    MOV X20, X1          // Sauvegarder b dans X20

    // Calculer a²
    MOV X0, X19          // Argument = a
    BL carre             // X0 = a²
    MOV X19, X0          // X19 = a²

    // Calculer b²
    MOV X0, X20          // Argument = b
    BL carre             // X0 = b²

    // Additionner
    ADD X0, X19, X0      // X0 = a² + b²

    // Épilogue
    LDP X19, X20, [SP, #16]
    LDP X29, X30, [SP], #32
    RET

fin:
```

### Exemple 3 : Factorielle récursive

```arm
// === Programme principal ===
MOV X0, #5              // Calculer 5!
BL factorielle           // Résultat dans X0
MOV X1, X0              // X1 = 120
B fin

// === Fonction factorielle(n) → n! ===
// Récursive : factorielle(n) = n × factorielle(n-1)
// Cas de base : factorielle(0) = 1

factorielle:
    // Prologue
    STP X29, X30, [SP, #-32]!
    STP X19, X20, [SP, #16]
    MOV X29, SP

    // Cas de base : n <= 1 → retourner 1
    CMP X0, #1
    B.GT recursion
    MOV X0, #1           // Retourner 1
    B epilogue_fact

recursion:
    MOV X19, X0          // Sauvegarder n dans X19

    // Appel récursif : factorielle(n - 1)
    SUB X0, X0, #1       // X0 = n - 1
    BL factorielle       // X0 = factorielle(n - 1)

    // Multiplier : n × factorielle(n - 1)
    MUL X0, X19, X0      // X0 = n × résultat récursif

epilogue_fact:
    // Épilogue
    LDP X19, X20, [SP, #16]
    LDP X29, X30, [SP], #32
    RET

fin:
// X1 = 120 (5! = 5×4×3×2×1 = 120)
```

### Exemple 4 : Fonction avec variables locales sur la pile

```arm
// === Programme principal ===
MOV X0, #7
MOV X1, #3
BL calculer
MOV X5, X0              // Résultat
B fin

// === Fonction calculer(a, b) ===
// Calcule (a + b) × (a - b) en utilisant des variables locales
calculer:
    // Prologue : réserver 16 octets pour les locales
    STP X29, X30, [SP, #-32]!
    MOV X29, SP

    // Stocker les variables locales sur la pile
    ADD X2, X0, X1       // X2 = a + b
    SUB X3, X0, X1       // X3 = a - b
    STR X2, [SP, #16]    // Variable locale 1 : somme
    STR X3, [SP, #24]    // Variable locale 2 : différence

    // Recharger et calculer
    LDR X4, [SP, #16]    // X4 = somme
    LDR X5, [SP, #24]    // X5 = différence
    MUL X0, X4, X5       // X0 = somme × différence

    // Épilogue
    LDP X29, X30, [SP], #32
    RET

fin:
// X5 = (7+3) × (7-3) = 10 × 4 = 40
```

### Exemple 5 : Fonction avec plus de 8 arguments

```arm
// === Quand il y a plus de 8 arguments, on utilise la pile ===
// Fonction somme9(a, b, c, d, e, f, g, h, i)

// Programme principal
MOV X0, #1               // arg 1
MOV X1, #2               // arg 2
MOV X2, #3               // arg 3
MOV X3, #4               // arg 4
MOV X4, #5               // arg 5
MOV X5, #6               // arg 6
MOV X6, #7               // arg 7
MOV X7, #8               // arg 8

// Le 9e argument doit aller sur la pile
MOV X9, #9
STR X9, [SP, #-16]!     // Push le 9e argument

BL somme9
ADD SP, SP, #16          // Nettoyer la pile (l'appelant nettoie)
MOV X10, X0              // X10 = résultat = 45
B fin

// === Fonction somme9 ===
somme9:
    ADD X0, X0, X1        // 1+2
    ADD X0, X0, X2        // +3
    ADD X0, X0, X3        // +4
    ADD X0, X0, X4        // +5
    ADD X0, X0, X5        // +6
    ADD X0, X0, X6        // +7
    ADD X0, X0, X7        // +8
    LDR X9, [SP]          // Charger le 9e argument depuis la pile
    ADD X0, X0, X9        // +9
    RET

fin:
// X10 = 45 (somme de 1 à 9)
```

---

## Exercices suggérés

1. **Puissance** : Écrivez une fonction `puissance(base, exp)` qui calcule base^exp par multiplications successives. Testez avec puissance(2, 10) = 1024.

2. **Fibonacci récursif** : Écrivez une fonction récursive `fib(n)` qui retourne le n-ième nombre de Fibonacci. Testez avec fib(10) = 55.

3. **Maximum de tableau** : Écrivez une fonction `max_tableau(tableau, taille)` qui retourne le maximum d'un tableau.

4. **Chaîne de fonctions** : Écrivez trois fonctions : `double(x)`, `plus_un(x)`, et `traiter(x)` qui appelle double puis plus_un. Vérifiez que les registres sont correctement sauvegardés.

5. **Tours de Hanoï** : Implémentez l'algorithme récursif des Tours de Hanoï. Comptez le nombre de mouvements pour N = 4 disques (devrait être 15).
