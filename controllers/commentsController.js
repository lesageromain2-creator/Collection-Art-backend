// backend/controllers/commentsController.js
// Contrôleur pour la gestion des commentaires

const { getPool } = require('../database/db');

/**
 * Récupérer les commentaires d'un article
 */
exports.getComments = async (req, res) => {
  const pool = getPool();
  const { articleId } = req.params;
  const userRole = req.userRole || null;

  try {
    // Les non-admins ne voient que les commentaires approuvés
    let query = `
      SELECT 
        c.*,
        u.username,
        u.avatar_url,
        u.firstname,
        u.lastname
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.article_id = $1
    `;

    // Seuls les éditeurs et admins voient les commentaires non approuvés
    if (!['editor', 'admin'].includes(userRole)) {
      query += ` AND c.is_approved = true`;
    }

    query += ` ORDER BY c.created_at ASC`;

    const result = await pool.query(query, [articleId]);

    // Organiser les commentaires en arbre (parents et réponses)
    const commentsMap = {};
    const rootComments = [];

    result.rows.forEach(comment => {
      commentsMap[comment.id] = { ...comment, replies: [] };
    });

    result.rows.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentsMap[comment.parent_comment_id];
        if (parent) {
          parent.replies.push(commentsMap[comment.id]);
        }
      } else {
        rootComments.push(commentsMap[comment.id]);
      }
    });

    res.json({
      success: true,
      comments: rootComments
    });
  } catch (err) {
    console.error('Erreur getComments:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des commentaires'
    });
  }
};

/**
 * Créer un commentaire
 */
exports.createComment = async (req, res) => {
  const pool = getPool();
  const { articleId } = req.params;
  const {
    content,
    parent_comment_id = null,
    author_name = null,
    author_email = null
  } = req.body;

  const userId = req.userId || null;

  try {
    // Vérifier que l'article existe et est publié
    const articleCheck = await pool.query(
      'SELECT id FROM articles WHERE id = $1 AND status = $2',
      [articleId, 'published']
    );

    if (articleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article non trouvé ou non publié'
      });
    }

    // Si utilisateur connecté, utiliser son ID
    // Sinon, vérifier qu'on a au moins un nom
    if (!userId && !author_name) {
      return res.status(400).json({
        success: false,
        error: 'Nom d\'auteur requis'
      });
    }

    // Récupérer les paramètres de modération
    const moderateSettings = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_key = $1',
      ['moderate_comments']
    );

    const needsModeration = moderateSettings.rows[0]?.setting_value === 'true';

    const query = `
      INSERT INTO comments (
        article_id,
        user_id,
        author_name,
        author_email,
        content,
        parent_comment_id,
        is_approved
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      articleId,
      userId,
      author_name,
      author_email,
      content,
      parent_comment_id,
      !needsModeration // Auto-approuvé si modération désactivée
    ]);

    res.status(201).json({
      success: true,
      message: needsModeration
        ? 'Commentaire envoyé et en attente de modération'
        : 'Commentaire publié avec succès',
      comment: result.rows[0],
      needs_moderation: needsModeration
    });
  } catch (err) {
    console.error('Erreur createComment:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du commentaire'
    });
  }
};

/**
 * Mettre à jour un commentaire (son propre commentaire)
 */
exports.updateComment = async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.userId;
  const userRole = req.userRole;

  try {
    // Vérifier que l'utilisateur est l'auteur ou admin/éditeur
    const commentCheck = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Commentaire non trouvé'
      });
    }

    if (
      commentCheck.rows[0].user_id !== userId &&
      !['editor', 'admin'].includes(userRole)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé à modifier ce commentaire'
      });
    }

    const result = await pool.query(
      `UPDATE comments 
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [content, id]
    );

    res.json({
      success: true,
      message: 'Commentaire mis à jour avec succès',
      comment: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur updateComment:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du commentaire'
    });
  }
};

/**
 * Supprimer un commentaire
 */
exports.deleteComment = async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const userId = req.userId;
  const userRole = req.userRole;

  try {
    // Vérifier que l'utilisateur est l'auteur ou admin/éditeur
    const commentCheck = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Commentaire non trouvé'
      });
    }

    if (
      commentCheck.rows[0].user_id !== userId &&
      !['editor', 'admin'].includes(userRole)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé à supprimer ce commentaire'
      });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Commentaire supprimé avec succès'
    });
  } catch (err) {
    console.error('Erreur deleteComment:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du commentaire'
    });
  }
};

/**
 * Approuver un commentaire (éditeurs et admins seulement)
 */
exports.approveComment = async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const userId = req.userId;

  try {
    const result = await pool.query(
      `UPDATE comments 
       SET is_approved = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Commentaire non trouvé'
      });
    }

    // Log l'activité
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'approve_comment', 'comment', id]
    );

    res.json({
      success: true,
      message: 'Commentaire approuvé avec succès',
      comment: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur approveComment:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'approbation du commentaire'
    });
  }
};

/**
 * Récupérer les commentaires en attente de modération
 */
exports.getPendingComments = async (req, res) => {
  const pool = getPool();

  try {
    const query = `
      SELECT 
        c.*,
        u.username,
        u.avatar_url,
        a.title as article_title,
        a.slug as article_slug
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN articles a ON c.article_id = a.id
      WHERE c.is_approved = false
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      comments: result.rows
    });
  } catch (err) {
    console.error('Erreur getPendingComments:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des commentaires en attente'
    });
  }
};
