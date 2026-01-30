// backend/controllers/newsletterController.js
// Contrôleur pour la gestion de la newsletter

const { getPool } = require('../database/db');

/**
 * S'abonner à la newsletter
 */
exports.subscribe = async (req, res) => {
  const pool = getPool();
  const { email, firstname, lastname } = req.body;
  const ip_address = req.ip;
  const user_agent = req.get('user-agent');

  try {
    // Vérifier si l'email existe déjà
    const existing = await pool.query(
      'SELECT id, status FROM newsletter_subscribers WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      const subscriber = existing.rows[0];
      
      // Si déjà abonné
      if (subscriber.status === 'active') {
        return res.status(400).json({
          success: false,
          error: 'Vous êtes déjà abonné à la newsletter'
        });
      }
      
      // Si désabonné, réabonner
      if (subscriber.status === 'unsubscribed') {
        await pool.query(
          `UPDATE newsletter_subscribers 
           SET status = 'active', subscribed_at = CURRENT_TIMESTAMP, unsubscribed_at = NULL
           WHERE id = $1`,
          [subscriber.id]
        );
        
        return res.json({
          success: true,
          message: 'Vous avez été réabonné à la newsletter avec succès'
        });
      }
    }

    // Nouvel abonné
    const query = `
      INSERT INTO newsletter_subscribers (
        email, firstname, lastname, status, 
        subscription_source, ip_address, user_agent
      )
      VALUES ($1, $2, $3, 'active', 'website', $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [
      email,
      firstname || null,
      lastname || null,
      ip_address,
      user_agent
    ]);

    // Log l'email de bienvenue (optionnel)
    await pool.query(
      `INSERT INTO email_logs (recipient_email, recipient_name, email_type, subject, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        email,
        `${firstname || ''} ${lastname || ''}`.trim() || null,
        'newsletter',
        'Bienvenue à la newsletter Collection Aur\'art',
        'pending'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Merci de vous être abonné à notre newsletter!',
      subscriber: result.rows[0]
    });
  } catch (err) {
    console.error('Erreur subscribe:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'inscription à la newsletter'
    });
  }
};

/**
 * Se désabonner de la newsletter
 */
exports.unsubscribe = async (req, res) => {
  const pool = getPool();
  const { email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE newsletter_subscribers 
       SET status = 'unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP
       WHERE email = $1 AND status = 'active'
       RETURNING *`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email non trouvé dans la liste des abonnés'
      });
    }

    res.json({
      success: true,
      message: 'Vous avez été désabonné de la newsletter avec succès'
    });
  } catch (err) {
    console.error('Erreur unsubscribe:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du désabonnement'
    });
  }
};

/**
 * Récupérer tous les abonnés (admins seulement)
 */
exports.getSubscribers = async (req, res) => {
  const pool = getPool();
  const { status } = req.query;

  try {
    let query = 'SELECT * FROM newsletter_subscribers';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY subscribed_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      subscribers: result.rows
    });
  } catch (err) {
    console.error('Erreur getSubscribers:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des abonnés'
    });
  }
};

/**
 * Obtenir les statistiques de la newsletter (admins seulement)
 */
exports.getStats = async (req, res) => {
  const pool = getPool();

  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_subscribers,
        COUNT(*) FILTER (WHERE status = 'unsubscribed') as unsubscribed,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE subscribed_at > CURRENT_DATE - INTERVAL '30 days') as last_30_days,
        COUNT(*) FILTER (WHERE subscribed_at > CURRENT_DATE - INTERVAL '7 days') as last_7_days
      FROM newsletter_subscribers
    `);

    res.json({
      success: true,
      stats: stats.rows[0]
    });
  } catch (err) {
    console.error('Erreur getStats:', err);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};
