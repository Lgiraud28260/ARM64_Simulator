// === Créer un vecteur et le manipuler ===

// Initialiser toutes les lanes à la même valeur
MOVI V0.4S, #10             // V0 = [10, 10, 10, 10]

// Dupliquer un scalaire
MOV W0, #42
DUP V1.4S, W0               // V1 = [42, 42, 42, 42]

// Insérer des valeurs individuelles
MOV W1,#100
MOV W2,#200
MOV W3,#300
MOV W4,#400
INS V2.S[0], W1             // V2.S[0] = 100
INS V2.S[1], W2             // V2.S[1] = 200
INS V2.S[2], W3             // V2.S[2] = 300
INS V2.S[3], W4             // V2.S[3] = 400
// V2 = [100, 200, 300, 400]

// Extraire une lane vers un registre général
UMOV W5, V2.S[2]            // W5 = 300