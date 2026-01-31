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

// GET /articles/my/articles - Mes articles (avant :slug pour éviter conflit)
router.get('/my/articles', requireAuth, articlesController.getMyArticles);

// GET /articles/by-id/:id - Détail par id (pour édition)
router.get('/by-id/:id', requireAuth, articlesController.getArticleById);

// GET /articles/:slug - Détail d'un article public
router.get('/:slug', articlesController.getArticleBySlug);

/**
 * Routes protégées - Auteurs, éditeurs, admins
 */

// POST /articles - Créer un article (auteurs+)
router.post(
  '/',
  requireAuth,
  requireRole(['member', 'author', 'editor', 'admin']),
  articlesController.createArticle
);

// PUT /articles/:id - Modifier un article
router.put(
  '/:id',
  requireAuth,
  requireRole(['member', 'author', 'editor', 'admin']),
  articlesController.updateArticle
);

// DELETE /articles/:id - Supprimer un article (auteur de l'article ou admin)
router.delete(
  '/:id',
  requireAuth,
  requireRole(['member', 'author', 'editor', 'admin']),
  articlesController.deleteArticle
);

module.exports = router;
