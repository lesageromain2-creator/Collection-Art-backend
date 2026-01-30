// backend/routes/upload.js
// Routes pour l'upload d'images moderne et interactif

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { requireAuth, requireRole } = require('../middleware/auths');
const { uploadMiddleware, validateImage } = require('../middleware/fileUpload');

/**
 * Routes protégées - Upload d'images
 */

// POST /upload/article-image - Upload image d'article (auteurs+)
router.post(
  '/article-image',
  requireAuth,
  requireRole(['author', 'editor', 'admin']),
  uploadMiddleware.array('images', 1),
  validateImage,
  uploadController.uploadArticleImage
);

// POST /upload/avatar - Upload avatar utilisateur
router.post(
  '/avatar',
  requireAuth,
  uploadMiddleware.array('images', 1),
  validateImage,
  uploadController.uploadAvatar
);

// POST /upload/team-photo - Upload photo de membre d'équipe
router.post(
  '/team-photo',
  requireAuth,
  uploadMiddleware.array('images', 1),
  validateImage,
  uploadController.uploadTeamPhoto
);

// POST /upload/rubrique-image - Upload image de rubrique (admins)
router.post(
  '/rubrique-image',
  requireAuth,
  requireRole(['admin']),
  uploadMiddleware.array('images', 1),
  validateImage,
  uploadController.uploadRubriqueImage
);

// POST /upload/gallery - Upload multiple images (admins)
router.post(
  '/gallery',
  requireAuth,
  requireRole(['editor', 'admin']),
  uploadMiddleware.array('images', 10),
  validateImage,
  uploadController.uploadMultipleImages
);

// GET /upload/images - Récupérer les images (admins)
router.get(
  '/images',
  requireAuth,
  requireRole(['editor', 'admin']),
  uploadController.getImages
);

// DELETE /upload/image - Supprimer une image (admins)
router.delete(
  '/image',
  requireAuth,
  requireRole(['editor', 'admin']),
  uploadController.deleteImage
);

module.exports = router;
