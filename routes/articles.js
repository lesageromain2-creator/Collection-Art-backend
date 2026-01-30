// backend/routes/articles.js
// Routes pour la gestion des articles

const express = require('express');
const router = express.Router();
const articlesController = require('../controllers/articlesController');
const { requireAuth, requireRole } = require('../middleware/auths');

/**
 * Routes publiques
 */

// GET /articles - Liste des articles publiés
router.get('/', articlesController.getArticles);

// GET /articles/:slug - Détail d'un article
router.get('/:slug', articlesController.getArticleBySlug);

/**
 * Routes protégées - Auteurs, éditeurs, admins
 */

// GET /articles/my/articles - Mes articles
router.get('/my/articles', requireAuth, articlesController.getMyArticles);

// POST /articles - Créer un article (auteurs+)
router.post(
  '/',
  requireAuth,
  requireRole(['author', 'editor', 'admin']),
  articlesController.createArticle
);

// PUT /articles/:id - Modifier un article
router.put(
  '/:id',
  requireAuth,
  requireRole(['author', 'editor', 'admin']),
  articlesController.updateArticle
);

// DELETE /articles/:id - Supprimer un article (admins seulement)
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  articlesController.deleteArticle
);

module.exports = router;
