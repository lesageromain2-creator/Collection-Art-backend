// backend/routes/newsletter.js
// Routes pour la gestion de la newsletter

const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const { requireAuth, requireRole } = require('../middleware/auths');

/**
 * Routes publiques
 */

// POST /newsletter/subscribe - S'abonner
router.post('/subscribe', newsletterController.subscribe);

// POST /newsletter/unsubscribe - Se désabonner
router.post('/unsubscribe', newsletterController.unsubscribe);

/**
 * Routes protégées - Admins seulement
 */

// GET /newsletter/subscribers - Liste des abonnés
router.get(
  '/subscribers',
  requireAuth,
  requireRole(['admin']),
  newsletterController.getSubscribers
);

// GET /newsletter/stats - Statistiques
router.get(
  '/stats',
  requireAuth,
  requireRole(['admin']),
  newsletterController.getStats
);

module.exports = router;
