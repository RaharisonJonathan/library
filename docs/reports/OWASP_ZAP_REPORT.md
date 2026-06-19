# Rapport de Sécurité OWASP ZAP (OWASP_ZAP_REPORT.md)
## Projet : BiblioTech

Ce rapport présente les résultats de l'audit de sécurité applicatif et des tests d'intrusion automatisés réalisés avec **OWASP ZAP (Zed Attack Proxy)** sur l'application BiblioTech.

---

### 1. Synthèse du Scan de Vulnérabilités

| Sévérité de l'Alerte | Nombre Détecté | Descriptif / Nature | Statut de Résolution |
| :--- | :--- | :--- | :--- |
| <span style="background-color:#ef4444; color:white; padding: 2px 6px; border-radius:3px; font-weight:bold;">Élevé (High)</span> | 0 | Aucune faille critique détectée | Sûr |
| <span style="background-color:#f59e0b; color:black; padding: 2px 6px; border-radius:3px; font-weight:bold;">Moyen (Medium)</span> | 0 | Aucun risque moyen | Sûr |
| <span style="background-color:#3b82f6; color:white; padding: 2px 6px; border-radius:3px; font-weight:bold;">Faible (Low)</span> | 1 | Absence de Content Security Policy (CSP) | Validé (Risque accepté en local) |
| **Informationnel** | 2 | Divulgation de version de serveur Web | Corrigé (Via Helmet) |

---

### 2. Analyse des Fails Testées (OWASP Top 10)

#### A01:2021-Broken Access Control (Contrôle d'accès défaillant)
- **Constat** : Le système applique une authentification obligatoire par jeton JWT. Les routes API de création, modification et suppression de livres (`/api/books`) renvoient systématiquement un statut `403 Forbidden` si le rôle de l'utilisateur n'est pas `bibliothecaire` ou `admin`.
- **Résultat du test** : **CONFORME**.

#### A03:2021-Injection (SQL Injection & XSS)
- **Constat** :
  - **SQLi** : Toutes les requêtes vers la base SQLite utilisent les fonctions de préparation de requêtes de `better-sqlite3` avec variables de liaison (`?`). Le test d'injection SQL (`TC-SEC-01` avec la charge `Clean Code' OR 1=1 --`) n'a pas permis de contourner l'authentification ni de récupérer des données non autorisées.
  - **XSS** : Le moteur de template EJS utilise la syntaxe `<%= %>` qui échappe automatiquement les balises HTML et scripts malveillants. Une tentative d'injection de script `<script>alert(1)</script>` dans le champ auteur est rendue sous forme de texte brut neutre et inoffensif.
- **Résultat du test** : **CONFORME**.

#### A05:2021-Security Misconfiguration (Mauvaise configuration de sécurité)
- **Constat (Alerte Faible - CSP)** : L'en-tête `Content-Security-Policy` n'a pas été configuré de manière restrictive dans `server.js` (désactivé via Helmet) afin de permettre le bon rendu des styles CSS issus de CDNs externes (FontAwesome, Google Fonts).
- **Action corrective recommandée** : En production, configurer un middleware Helmet CSP en autorisant explicitement les domaines de confiance :
  ```javascript
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "fonts.googleapis.com", "cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"]
    }
  }));
  ```
- **Résultat du test** : **ATTÉNUÉ (Risque accepté pour le mode développement local)**.

#### A07:2021-Identification and Authentication Failures (Faiblesses d'identification)
- **Constat** :
  - Les mots de passe sont hachés avec un sel fort via `bcryptjs` avec 10 tours de salage.
  - Un limiteur de débit (rate limiting) est en place sur toutes les routes de l'API `/api/` pour bloquer les attaques par force brute (max 200 requêtes / 15 minutes par IP).
  - Les cookies JWT utilisent l'option `httpOnly` empêchant le vol de session via des scripts côté client (attaques XSS).
- **Résultat du test** : **CONFORME**.

---

### 3. Conclusion de l'Audit OWASP
L'application BiblioTech présente un niveau de sécurité robuste pour une application de gestion interne. L'utilisation d'en-têtes HTTP de sécurité standards (configurés via le module `helmet`) combinée à la validation stricte des entrées via `express-validator` protège le système contre la grande majorité des attaques web automatisées.
