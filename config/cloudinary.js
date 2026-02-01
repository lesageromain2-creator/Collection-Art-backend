const cloudinary = require('cloudinary').v2;

// Vérifier que Cloudinary est configuré (évite "Must supply api_key" au moment de l'upload)
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Dossiers organisés par type - ASSOCIATION DE JOURNALISME
const FOLDERS = {
  ARTICLES: 'aurart/articles',           // Images d'articles
  RUBRIQUES: 'aurart/rubriques',         // Images de rubriques
  AVATARS: 'aurart/avatars',             // Avatars utilisateurs
  TEAM: 'aurart/team',                   // Photos membres équipe
  LOGO: 'aurart/logo',                   // Logo et branding
  GALLERY: 'aurart/gallery',             // Galerie générale
  TEMP: 'aurart/temp'                    // Temporaire
};

// Transformations prédéfinies - OPTIMISÉES POUR JOURNALISME
const TRANSFORMATIONS = {
  // Images d'articles
  ARTICLE_HERO: {
    width: 1920,
    height: 1080,
    crop: 'limit',
    quality: 'auto:best',
    fetch_format: 'auto'
  },
  ARTICLE_FEATURED: {
    width: 1200,
    height: 630,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:good',
    fetch_format: 'auto'
  },
  ARTICLE_THUMBNAIL: {
    width: 600,
    height: 400,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:good',
    fetch_format: 'auto'
  },
  // Rubriques
  RUBRIQUE_BANNER: {
    width: 800,
    height: 400,
    crop: 'fill',
    gravity: 'center',
    quality: 'auto:good',
    fetch_format: 'auto'
  },
  // Avatars
  AVATAR_LARGE: {
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    fetch_format: 'auto'
  },
  AVATAR_MEDIUM: {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    fetch_format: 'auto'
  },
  AVATAR_SMALL: {
    width: 64,
    height: 64,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    fetch_format: 'auto'
  },
  // Membres équipe
  TEAM_PHOTO: {
    width: 600,
    height: 600,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    fetch_format: 'auto'
  },
  // Miniatures générales
  THUMBNAIL: {
    width: 300,
    height: 300,
    crop: 'fill',
    quality: 'auto:good',
    fetch_format: 'auto'
  }
};

// Limite de taille par type
const SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024,      // 10MB
  DOCUMENT: 50 * 1024 * 1024,    // 50MB
  VIDEO: 100 * 1024 * 1024       // 100MB
};

// Types MIME autorisés
const ALLOWED_MIME_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ],
  VIDEOS: ['video/mp4', 'video/webm', 'video/ogg']
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  FOLDERS,
  TRANSFORMATIONS,
  SIZE_LIMITS,
  ALLOWED_MIME_TYPES
};