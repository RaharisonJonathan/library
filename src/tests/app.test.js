// Forcer l'environnement de test pour utiliser une base de données SQLite en mémoire (:memory:)
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Port aléatoire pour éviter les collisions

const request = require('supertest');
const server = require('../../server');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Fermer le serveur après les tests
afterAll((done) => {
  db.close();
  server.close(done);
});

describe('=== TEST DE BIBLIOTECH (QUALITÉ ET FIABILITÉ) ===', () => {
  let lecteurCookie = '';
  let biblioCookie = '';
  let adminCookie = '';

  beforeAll(() => {
    // S'assurer que les tables sont initialisées et vides
    db.exec(`
      DELETE FROM loans;
      DELETE FROM books;
      DELETE FROM users;
    `);

    // Insérer des utilisateurs de test
    const insertUser = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('testpassword', salt);
    
    insertUser.run('testlecteur', hash, 'lecteur');
    insertUser.run('testbiblio', hash, 'bibliothecaire');
    insertUser.run('testadmin', hash, 'admin');

    // Insérer des livres de test
    const insertBook = db.prepare('INSERT INTO books (title, author, isbn, category, total_copies, available_copies) VALUES (?, ?, ?, ?, ?, ?)');
    insertBook.run('Clean Code', 'Robert C. Martin', '9780132350884', 'Génie Logiciel', 3, 3);
    insertBook.run('Design Patterns', 'Erich Gamma', '9780201633610', 'Design Logiciel', 2, 2);
    insertBook.run('Refactoring', 'Martin Fowler', '9780134757599', 'Refactoring', 1, 0); // Livre avec stock à 0
    insertBook.run('Algorithms', 'Thomas H. Cormen', '9780262033848', 'Algorithmes', 5, 5);
  });

  describe('1. Authentification & Sécurité (ISO/IEC 25010)', () => {
    it('TC-AUTH-01: Devrait rejeter l\'accès à une route protégée sans token', async () => {
      const res = await request(server).get('/dashboard');
      expect(res.status).toBe(302); // Redirection vers /login
      expect(res.headers.location).toBe('/login');
    });

    it('TC-AUTH-02: Devrait rejeter la connexion avec des identifiants invalides', async () => {
      const res = await request(server)
        .post('/login')
        .send({ username: 'testlecteur', password: 'wrongpassword' });
      
      expect(res.status).toBe(401);
      expect(res.text).toContain('Identifiants invalides.');
    });

    it('TC-AUTH-03: Devrait authentifier un lecteur et renvoyer un Cookie JWT', async () => {
      const res = await request(server)
        .post('/login')
        .send({ username: 'testlecteur', password: 'testpassword' });
      
      expect(res.status).toBe(302);
      expect(res.headers['set-cookie']).toBeDefined();
      lecteurCookie = res.headers['set-cookie'][0].split(';')[0];
      expect(lecteurCookie).toContain('token=');
    });

    it('TC-AUTH-04: Devrait authentifier un bibliothécaire', async () => {
      const res = await request(server)
        .post('/login')
        .send({ username: 'testbiblio', password: 'testpassword' });
      
      expect(res.status).toBe(302);
      biblioCookie = res.headers['set-cookie'][0].split(';')[0];
    });

    it('TC-AUTH-05: Devrait authentifier un administrateur', async () => {
      const res = await request(server)
        .post('/login')
        .send({ username: 'testadmin', password: 'testpassword' });
      
      expect(res.status).toBe(302);
      adminCookie = res.headers['set-cookie'][0].split(';')[0];
    });
  });

  describe('2. Gestion du Catalogue (CRUD Livres)', () => {
    it('TC-CAT-01: Devrait lister les livres pour un utilisateur authentifié', async () => {
      const res = await request(server)
        .get('/api/books')
        .set('Cookie', lecteurCookie)
        .set('Accept', 'application/json');
      
      expect(res.status).toBe(200);
      expect(res.body.books).toBeDefined();
      expect(res.body.books.length).toBe(4);
      expect(res.body.categories).toContain('Génie Logiciel');
    });

    it('TC-CAT-02: Devrait rejeter l\'ajout de livre par un simple lecteur (RBAC)', async () => {
      const res = await request(server)
        .post('/api/books')
        .set('Cookie', lecteurCookie)
        .set('Accept', 'application/json')
        .send({
          title: 'Pirate Book',
          author: 'Hacker',
          isbn: '1111111111111',
          category: 'Hacking',
          total_copies: 5
        });
      
      expect(res.status).toBe(403);
    });

    it('TC-CAT-03: Devrait autoriser l\'ajout de livre par un bibliothécaire', async () => {
      const res = await request(server)
        .post('/api/books')
        .set('Cookie', biblioCookie)
        .set('Accept', 'application/json')
        .send({
          title: 'Test-Driven Development',
          author: 'Kent Beck',
          isbn: '9780321146533',
          category: 'Méthodologie',
          total_copies: 2
        });
      
      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Livre ajouté');
    });

    it('TC-CAT-04: Devrait rejeter l\'ajout d\'un livre avec un ISBN doublon', async () => {
      const res = await request(server)
        .post('/api/books')
        .set('Cookie', biblioCookie)
        .set('Accept', 'application/json')
        .send({
          title: 'Another TDD Book',
          author: 'Kent Beck',
          isbn: '9780321146533', // Même ISBN qu'au TC-CAT-03
          category: 'Méthodologie',
          total_copies: 1
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('ISBN existe déjà');
    });
  });

  describe('3. Gestion des Emprunts & Limites Métier', () => {
    let cleanCodeId;
    let refactoringId;

    beforeAll(() => {
      cleanCodeId = db.prepare("SELECT id FROM books WHERE title = 'Clean Code'").get().id;
      refactoringId = db.prepare("SELECT id FROM books WHERE title = 'Refactoring'").get().id;
    });

    it('TC-LOAN-01: Un lecteur devrait pouvoir emprunter un livre disponible', async () => {
      const res = await request(server)
        .post('/api/loans')
        .set('Cookie', lecteurCookie)
        .set('Accept', 'application/json')
        .send({ bookId: cleanCodeId });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Livre emprunté');

      // Vérifier la baisse du stock
      const book = db.prepare('SELECT available_copies FROM books WHERE id = ?').get(cleanCodeId);
      expect(book.available_copies).toBe(2); // Initialement 3 -> 2
    });

    it('TC-LOAN-02: Devrait interdire d\'emprunter un livre en rupture de stock', async () => {
      const res = await request(server)
        .post('/api/loans')
        .set('Cookie', lecteurCookie)
        .set('Accept', 'application/json')
        .send({ bookId: refactoringId });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Rupture de stock');
    });

    it('TC-LOAN-03: Devrait interdire d\'emprunter deux fois le même livre en cours', async () => {
      const res = await request(server)
        .post('/api/loans')
        .set('Cookie', lecteurCookie)
        .set('Accept', 'application/json')
        .send({ bookId: cleanCodeId });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('déjà un exemplaire actif');
    });

    it('TC-LOAN-04: Devrait interdire d\'emprunter plus de 3 livres (limite de quota)', async () => {
      // Le lecteur a déjà 1 emprunt actif (Clean Code). On en fait 2 de plus (Design Patterns, Algorithms)
      const dpId = db.prepare("SELECT id FROM books WHERE title = 'Design Patterns'").get().id;
      const algoId = db.prepare("SELECT id FROM books WHERE title = 'Algorithms'").get().id;
      const tddId = db.prepare("SELECT id FROM books WHERE title = 'Test-Driven Development'").get().id;

      // Emprunt 2
      await request(server).post('/api/loans').set('Cookie', lecteurCookie).send({ bookId: dpId });
      // Emprunt 3
      await request(server).post('/api/loans').set('Cookie', lecteurCookie).send({ bookId: algoId });
      
      // Emprunt 4 (devrait échouer)
      const res = await request(server)
        .post('/api/loans')
        .set('Cookie', lecteurCookie)
        .set('Accept', 'application/json')
        .send({ bookId: tddId });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Limite d\'emprunts atteinte');
    });

    it('TC-LOAN-05: Devrait pouvoir retourner un livre emprunté', async () => {
      const loan = db.prepare("SELECT id FROM loans WHERE status = 'actif' AND book_id = ?").get(cleanCodeId);
      
      const res = await request(server)
        .post('/api/loans/return')
        .set('Cookie', lecteurCookie)
        .set('Accept', 'application/json')
        .send({ loanId: loan.id });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Livre retourné');

      // Vérifier la hausse du stock
      const book = db.prepare('SELECT available_copies FROM books WHERE id = ?').get(cleanCodeId);
      expect(book.available_copies).toBe(3); // Retour de 2 -> 3
    });
  });

  describe('4. Sécurité Avancée & SQL Injection (OWASP)', () => {
    it('TC-SEC-01: Devrait neutraliser les injections SQL dans les paramètres de recherche', async () => {
      // Tenter une injection classique : Clean Code' OR '1'='1
      const res = await request(server)
        .get("/api/books?search=Clean Code' OR '1'='1")
        .set('Cookie', lecteurCookie)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      // L'injection doit être traitée comme texte et ne renvoyer aucun livre, ou juste correspondre littéralement (donc 0 livre)
      // Si l'injection fonctionnait, elle retournerait tous les livres (donc 4+ livres)
      expect(res.body.books.length).toBe(0); 
    });
  });
});
