// backend/controllers/rubriquesController.js
// Contrôleur pour la gestion des rubriques

const { getPool } = require('../database/db');

/**
 * Récupérer toutes les rubriques actives
 */
exports.getRubriques = async (req, res) => {
  const pool = getPool();

  try {
    const query = `
      SELECT 
        r.*,
        COUNT(a.id) as articles_count
      FROM rubriques r
      LEFT JOIN articles a ON r.id = a.rubrique_id AND a.status = 'published'
      WHERE r.is_active = true
      GROUP BY r.id
      ORDER BY r.display_order ASC, r.name ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      rubriques: result.rows
    });
  } catch (err) {
    console.error('Erreur getRubriques:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des rubriques'
    });
  }
};

/**
 * Récupérer une rubrique par son slug
 */
exports.getRubriqueBySlug = async (req, res) => {
  const pool = getPool();
  const { slug } = req.params;

  try {
    const query = `
      SELECT 
        r.*,
        COUNT(a.id) as articles_count
      FROM rubriques r
      LEFT JOIN articles a ON r.id = a.rubrique_id AND a.status = 'published'
      WHERE r.slug = $1 AND r.is_active = true
      GROUP BY r.id
    `;

    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rubrique non trouvée'
      });
    }

    res.json({
      success: true,
      rubrique: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur getRubriqueBySlug:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la rubrique'
    });
  }
};

/**
 * Créer une nouvelle rubrique (admins seulement)
 */
exports.createRubrique = async (req, res) => {
  const pool = getPool();
  const {
    name,
    slug,
    description,
    image_url,
    color_theme,
    display_order = 0
  } = req.body;

  const userId = req.userId;

  try {
    // Vérifier que le slug n'existe pas déjà
    const existingSlug = await pool.query(
      'SELECT id FROM rubriques WHERE slug = $1',
      [slug]
    );

    if (existingSlug.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ce slug existe déjà'
      });
    }

    const query = `
      INSERT INTO rubriques (name, slug, description, image_url, color_theme, display_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      slug,
      description,
      image_url,
      color_theme,
      display_order
    ]);

    // Log l'activité
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'create_rubrique', 'rubrique', result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Rubrique créée avec succès',
      rubrique: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur createRubrique:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la rubrique'
    });
  }
};

/**
 * Mettre à jour une rubrique (admins seulement)
 */
exports.updateRubrique = async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const {
    name,
    slug,
    description,
    image_url,
    color_theme,
    display_order,
    is_active
  } = req.body;

  const userId = req.userId;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    if (slug !== undefined) {
      updates.push(`slug = $${paramIndex}`);
      params.push(slug);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramIndex}`);
      params.push(image_url);
      paramIndex++;
    }
    if (color_theme !== undefined) {
      updates.push(`color_theme = $${paramIndex}`);
      params.push(color_theme);
      paramIndex++;
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramIndex}`);
      params.push(display_order);
      paramIndex++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune modification fournie'
      });
    }

    params.push(id);
    const query = `
      UPDATE rubriques
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rubrique non trouvée'
      });
    }

    // Log l'activité
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'update_rubrique', 'rubrique', id]
    );

    res.json({
      success: true,
      message: 'Rubrique mise à jour avec succès',
      rubrique: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur updateRubrique:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la rubrique'
    });
  }
};

/**
 * Supprimer une rubrique (admins seulement)
 */
exports.deleteRubrique = async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const userId = req.userId;

  try {
    // Vérifier qu'aucun article n'utilise cette rubrique
    const articlesCount = await pool.query(
      'SELECT COUNT(*) FROM articles WHERE rubrique_id = $1',
      [id]
    );

    if (parseInt(articlesCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer une rubrique contenant des articles'
      });
    }

    const result = await pool.query(
      'DELETE FROM rubriques WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rubrique non trouvée'
      });
    }

    // Log l'activité
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'delete_rubrique', 'rubrique', id, JSON.stringify({ name: result.rows[0].name })]
    );

    res.json({
      success: true,
      message: 'Rubrique supprimée avec succès'
    });
  } catch (err) {
    console.error('Erreur deleteRubrique:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la rubrique'
    });
  }
};
