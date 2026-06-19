const db = require('../config/database');

exports.borrowBook = (req, res, next) => {
  const transaction = db.transaction(() => {
    const { bookId } = req.body;
    const userId = req.user.id;

    // 1. Vérifier si l'utilisateur a déjà 3 emprunts actifs (Limite qualité/fonctionnelle)
    const activeLoans = db.prepare(`
      SELECT count(*) as count FROM loans 
      WHERE user_id = ? AND status = 'actif'
    `).get(userId).count;

    if (activeLoans >= 3) {
      throw new Error('LIMIT_EXCEEDED');
    }

    // 2. Vérifier si le livre existe et est disponible
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) {
      throw new Error('BOOK_NOT_FOUND');
    }

    if (book.available_copies <= 0) {
      throw new Error('NO_STOCK');
    }

    // 3. Vérifier si l'utilisateur a déjà emprunté ce livre précis sans le rendre
    const alreadyBorrowed = db.prepare(`
      SELECT id FROM loans 
      WHERE user_id = ? AND book_id = ? AND status = 'actif'
    `).get(userId, bookId);

    if (alreadyBorrowed) {
      throw new Error('ALREADY_BORROWED');
    }

    // Calculer la date de retour prévue (J + 14 jours)
    const loanDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(loanDate.getDate() + 14);

    // 4. Enregistrer l'emprunt
    db.prepare(`
      INSERT INTO loans (user_id, book_id, loan_date, due_date, status)
      VALUES (?, ?, ?, ?, 'actif')
    `).run(userId, bookId, loanDate.toISOString(), dueDate.toISOString());

    // 5. Mettre à jour le stock disponible
    db.prepare(`
      UPDATE books 
      SET available_copies = available_copies - 1 
      WHERE id = ?
    `).run(bookId);

    return true;
  });

  try {
    transaction();
    res.status(201).json({ message: 'Livre emprunté avec succès.' });
  } catch (err) {
    if (err.message === 'LIMIT_EXCEEDED') {
      return res.status(400).json({ error: 'Limite d\'emprunts atteinte (maximum 3 livres simultanés).' });
    }
    if (err.message === 'BOOK_NOT_FOUND') {
      return res.status(404).json({ error: 'Livre non trouvé.' });
    }
    if (err.message === 'NO_STOCK') {
      return res.status(400).json({ error: 'Rupture de stock pour ce livre.' });
    }
    if (err.message === 'ALREADY_BORROWED') {
      return res.status(400).json({ error: 'Vous avez déjà un exemplaire actif de ce livre en cours d\'emprunt.' });
    }
    next(err);
  }
};

exports.returnBook = (req, res, next) => {
  const transaction = db.transaction(() => {
    const { loanId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Récupérer l'emprunt
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan) {
      throw new Error('LOAN_NOT_FOUND');
    }

    if (loan.status !== 'actif') {
      throw new Error('ALREADY_RETURNED');
    }

    // Seul le lecteur concerné ou un bibliothécaire/admin peut retourner le livre
    if (loan.user_id !== userId && userRole === 'lecteur') {
      throw new Error('UNAUTHORIZED');
    }

    // 2. Mettre à jour l'emprunt
    const returnDate = new Date();
    db.prepare(`
      UPDATE loans 
      SET status = 'retourne', return_date = ? 
      WHERE id = ?
    `).run(returnDate.toISOString(), loanId);

    // 3. Mettre à jour le stock disponible
    db.prepare(`
      UPDATE books 
      SET available_copies = available_copies + 1 
      WHERE id = ?
    `).run(loan.book_id);

    return true;
  });

  try {
    transaction();
    res.json({ message: 'Livre retourné avec succès.' });
  } catch (err) {
    if (err.message === 'LOAN_NOT_FOUND') {
      return res.status(404).json({ error: 'Emprunt non trouvé.' });
    }
    if (err.message === 'ALREADY_RETURNED') {
      return res.status(400).json({ error: 'Ce livre a déjà été retourné.' });
    }
    if (err.message === 'UNAUTHORIZED') {
      return res.status(403).json({ error: 'Non autorisé à retourner cet emprunt.' });
    }
    next(err);
  }
};

exports.listLoans = (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let loans;
    if (role === 'lecteur') {
      // Les lecteurs ne voient que leurs propres emprunts
      loans = db.prepare(`
        SELECT l.*, b.title, b.author, b.isbn 
        FROM loans l
        JOIN books b ON l.book_id = b.id
        WHERE l.user_id = ?
        ORDER BY l.loan_date DESC
      `).all(userId);
    } else {
      // Les bibliothécaires et admins voient tous les emprunts
      loans = db.prepare(`
        SELECT l.*, b.title, b.author, b.isbn, u.username
        FROM loans l
        JOIN books b ON l.book_id = b.id
        JOIN users u ON l.user_id = u.id
        ORDER BY l.status DESC, l.loan_date DESC
      `).all();
    }

    // Mettre à jour dynamiquement le statut "en_retard" si due_date dépassée et toujours actif
    const now = new Date();
    loans.forEach(loan => {
      if (loan.status === 'actif' && new Date(loan.due_date) < now) {
        loan.status = 'en_retard';
        db.prepare("UPDATE loans SET status = 'en_retard' WHERE id = ?").run(loan.id);
      }
    });

    res.json(loans);
  } catch (err) {
    next(err);
  }
};
