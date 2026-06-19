# Rapport de Simulation de Gestion des Services ITIL (ITIL_REPORT.md)
## Projet : BiblioTech

Ce document simule et formalise l'application du framework **ITIL v4** au sein de l'exploitation de l'application BiblioTech.

---

### 1. Gestion des Incidents (Incident Management)
*L'objectif est de rétablir le service normal le plus rapidement possible et de minimiser l'impact sur l'activité.*

#### Fiche d'incident #INC-3029 : Indisponibilité Applicative (Panne de Base de Données)
- **Détection** : Alertes automatiques de supervision HTTP (Code 500 récurrents).
- **Impact** : Majeur (Tous les utilisateurs sont bloqués pour la recherche ou l'emprunt).
- **Trame d'Incident dans `logs/incidents.log`** :
  ```
  [2026-06-19T15:54:25Z] [INCIDENT] Method: GET | URL: /api/books | IP: ::1 | Error: no such table: non_existent_table
  ```
- **Diagnostic & Résolution temporaire (Workaround)** :
  1. L'équipe d'exploitation a constaté que la base de données a été interrogée sur une table inexistante (générée par une simulation malveillante ou un script de test erroné).
  2. Le service a été rétabli en réexécutant le script d'initialisation de base de données `src/config/database.js` pour recréer proprement le schéma de données SQLite.
- **Rétablissement** : Service opérationnel en 4 minutes. Ticket clôturé et escaladé vers la Gestion des Problèmes.

---

### 2. Gestion des Problèmes (Problem Management)
*L'objectif est de prévenir les incidents et les incidents récurrents, et de minimiser l'impact des incidents qui ne peuvent pas être évités (analyse de cause racine).*

#### Fiche de problème #PRB-0082 : Plantage suite à des requêtes non-standard (TypeError)
- **Symptôme** : Certains clients légers ou scripts automatisés provoquent des erreurs 500 ("Cannot read properties of undefined") lors des appels API.
- **Analyse de cause racine (Root Cause Analysis - RCA)** :
  L'analyse du code montre que le middleware d'authentification ([authMiddleware.js](file:///e:/Mes%20projets/Mes%20projets%20professionnels/qualite-logiciel/src/middlewares/authMiddleware.js)) tentait de lire la propriété `req.headers.accept` sans vérifier préalablement si cet en-tête était défini par le client. Si l'en-tête manquait, l'appel à `.indexOf()` provoquait un crash système intercepté par Express.
- **Solution Permanente (Correctif de contournement du problème)** :
  Modification de la condition de validation dans le middleware d'authentification pour utiliser une vérification sécurisée :
  ```diff
  - if (req.xhr || req.headers.accept.indexOf('json') > -1) {
  + if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
  ```
  Le correctif a été soumis à la Gestion des Changements (RFC #1023). Le problème est résolu définitivement et aucun nouvel incident de cette nature n'a été enregistré.

---

### 3. Gestion des Changements (Change Management / Change Control)
*L'objectif est de maximiser le nombre de changements de produits et services réussis en veillant à ce que les risques aient été correctement évalués.*

#### Fiche de changement #RFC-1024 : Évolution de la Base de Données (Ajout colonne `rating`)
- **Description** : Demande d'ajout d'une fonctionnalité de notation des livres (étoiles de 1 à 5). Nécessite l'altération de la table `books` en base de données.
- **Évaluation des Risques & Impact** :
  - *Risque* : Blocage de la base de données pendant la migration.
  - *Impact* : Faible (SQLite gère l'ajout de colonne via `ALTER TABLE` de façon instantanée).
  - *Plan de retour arrière (Rollback)* : Restaurer la sauvegarde de la base `library.db.bak` effectuée avant la migration.
- **Approbation** : Validé par le Change Advisory Board (CAB) le 19 juin 2026.
- **Déploiement et Traçabilité dans `logs/changes.log`** :
  La migration a été jouée par le serveur. Le journal de traçabilité atteste du succès :
  ```
  [2026-06-19T18:54:34.902Z] [CHANGE APPROVED & DEPLOYED] RFC #1024 - Alter Books Table. Initiated by: admin
  ```
- **Validation** : Le test post-déploiement confirme que la colonne `rating` est accessible et initialisée avec la valeur par défaut `5`. Changement fermé avec succès.
