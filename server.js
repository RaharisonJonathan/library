const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const db = require('./src/config/database');
const authController = require('./src/controllers/authController');
const bookController = require('./src/controllers/bookController');
const loanController = require('./src/controllers/loanController');

const { authenticate, authorize } = require('./src/middlewares/authMiddleware');
const { validateRegister, validateLogin, validateBook } = require('./src/middlewares/validationMiddleware');
const { handleError } = require('./src/middlewares/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuration de sécurité (ISO/IEC 25010 Sécurité)
app.use(helmet({
  contentSecurityPolicy: false // Désactivé pour simplifier le chargement des styles CDN et scripts internes dans ce projet académique
}));

// Limiteur de requêtes (Rate limiting) pour prévenir la force brute et les attaques par déni de service
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limite chaque IP à 200 requêtes par fenêtre
  message: { error: 'Trop de requêtes effectuées depuis cette adresse IP, réessayez plus tard.' }
});
app.use('/api/', limiter);

// 2. Middlewares standards
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'src/public')));

// 3. Moteur de rendu
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 4. Routes Statiques / Vues EJS
app.get('/', (req, res) => {
  const token = req.cookies.token;
  if (token) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  const token = req.cookies.token;
  if (token) return res.redirect('/dashboard');
  res.render('login', { error: null, success: null, activeTab: 'login' });
});

app.post('/register', validateRegister, authController.register);
app.post('/login', validateLogin, authController.login);
app.get('/logout', authController.logout);

app.get('/dashboard', authenticate, (req, res) => {
  res.render('dashboard');
});

// 5. API Routes (Protégées)
app.get('/api/books', authenticate, bookController.listBooks);
app.post('/api/books', authenticate, authorize(['bibliothecaire', 'admin']), validateBook, bookController.createBook);
app.put('/api/books/:id', authenticate, authorize(['bibliothecaire', 'admin']), validateBook, bookController.updateBook);
app.delete('/api/books/:id', authenticate, authorize(['bibliothecaire', 'admin']), bookController.deleteBook);

app.get('/api/loans', authenticate, loanController.listLoans);
app.post('/api/loans', authenticate, loanController.borrowBook);
app.post('/api/loans/return', authenticate, loanController.returnBook);

// 6. ITIL Simulation Routes (Admin uniquement)
app.get('/api/itil/simulate-incident', authenticate, authorize(['admin']), (req, res, next) => {
  const { type } = req.query;
  try {
    if (type === 'crash') {
      // Simuler une panne de base de données
      // On va volontairement essayer d'interroger une table inexistante
      db.prepare('SELECT * FROM non_existent_table').all();
    } else if (type === 'error') {
      // Déclencher une erreur d'exécution système (500)
      throw new Error('SYSTEM_FAILURE_500: Fuite de mémoire détectée ou plantage applicatif.');
    } else {
      res.json({ message: 'Type d\'incident inconnu.' });
    }
  } catch (err) {
    // Transférer l'erreur au middleware global pour enregistrement
    next(err);
  }
});

// Récupération des logs d'incidents récents pour affichage dynamique sur l'UI admin
app.get('/api/itil/logs', authenticate, authorize(['admin']), (req, res) => {
  const logPath = path.join(__dirname, 'logs/incidents.log');
  if (!fs.existsSync(logPath)) {
    return res.json({ logs: 'Aucun incident enregistré pour le moment.' });
  }
  
  const content = fs.readFileSync(logPath, 'utf8');
  // Retourner les 20 dernières lignes
  const lines = content.split('\n').slice(-20).join('\n');
  res.json({ logs: lines });
});

app.post('/api/itil/simulate-change', authenticate, authorize(['admin']), (req, res) => {
  try {
    // Simuler une Request For Change (RFC) : ajout d'une colonne optionnelle "rating" dans books
    // Si la colonne existe déjà, SQLite renverra une erreur qu'on va capturer proprement
    let message = "La demande de changement (RFC #1024) a été évaluée et approuvée par le CAB (Change Advisory Board).\n";
    try {
      db.exec('ALTER TABLE books ADD COLUMN rating INT DEFAULT 5');
      message += "La modification de la base de données a été déployée avec succès (Ajout de la colonne 'rating').";
    } catch (dbErr) {
      if (dbErr.message.includes('duplicate column name')) {
        message += "La base de données est déjà à jour (colonne 'rating' déjà présente). Le statut de la RFC est CLOS/SUCCÈS.";
      } else {
        throw dbErr;
      }
    }

    // Logger le changement dans logs/changes.log (ITIL Change Management)
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    const logFile = path.join(logDir, 'changes.log');
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] [CHANGE APPROVED & DEPLOYED] RFC #1024 - Alter Books Table. Initiated by: ${req.user.username}\n`);

    res.json({
      message: "Changement déployé avec succès.",
      notes: message
    });
  } catch (err) {
    res.status(500).json({ error: "Échec du traitement du changement (ITIL Change Management) : " + err.message });
  }
});

// Middleware personnalisé pour capturer les erreurs de simulation d'incident et renvoyer un format lisible
app.use((err, req, res, next) => {
  if (req.originalUrl.startsWith('/api/itil/simulate-incident')) {
    // Pour l'API de simulation d'incident, on veut logger l'incident puis renvoyer les logs récents sous forme de JSON
    // Cela permet à l'UI Admin d'afficher instantanément le résultat de l'incident enregistré
    
    // Log l'erreur via le gestionnaire d'erreurs (qui écrit dans logs/incidents.log)
    handleError(err, req, res, next);
    
    // Lire le fichier log pour le renvoyer
    const logPath = path.join(__dirname, 'logs/incidents.log');
    let recentLogs = 'Erreur d\'écriture de log.';
    if (fs.existsSync(logPath)) {
      recentLogs = fs.readFileSync(logPath, 'utf8').split('\n').slice(-15).join('\n');
    }
    
    return res.status(200).json({
      message: `Incident enregistré avec succès dans les journaux ITIL. Nature de l'incident : ${err.message}`,
      logs: recentLogs
    });
  }
  
  // Comportement standard pour les autres routes
  handleError(err, req, res, next);
});

// 7. Démarrage du serveur
const server = app.listen(PORT, () => {
  console.log(`[BiblioTech Server] Démarré avec succès sur le port ${PORT}`);
  console.log(`[BiblioTech Server] URL locale : http://localhost:${PORT}`);
});

module.exports = server; // Exporté pour les tests Jest/Supertest
