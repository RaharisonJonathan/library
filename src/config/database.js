const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.join(__dirname, '../../library.db');

const db = new Database(dbPath);

// Activer les clés étrangères
db.pragma('foreign_keys = ON');

// Initialisation des tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'lecteur',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    loan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    return_date DATETIME DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'actif',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  -- Création des index pour optimiser les performances (ISO/IEC 25010)
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
  CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
  CREATE INDEX IF NOT EXISTS idx_loans_book ON loans(book_id);
  CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
`);

// Seeding des utilisateurs initiaux et des livres s'ils n'existent pas
const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;

if (userCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
  
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);
  const biblioHash = bcrypt.hashSync('biblio123', salt);
  const lecteurHash = bcrypt.hashSync('lecteur123', salt);

  insertUser.run('admin', adminHash, 'admin');
  insertUser.run('biblio', biblioHash, 'bibliothecaire');
  insertUser.run('lecteur', lecteurHash, 'lecteur');
}

const bookCount = db.prepare('SELECT count(*) as count FROM books').get().count;

if (bookCount === 0) {
  const insertBook = db.prepare('INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?)');
  
  insertBook.run('Clean Code', 'Robert C. Martin', '9780132350884', 'Génie Logiciel', 3, 3);
  insertBook.run('Design Patterns', 'Erich Gamma', '9780201633610', 'Design Logiciel', 2, 2);
  insertBook.run('Refactoring', 'Martin Fowler', '9780134757599', 'Refactoring', 1, 1);
  insertBook.run('Introduction to Algorithms', 'Thomas H. Cormen', '9780262033848', 'Algorithmes', 4, 4);
}

module.exports = db;
