const { body, validationResult } = require('express-validator');

exports.validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Le nom d\'utilisateur doit contenir entre 3 et 20 caractères.')
    .isAlphanumeric().withMessage('Le nom d\'utilisateur ne doit contenir que des lettres et des chiffres.'),
  body('password')
    .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMsg = errors.array().map(e => e.msg).join(' ');
      return res.status(400).render('login', {
        error: errorMsg,
        success: null,
        activeTab: 'register'
      });
    }
    next();
  }
];

exports.validateLogin = [
  body('username').trim().notEmpty().withMessage('Nom d\'utilisateur requis.'),
  body('password').notEmpty().withMessage('Mot de passe requis.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMsg = errors.array().map(e => e.msg).join(' ');
      return res.status(400).render('login', {
        error: errorMsg,
        success: null,
        activeTab: 'login'
      });
    }
    next();
  }
];

exports.validateBook = [
  body('title').trim().notEmpty().withMessage('Le titre est requis.'),
  body('author').trim().notEmpty().withMessage('L\'auteur est requis.'),
  body('isbn')
    .trim()
    .notEmpty().withMessage('L\'ISBN est requis.')
    .matches(/^[0-9-]{10,17}$/).withMessage('L\'ISBN doit être valide (uniquement chiffres et tirets, entre 10 et 17 caractères).'),
  body('category').trim().notEmpty().withMessage('La catégorie est requise.'),
  body('total_copies')
    .isInt({ min: 1, max: 100 }).withMessage('Le stock doit être un entier entre 1 et 100.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array().map(e => e.msg).join(' ') });
    }
    next();
  }
];
