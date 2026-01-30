// backend/controllers/articlesController.js
// Contrôleur pour la gestion des articles

const { getPool } = require('../database/db');

/**
 * Récupérer tous les articles publiés (avec pagination et filtres)
 */
exports.getArticles = async (req, res) => {
  const pool = getPool();
  const {
    page = 1,
    limit = 12,
    rubrique,
    author,
    featured,
    search
  } = req.query;

  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT 
        a.*,
        u.username,
        u.firstname,
        u.lastname,
        u.avatar_url as author_avatar,
        r.name as rubrique_name,
        r.slug as rubrique_slug,
        r.color_theme as rubrique_color,
        (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id AND c.is_approved = true) as comments_count
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN rubriques r ON a.rubrique_id = r.id
      WHERE a.status = 'published'
    `;

    const params = [];
    let paramIndex = 1;

    // Filtrer par rubrique
    if (rubrique) {
      query += ` AND r.slug = $${paramIndex}`;
      params.push(rubrique);
      paramIndex++;
    }

    // Filtrer par auteur
    if (author) {
      query += ` AND u.username = $${paramIndex}`;
      params.push(author);
      paramIndex++;
    }

    // Filtrer par featured
    if (featured === 'true') {
      query += ` AND a.is_featured = true`;
    }

    // Recherche dans titre et contenu
    if (search) {
      query += ` AND (a.title ILIKE $${paramIndex} OR a.content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Compter le total
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM')
      .replace(/LEFT JOIN.*rubrique_color,.*comments_count/, '');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Ajouter tri et pagination
    query += ` ORDER BY a.published_at DESC, a.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      articles: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Erreur getArticles:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des articles'
    });
  }
};

/**
 * Récupérer un article par son slug
 */
exports.getArticleBySlug = async (req, res) => {
  const pool = getPool();
  const { slug } = req.params;

  try {
    const query = `
      SELECT 
        a.*,
        u.id as author_id,
        u.username,
        u.firstname,
        u.lastname,
        u.bio as author_bio,
        u.avatar_url as author_avatar,
        r.name as rubrique_name,
        r.slug as rubrique_slug,
        r.color_theme as rubrique_color,
        (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id AND c.is_approved = true) as comments_count
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN rubriques r ON a.rubrique_id = r.id
      WHERE a.slug = $1 AND a.status = 'published'
    `;

    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article non trouvé'
      });
    }

    // Incrémenter le compteur de vues
    await pool.query(
      'UPDATE articles SET views_count = views_count + 1 WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({
      success: true,
      article: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur getArticleBySlug:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'article'
    });
  }
};

/**
 * Créer un nouvel article (auteurs, éditeurs, admins seulement)
 */
exports.createArticle = async (req, res) => {
  const pool = getPool();
  const {
    title,
    slug,
    excerpt,
    content,
    featured_image_url,
    rubrique_id,
    status = 'draft',
    is_featured = false
  } = req.body;

  const author_id = req.userId; // Depuis le middleware JWT

  try {
    // Vérifier que le slug n'existe pas déjà
    const existingSlug = await pool.query(
      'SELECT id FROM articles WHERE slug = $1',
      [slug]
    );

    if (existingSlug.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ce slug existe déjà'
      });
    }

    const published_at = status === 'published' ? new Date() : null;

    const query = `
      INSERT INTO articles (
        title, slug, excerpt, content, featured_image_url,
        author_id, rubrique_id, status, is_featured, published_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(query, [
      title,
      slug,
      excerpt,
      content,
      featured_image_url,
      author_id,
      rubrique_id,
      status,
      is_featured,
      published_at
    ]);

    // Log l'activité admin
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [author_id, 'create_article', 'article', result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Article créé avec succès',
      article: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur createArticle:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'article'
    });
  }
};

/**
 * Mettre à jour un article
 */
exports.updateArticle = async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const {
    title,
    slug,
    excerpt,
    content,
    featured_image_url,
    rubrique_id,
    status,
    is_featured
  } = req.body;

  const userId = req.userId;
  const userRole = req.userRole;

  try {
    // Vérifier les permissions
    const articleCheck = await pool.query(
      'SELECT author_id FROM articles WHERE id = $1',
      [id]
    );

    if (articleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article non trouvé'
      });
    }

    // Seul l'auteur, les éditeurs et les admins peuvent modifier
    if (
      articleCheck.rows[0].author_id !== userId &&
      !['editor', 'admin'].includes(userRole)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé à modifier cet article'
      });
    }

    // Si passage à "published", définir published_at
    let published_at = null;
    if (status === 'published') {
      const currentStatus = await pool.query(
        'SELECT status FROM articles WHERE id = $1',
        [id]
      );
      if (currentStatus.rows[0].status !== 'published') {
        published_at = new Date();
      }
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }
    if (slug !== undefined) {
      updates.push(`slug = $${paramIndex}`);
      params.push(slug);
      paramIndex++;
    }
    if (excerpt !== undefined) {
      updates.push(`excerpt = $${paramIndex}`);
      params.push(excerpt);
      paramIndex++;
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      params.push(content);
      paramIndex++;
    }
    if (featured_image_url !== undefined) {
      updates.push(`featured_image_url = $${paramIndex}`);
      params.push(featured_image_url);
      paramIndex++;
    }
    if (rubrique_id !== undefined) {
      updates.push(`rubrique_id = $${paramIndex}`);
      params.push(rubrique_id);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (is_featured !== undefined) {
      updates.push(`is_featured = $${paramIndex}`);
      params.push(is_featured);
      paramIndex++;
    }
    if (published_at) {
      updates.push(`published_at = $${paramIndex}`);
      params.push(published_at);
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
      UPDATE articles
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    // Log l'activité
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'update_article', 'article', id]
    );

    res.json({
      success: true,
      message: 'Article mis à jour avec succès',
      article: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur updateArticle:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'article'
    });
  }
};

/**
 * Supprimer un article (admins seulement)
 */
exports.deleteArticle = async (req, res) => {
  const pool = getPool();
  const { id } = req.params;
  const userId = req.userId;

  try {
    const result = await pool.query(
      'DELETE FROM articles WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Article non trouvé'
      });
    }

    // Log l'activité
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'delete_article', 'article', id, JSON.stringify({ title: result.rows[0].title })]
    );

    res.json({
      success: true,
      message: 'Article supprimé avec succès'
    });
  } catch (err) {
    console.error('Erreur deleteArticle:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'article'
    });
  }
};

/**
 * Récupérer les articles de l'utilisateur connecté
 */
exports.getMyArticles = async (req, res) => {
  const pool = getPool();
  const userId = req.userId;
  const { status } = req.query;

  try {
    let query = `
      SELECT 
        a.*,
        r.name as rubrique_name,
        r.slug as rubrique_slug,
        (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id) as comments_count
      FROM articles a
      LEFT JOIN rubriques r ON a.rubrique_id = r.id
      WHERE a.author_id = $1
    `;

    const params = [userId];

    if (status) {
      query += ` AND a.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY a.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      articles: result.rows
    });
  } catch (err) {
    console.error('Erreur getMyArticles:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de vos articles'
    });
  }
};
