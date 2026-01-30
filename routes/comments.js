// backend/routes/comments.js
// Routes pour la gestion des commentaires

const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auths');

/**
 * Routes publiques / semi-publiques
 */

// GET /comments/article/:articleId - Commentaires d'un article
router.get('/article/:articleId', optionalAuth, commentsController.getComments);

// POST /comments/article/:articleId - Créer un commentaire
router.post('/article/:articleId', optionalAuth, commentsController.createComment);

/**
 * Routes protégées - Utilisateurs authentifiés
 */

// PUT /comments/:id - Modifier un commentaire
router.put('/:id', requireAuth, commentsController.updateComment);

// DELETE /comments/:id - Supprimer un commentaire
router.delete('/:id', requireAuth, commentsController.deleteComment);

/**
 * Routes protégées - Modération (éditeurs et admins)
 */

// GET /comments/pending - Commentaires en attente
router.get(
  '/pending',
  requireAuth,
  requireRole(['editor', 'admin']),
  commentsController.getPendingComments
);

// POST /comments/:id/approve - Approuver un commentaire
router.post(
  '/:id/approve',
  requireAuth,
  requireRole(['editor', 'admin']),
  commentsController.approveComment
);

module.exports = router;
