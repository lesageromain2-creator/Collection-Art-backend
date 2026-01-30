// backend/routes/rubriques.js
// Routes pour la gestion des rubriques

const express = require('express');
const router = express.Router();
const rubriquesController = require('../controllers/rubriquesController');
const { requireAuth, requireRole } = require('../middleware/auths');

/**
 * Routes publiques
 */

// GET /rubriques - Liste des rubriques
router.get('/', rubriquesController.getRubriques);

// GET /rubriques/:slug - Détail d'une rubrique
router.get('/:slug', rubriquesController.getRubriqueBySlug);

/**
 * Routes protégées - Admins seulement
 */

// POST /rubriques - Créer une rubrique
router.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  rubriquesController.createRubrique
);

// PUT /rubriques/:id - Modifier une rubrique
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  rubriquesController.updateRubrique
);

// DELETE /rubriques/:id - Supprimer une rubrique
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  rubriquesController.deleteRubrique
);

module.exports = router;
