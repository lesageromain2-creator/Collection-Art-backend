// backend/routes/team.js
// Routes pour la page "À propos" et gestion de l'équipe

const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { requireAuth, requireRole } = require('../middleware/auths');

/**
 * Routes publiques
 */

// GET /team - Liste des membres de l'équipe
router.get('/', teamController.getTeamMembers);

// GET /team/:username - Profil public d'un membre
router.get('/:username', teamController.getTeamMemberByUsername);

/**
 * Routes protégées - Utilisateur connecté
 */

// PUT /team/me - Mettre à jour son propre profil
router.put('/me', requireAuth, teamController.updateMyProfile);

/**
 * Routes protégées - Admins seulement
 */

// PUT /team/manage/:userId - Gérer un membre de l'équipe
router.put(
  '/manage/:userId',
  requireAuth,
  requireRole(['admin']),
  teamController.updateTeamMember
);

module.exports = router;
