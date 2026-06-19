const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bibliotech_super_secret_key';

exports.register = (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    
    // Rôle par défaut : lecteur, seuls les admins peuvent créer d'autres admins/bibliothécaires
    let finalRole = 'lecteur';
    if (role && ['lecteur', 'bibliothecaire', 'admin'].includes(role)) {
      // Si l'utilisateur connecté est un admin, on respecte le rôle demandé.
      // Sinon, on force à lecteur.
      if (req.user && req.user.role === 'admin') {
        finalRole = role;
      }
    }

    // Vérifier si l'utilisateur existe déjà
    const userExists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (userExists) {
      return res.status(400).render('login', { 
        error: 'Cet utilisateur existe déjà.', 
        success: null,
        activeTab: 'register'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, finalRole);

    res.status(201).render('login', { 
      error: null, 
      success: 'Compte créé avec succès ! Connectez-vous.',
      activeTab: 'login'
    });
  } catch (err) {
    next(err);
  }
};

exports.login = (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).render('login', { 
        error: 'Identifiants invalides.', 
        success: null,
        activeTab: 'login'
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).render('login', { 
        error: 'Identifiants invalides.', 
        success: null,
        activeTab: 'login'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Mettre dans le cookie
    res.cookie('token', token, {
      httpOnly: true, // Protège contre les attaques XSS (ISO/IEC 25010 Sécurité)
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60 * 1000 // 2 heures
    });

    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
};
