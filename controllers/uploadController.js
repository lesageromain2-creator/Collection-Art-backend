// backend/controllers/uploadController.js
// Contrôleur pour l'upload d'images moderne et interactif

const cloudinaryService = require('../services/cloudinaryService');
const { FOLDERS } = require('../config/cloudinary');
const { getPool } = require('../database/db');

/**
 * Upload image d'article
 */
exports.uploadArticleImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune image fournie'
      });
    }

    const file = req.files[0];

    // Upload vers Cloudinary
    const result = await cloudinaryService.uploadFile(file.buffer, {
      folder: FOLDERS.ARTICLES,
      resourceType: 'image',
      tags: ['article', 'featured-image']
    });

    // Générer les URLs avec différentes transformations
    const urls = {
      original: result.secure_url,
      hero: cloudinaryService.getTransformedUrl(result.public_id, 'ARTICLE_HERO'),
      featured: cloudinaryService.getTransformedUrl(result.public_id, 'ARTICLE_FEATURED'),
      thumbnail: cloudinaryService.getTransformedUrl(result.public_id, 'ARTICLE_THUMBNAIL')
    };

    res.json({
      success: true,
      message: 'Image uploadée avec succès',
      image: {
        public_id: result.public_id,
        urls,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      }
    });
  } catch (err) {
    console.error('Erreur uploadArticleImage:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload de l\'image'
    });
  }
};

/**
 * Upload avatar utilisateur
 */
exports.uploadAvatar = async (req, res) => {
  const pool = getPool();
  const userId = req.userId;

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune image fournie'
      });
    }

    const file = req.files[0];

    // Récupérer l'ancien avatar pour le supprimer
    const userResult = await pool.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const oldAvatarUrl = userResult.rows[0]?.avatar_url;

    // Upload nouveau avatar
    const result = await cloudinaryService.uploadFile(file.buffer, {
      folder: FOLDERS.AVATARS,
      resourceType: 'image',
      tags: ['avatar', `user-${userId}`]
    });

    // Générer les URLs transformées
    const urls = {
      original: result.secure_url,
      large: cloudinaryService.getTransformedUrl(result.public_id, 'AVATAR_LARGE'),
      medium: cloudinaryService.getTransformedUrl(result.public_id, 'AVATAR_MEDIUM'),
      small: cloudinaryService.getTransformedUrl(result.public_id, 'AVATAR_SMALL')
    };

    // Mettre à jour le profil utilisateur
    await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [urls.medium, userId]
    );

    // Supprimer l'ancien avatar si existant
    if (oldAvatarUrl && oldAvatarUrl.includes('cloudinary')) {
      try {
        const publicId = oldAvatarUrl.split('/').slice(-2).join('/').split('.')[0];
        await cloudinaryService.deleteFile(publicId);
      } catch (deleteErr) {
        console.error('Erreur suppression ancien avatar:', deleteErr);
      }
    }

    res.json({
      success: true,
      message: 'Avatar mis à jour avec succès',
      avatar: {
        public_id: result.public_id,
        urls
      }
    });
  } catch (err) {
    console.error('Erreur uploadAvatar:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload de l\'avatar'
    });
  }
};

/**
 * Upload photo de membre d'équipe
 */
exports.uploadTeamPhoto = async (req, res) => {
  const pool = getPool();
  const userId = req.userId;

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune image fournie'
      });
    }

    const file = req.files[0];

    // Upload vers Cloudinary
    const result = await cloudinaryService.uploadFile(file.buffer, {
      folder: FOLDERS.TEAM,
      resourceType: 'image',
      tags: ['team', 'member']
    });

    // Générer les URLs transformées
    const urls = {
      original: result.secure_url,
      team: cloudinaryService.getTransformedUrl(result.public_id, 'TEAM_PHOTO'),
      thumbnail: cloudinaryService.getTransformedUrl(result.public_id, 'THUMBNAIL')
    };

    // Mettre à jour le profil (avatar_url = photo d'équipe)
    await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [urls.team, userId]
    );

    res.json({
      success: true,
      message: 'Photo d\'équipe uploadée avec succès',
      photo: {
        public_id: result.public_id,
        urls
      }
    });
  } catch (err) {
    console.error('Erreur uploadTeamPhoto:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload de la photo'
    });
  }
};

/**
 * Upload image de rubrique
 */
exports.uploadRubriqueImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune image fournie'
      });
    }

    const file = req.files[0];

    // Upload vers Cloudinary
    const result = await cloudinaryService.uploadFile(file.buffer, {
      folder: FOLDERS.RUBRIQUES,
      resourceType: 'image',
      tags: ['rubrique', 'banner']
    });

    // Générer les URLs transformées
    const urls = {
      original: result.secure_url,
      banner: cloudinaryService.getTransformedUrl(result.public_id, 'RUBRIQUE_BANNER'),
      thumbnail: cloudinaryService.getTransformedUrl(result.public_id, 'THUMBNAIL')
    };

    res.json({
      success: true,
      message: 'Image de rubrique uploadée avec succès',
      image: {
        public_id: result.public_id,
        urls
      }
    });
  } catch (err) {
    console.error('Erreur uploadRubriqueImage:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload de l\'image'
    });
  }
};

/**
 * Upload multiple images (galerie)
 */
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune image fournie'
      });
    }

    // Upload toutes les images
    const uploadResults = await cloudinaryService.uploadMultiple(req.files, {
      folder: FOLDERS.GALLERY,
      resourceType: 'image',
      tags: ['gallery']
    });

    // Générer les URLs pour chaque image
    const images = uploadResults.map(result => ({
      public_id: result.public_id,
      urls: {
        original: result.secure_url,
        medium: cloudinaryService.getTransformedUrl(result.public_id, 'ARTICLE_THUMBNAIL'),
        thumbnail: cloudinaryService.getTransformedUrl(result.public_id, 'THUMBNAIL')
      },
      width: result.width,
      height: result.height,
      format: result.format
    }));

    res.json({
      success: true,
      message: `${images.length} image(s) uploadée(s) avec succès`,
      images
    });
  } catch (err) {
    console.error('Erreur uploadMultipleImages:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload des images'
    });
  }
};

/**
 * Supprimer une image
 */
exports.deleteImage = async (req, res) => {
  const { public_id } = req.body;

  try {
    if (!public_id) {
      return res.status(400).json({
        success: false,
        error: 'Public ID manquant'
      });
    }

    await cloudinaryService.deleteFile(public_id);

    res.json({
      success: true,
      message: 'Image supprimée avec succès'
    });
  } catch (err) {
    console.error('Erreur deleteImage:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'image'
    });
  }
};

/**
 * Récupérer les images d'un dossier (galerie)
 */
exports.getImages = async (req, res) => {
  const { folder = FOLDERS.GALLERY, limit = 50 } = req.query;

  try {
    const results = await cloudinaryService.searchFiles({
      folder,
      maxResults: parseInt(limit)
    });

    const images = results.resources.map(resource => ({
      public_id: resource.public_id,
      url: resource.secure_url,
      thumbnail: cloudinaryService.getTransformedUrl(resource.public_id, 'THUMBNAIL'),
      width: resource.width,
      height: resource.height,
      format: resource.format,
      created_at: resource.created_at
    }));

    res.json({
      success: true,
      count: images.length,
      images
    });
  } catch (err) {
    console.error('Erreur getImages:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des images'
    });
  }
};
