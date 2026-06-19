const fs = require('fs');
const path = require('path');

// Journal d'incidents (ITIL Simulé)
const logIncident = (err, req) => {
  const logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, 'incidents.log');
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [INCIDENT] Method: ${req.method} | URL: ${req.originalUrl} | IP: ${req.ip} | User: ${req.user ? req.user.username : 'Guest'} | Error: ${err.message}\nStack: ${err.stack}\n\n`;

  fs.appendFileSync(logFile, logMessage);
};

exports.handleError = (err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  
  // Enregistrer l'incident
  logIncident(err, req);

  // Gérer les réponses JSON (API)
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(err.status || 500).json({ 
      error: 'Une erreur interne est survenue sur le serveur. L\'incident a été enregistré.' 
    });
  }

  // Gérer le rendu HTML de l'erreur
  res.status(err.status || 500).render('error', {
    message: err.message || 'Une erreur interne est survenue.',
    status: err.status || 500
  });
};
