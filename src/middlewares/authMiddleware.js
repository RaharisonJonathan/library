const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bibliotech_super_secret_key';

exports.authenticate = (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.status(401).json({ error: 'Session expirée ou non autorisée. Veuillez vous connecter.' });
    }
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    res.locals.user = decoded; // Rend l'utilisateur accessible dans les vues EJS
    next();
  } catch (err) {
    res.clearCookie('token');
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.status(401).json({ error: 'Session invalide. Veuillez vous connecter à nouveau.' });
    }
    return res.redirect('/login');
  }
};

exports.authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(403).json({ error: 'Accès refusé. Autorisations insuffisantes.' });
      }
      return res.status(403).render('error', { 
        message: 'Accès refusé : vous n\'avez pas les permissions nécessaires pour afficher cette page.' 
      });
    }

    next();
  };
};
