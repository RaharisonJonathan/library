const db = require('../config/database');

exports.listBooks = (req, res, next) => {
  try {
    const { search, category } = req.query;
    let query = 'SELECT * FROM books';
    const params = [];

    if (search || category) {
      query += ' WHERE';
      const conditions = [];
      if (search) {
        conditions.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (category) {
        conditions.push('category = ?');
        params.push(category);
      }
      query += ' ' + conditions.join(' AND ');
    }

    const books = db.prepare(query).all(...params);
    const categories = db.prepare('SELECT DISTINCT category FROM books').all().map(c => c.category);

    res.json({ books, categories });
  } catch (err) {
    next(err);
  }
};

exports.createBook = (req, res, next) => {
  try {
    const { title, author, isbn, category, total_copies } = req.body;

    // Validation de doublon ISBN
    const existing = db.prepare('SELECT id FROM books WHERE isbn = ?').get(isbn);
    if (existing) {
      return res.status(400).json({ error: 'Un livre avec cet ISBN existe déjà.' });
    }

    const copies = parseInt(total_copies) || 1;

    db.prepare(`
      INSERT INTO books (title, author, isbn, category, total_copies, available_copies)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, author, isbn, category, copies, copies);

    res.status(201).json({ message: 'Livre ajouté avec succès.' });
  } catch (err) {
    next(err);
  }
};

exports.updateBook = (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, author, isbn, category, total_copies } = req.body;

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ error: 'Livre non trouvé.' });
    }

    // Validation doublon ISBN (autre que le livre actuel)
    const existing = db.prepare('SELECT id FROM books WHERE isbn = ? AND id != ?').get(isbn, id);
    if (existing) {
      return res.status(400).json({ error: 'Un autre livre avec cet ISBN existe déjà.' });
    }

    const diffCopies = parseInt(total_copies) - book.total_copies;
    const newAvailable = book.available_copies + diffCopies;

    if (newAvailable < 0) {
      return res.status(400).json({ error: 'Impossible de réduire le stock en dessous du nombre de livres actuellement empruntés.' });
    }

    db.prepare(`
      UPDATE books
      SET title = ?, author = ?, isbn = ?, category = ?, total_copies = ?, available_copies = ?
      WHERE id = ?
    `).run(title, author, isbn, category, total_copies, newAvailable, id);

    res.json({ message: 'Livre mis à jour avec succès.' });
  } catch (err) {
    next(err);
  }
};

exports.deleteBook = (req, res, next) => {
  try {
    const { id } = req.params;

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ error: 'Livre non trouvé.' });
    }

    // Vérifier si le livre a des emprunts actifs
    const activeLoans = db.prepare("SELECT count(*) as count FROM loans WHERE book_id = ? AND status = 'actif'").get(id).count;
    if (activeLoans > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer un livre ayant des emprunts actifs.' });
    }

    db.prepare('DELETE FROM books WHERE id = ?').run(id);

    res.json({ message: 'Livre supprimé avec succès.' });
  } catch (err) {
    next(err);
  }
};
