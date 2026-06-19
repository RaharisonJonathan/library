# Cahier de Tests (TEST_PLAN.md)
## Projet : BiblioTech

Ce document définit la stratégie, les scénarios de test et les cas de test fonctionnels et non-fonctionnels mis en œuvre pour valider l'application BiblioTech conformément aux exigences de qualité logicielle (ISO/IEC 25010).

---

### 1. Stratégie de Test et Couverture
Nous utilisons une approche de tests automatisés multiniveaux combinée à des vérifications manuelles pour garantir une fiabilité maximale.

- **Tests unitaires & d'intégration** : Implémentés avec **Jest** et **Supertest** pour valider les modèles, les services et les API HTTP.
- **Tests de Robustesse (Limites)** : Vérification des règles métiers strictes (ex: blocage au 4ème emprunt).
- **Tests de Sécurité** : Test d'injection SQL et injection XSS sur les entrées utilisateurs.
- **Tests de Performance** : Validation de la latence de l'API.

---

### 2. Matrice de Traçabilité des Tests

| ID Exigence | Description de l'exigence | Type de test | ID Cas de Test | Statut Automatisé |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-AUTH-01** | Inscription sécurisée d'un utilisateur | Fonctionnel | `TC-AUTH-01` | Oui (Jest/Supertest) |
| **REQ-AUTH-02** | Connexion et émission d'un token JWT valide | Fonctionnel | `TC-AUTH-02` | Oui (Jest/Supertest) |
| **REQ-AUTH-03** | Refus de connexion avec identifiants invalides | Robustesse | `TC-AUTH-03` | Oui (Jest/Supertest) |
| **REQ-CAT-01**  | Ajout de livre par un bibliothécaire/admin | Fonctionnel | `TC-CAT-01`  | Oui (Jest/Supertest) |
| **REQ-CAT-02**  | Refus d'ajout de livre par un lecteur simple | Sécurité | `TC-CAT-02`  | Oui (Jest/Supertest) |
| **REQ-CAT-03**  | Recherche dynamique multicritères de livres | Fonctionnel | `TC-CAT-03`  | Oui (Jest/Supertest) |
| **REQ-LOAN-01** | Emprunter un livre disponible (stock -1) | Fonctionnel | `TC-LOAN-01` | Oui (Jest/Supertest) |
| **REQ-LOAN-02** | Blocage de l'emprunt si stock épuisé (0) | Robustesse | `TC-LOAN-02` | Oui (Jest/Supertest) |
| **REQ-LOAN-03** | Blocage de l'emprunt si quota utilisateur > 3 | Robustesse | `TC-LOAN-03` | Oui (Jest/Supertest) |
| **REQ-LOAN-04** | Retourner un livre (stock +1, statut retourné) | Fonctionnel | `TC-LOAN-04` | Oui (Jest/Supertest) |
| **REQ-SEC-01**  | Blocage des injections SQL sur la recherche | Sécurité | `TC-SEC-01`  | Oui (Jest/Supertest) |
| **REQ-SEC-02**  | Blocage XSS par échappement dans les vues | Sécurité | `TC-SEC-02`  | Oui (Jest/Supertest) |

---

### 3. Fiches de Cas de Test (Détails)

#### TC-AUTH-03 : Connexion invalide
- **Objectif** : Vérifier que le système rejette les mauvais mots de passe et ne divulgue pas d'informations sensibles.
- **Entrées** : `username: "lecteur", password: "wrongpassword"`
- **Procédure** :
  1. POST `/login` avec les entrées.
- **Résultat attendu** : Statut HTTP `401 Unauthorized` et réaffichage du formulaire avec une alerte d'erreur générique.

#### TC-LOAN-03 : Quota d'emprunts dépassé
- **Objectif** : Vérifier que le système refuse l'emprunt d'un 4ème livre pour un même adhérent.
- **Prérequis** : L'utilisateur "lecteur" possède déjà 3 emprunts "actifs" en base de données.
- **Entrées** : `bookId: 4`
- **Procédure** :
  1. POST `/api/loans` avec le jeton de l'utilisateur.
- **Résultat attendu** : Statut HTTP `400 Bad Request` et message d'erreur expliquant que le quota de 3 livres maximum a été atteint.

#### TC-SEC-01 : Injection SQL
- **Objectif** : S'assurer que les caractères spéciaux SQL ne brisent pas la requête SQLite et ne divulguent pas de données.
- **Entrées** : `search: "Clean Code' OR 1=1 --"`
- **Procédure** :
  1. GET `/api/books?search=Clean%20Code%27%20OR%201%3D1%20--`
- **Résultat attendu** : Statut HTTP `200 OK`. Le système traite l'entrée comme une chaîne littérale et ne retourne aucun livre (ou uniquement le livre correspondant précisément au titre injecté, s'il existait), sans générer d'erreur de base de données.

---

### 4. Procédure d'Exécution des Tests
Pour lancer les tests automatisés :
```bash
npm test
```
La commande exécutera la suite Jest, affichera les assertions validées et calculera la couverture de code.
