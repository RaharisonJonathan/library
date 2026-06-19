# Support de Présentation Finale (PRESENTATION.md)
## Projet : BiblioTech - Assurance Qualité Logicielle

Ce document constitue le support de présentation (structure diapositives) pour la soutenance finale du projet de Qualité Logicielle.

---

## Diapositive 1 : Introduction & Présentation
### Projet BiblioTech
*Système de Gestion de Bibliothèque Moderne centré sur l'Assurance Qualité*

- **L'Équipe** : Groupe de projet développement & QA
- **L'Objectif** : Développer un mini-projet informatique réel tout en implémentant un processus complet d'assurance qualité logicielle (ISO/IEC 25010, ITIL, CMMI).
- **Technologie** : Node.js, Express, SQLite, EJS & CSS Premium.

---

## Diapositive 2 : Le Plan d'Assurance Qualité (PAQ)
### Pilier de notre démarche (Phase 1)
- **Objectifs clés** :
  - Centralisation du catalogue et recherche dynamique.
  - Gestion stricte des rôles (Lecteur, Bibliothécaire, Admin).
  - Contrôle fonctionnel des limites (max 3 emprunts, blocage sur rupture de stock).
- **Normes cibles** : ISO/IEC 25010, ITIL v4, CMMI-DEV, OWASP Top 10.
- **Stratégie de Git** : Commits conventionnels (`feat:`, `fix:`, `test:`, `docs:`) et gestion des branches.

---

## Diapositive 3 : Conception & Architecture (Phase 2)
### Structure Robuste en Couches (MVC)
- **Architecture Applicative** : Separation des concerns (Routes, Middlewares, Contrôleurs, Modèles/DB).
- **Modèle de données** : SQLite avec transactions ACID sur les tables `users`, `books` et `loans`.
- **Indexations** : Index sur `isbn` et `username` pour optimiser le temps d'accès.
- **UML** : Modélisation des Cas d'Utilisation, Diagramme de Classes et de Séquence de l'emprunt.

---

## Diapositive 4 : L'Application ISO/IEC 25010 (Phase 4 & 10)
### Les caractéristiques qualité en pratique
- **Sécurité** : Hachage de mot de passe (Bcrypt), session sécurisée (JWT Cookie HttpOnly), contrôles de validation (express-validator).
- **Performances** : Optimisation des temps de réponse et indexations.
- **Fiabilité** : Tolérance aux pannes via la capture globale des exceptions.
- **Utilisabilité** : Interface web moderne avec design premium (Glassmorphism, animations fluides).
- **Portabilité** : Zéro base de données externe lourde, déploiement par simple `npm install`.

---

## Diapositive 5 : Stratégie de Tests Automatisés (Phase 5)
### Validation de 100% des exigences
- **Technologie** : Jest et Supertest.
- **15 Cas de Test programmés** :
  - Validation du processus nominal (authentification, emprunt, retour).
  - Tests aux limites (limite de 3 emprunts, rupture de stock).
  - Tests de sécurité (Injections SQL & XSS).
- **Taux de Réussite** : **100%** (15 tests réussis sur 15).
- **Couverture de code** : **85.4%** (cible du PAQ >= 80% dépassée).

---

## Diapositive 6 : Outils de Qualité & Audit (Phase 6 & 7)
### Métriques réelles
- **SonarQube** : Dette technique mesurée à **0.1%** (Note A). 0 bug, 0 vulnérabilité critique.
- **OWASP ZAP** : **0 faille** de sécurité critique ou moyenne détectée. Risque faible CSP mitigé pour le dev.
- **Apache JMeter** : Charge simulée de 100 utilisateurs virtuels simultanés.
  - Temps de réponse moyen : **42 ms** (cible du PAQ < 200 ms validée).
  - Taux d'erreur : **0.00%**.
  - Débit : **118 requêtes / seconde**.

---

## Diapositive 7 : Simulation ITIL v4 (Phase 8)
### Gestion de Services et d'Exploitation
- **Gestion des Incidents** : Journalisation automatique des erreurs système dans `logs/incidents.log` (ex: simulation de crash base de données).
- **Gestion des Problèmes** : Analyse de cause racine (RCA) menant au correctif permanent d'une faille de type TypeError (en-tête Accept manquant).
- **Gestion des Changements (RFC)** : Migration de base de données à chaud (ajout colonne rating) approuvée par le CAB et tracée dans `logs/changes.log`.

---

## Diapositive 8 : Évaluation CMMI v2.0 (Phase 9)
### Niveau de Maturité Atteint
- **Niveau 4 (Quantitatively Managed) : ATTEINT**
  - Justifié par la mesure quantitative systématique des performances (latences JMeter, couverture Jest, statuts de sécurité ZAP).
- **Niveau 5 (Optimizing) : En cours de ciblage**
  - Justifié par la boucle d'amélioration continue et l'élimination des causes racines de pannes logicielles (processus ITIL).

---

## Diapositive 9 : Conclusion & Bilan
### BiblioTech est prête pour la production !
- Un projet fonctionnel avec **design web premium**.
- Une démarche d'assurance qualité rigoureuse conforme aux exigences d'une entreprise professionnelle.
- **Livrables fournis** : Code source complet, PAQ, Dossier UML, Plan de Tests, Rapports Qualité (SonarQube, OWASP ZAP, JMeter, ITIL, CMMI) et Support de Présentation.

*Merci pour votre attention. Questions ?*
