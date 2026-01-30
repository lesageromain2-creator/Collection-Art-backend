// backend/controllers/teamController.js
// Contrôleur pour la gestion de l'équipe (membres de l'association)

const { getPool } = require('../database/db');

/**
 * Récupérer tous les membres de l'équipe
 */
exports.getTeamMembers = async (req, res) => {
  const pool = getPool();

  try {
    const query = `
      SELECT 
        id,
        username,
        firstname,
        lastname,
        bio,
        avatar_url,
        team_position,
        team_order,
        social_twitter,
        social_linkedin,
        social_website,
        (SELECT COUNT(*) FROM articles WHERE author_id = users.id AND status = 'published') as articles_count
      FROM users
      WHERE is_team_member = true AND is_active = true
      ORDER BY team_order ASC, firstname ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      members: result.rows
    });
  } catch (err) {
    console.error('Erreur getTeamMembers:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des membres de l\'équipe'
    });
  }
};

/**
 * Récupérer un membre par son username
 */
exports.getTeamMemberByUsername = async (req, res) => {
  const pool = getPool();
  const { username } = req.params;

  try {
    const query = `
      SELECT 
        id,
        username,
        firstname,
        lastname,
        bio,
        avatar_url,
        team_position,
        social_twitter,
        social_linkedin,
        social_website,
        (SELECT COUNT(*) FROM articles WHERE author_id = users.id AND status = 'published') as articles_count
      FROM users
      WHERE username = $1 AND is_team_member = true AND is_active = true
    `;

    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Membre non trouvé'
      });
    }

    // Récupérer les articles récents de ce membre
    const articlesQuery = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.excerpt,
        a.featured_image_url,
        a.published_at,
        r.name as rubrique_name,
        r.slug as rubrique_slug
      FROM articles a
      LEFT JOIN rubriques r ON a.rubrique_id = r.id
      WHERE a.author_id = $1 AND a.status = 'published'
      ORDER BY a.published_at DESC
      LIMIT 5
    `;

    const articlesResult = await pool.query(articlesQuery, [result.rows[0].id]);

    res.json({
      success: true,
      member: result.rows[0],
      recent_articles: articlesResult.rows
    });
  } catch (err) {
    console.error('Erreur getTeamMemberByUsername:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du membre'
    });
  }
};

/**
 * Mettre à jour son profil (utilisateur connecté)
 */
exports.updateMyProfile = async (req, res) => {
  const pool = getPool();
  const userId = req.userId;
  const {
    firstname,
    lastname,
    bio,
    avatar_url,
    team_position,
    social_twitter,
    social_linkedin,
    social_website
  } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (firstname !== undefined) {
      updates.push(`firstname = $${paramIndex}`);
      params.push(firstname);
      paramIndex++;
    }
    if (lastname !== undefined) {
      updates.push(`lastname = $${paramIndex}`);
      params.push(lastname);
      paramIndex++;
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex}`);
      params.push(bio);
      paramIndex++;
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex}`);
      params.push(avatar_url);
      paramIndex++;
    }
    if (team_position !== undefined) {
      updates.push(`team_position = $${paramIndex}`);
      params.push(team_position);
      paramIndex++;
    }
    if (social_twitter !== undefined) {
      updates.push(`social_twitter = $${paramIndex}`);
      params.push(social_twitter);
      paramIndex++;
    }
    if (social_linkedin !== undefined) {
      updates.push(`social_linkedin = $${paramIndex}`);
      params.push(social_linkedin);
      paramIndex++;
    }
    if (social_website !== undefined) {
      updates.push(`social_website = $${paramIndex}`);
      params.push(social_website);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune modification fournie'
      });
    }

    params.push(userId);
    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur updateMyProfile:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du profil'
    });
  }
};

/**
 * Gérer l'équipe (admins seulement) - Ajouter/retirer des membres
 */
exports.updateTeamMember = async (req, res) => {
  const pool = getPool();
  const { userId } = req.params;
  const {
    is_team_member,
    team_position,
    team_order
  } = req.body;

  const adminId = req.userId;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (is_team_member !== undefined) {
      updates.push(`is_team_member = $${paramIndex}`);
      params.push(is_team_member);
      paramIndex++;
    }
    if (team_position !== undefined) {
      updates.push(`team_position = $${paramIndex}`);
      params.push(team_position);
      paramIndex++;
    }
    if (team_order !== undefined) {
      updates.push(`team_order = $${paramIndex}`);
      params.push(team_order);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune modification fournie'
      });
    }

    params.push(userId);
    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Log l'activité
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [adminId, 'update_team_member', 'user', userId]
    );

    res.json({
      success: true,
      message: 'Membre de l\'équipe mis à jour avec succès',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur updateTeamMember:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du membre'
    });
  }
};
