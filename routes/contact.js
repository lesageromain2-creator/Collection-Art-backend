// backend/routes/contact.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auths');

// ============================================
// GET /contact/messages - Liste des messages (admin)
// ============================================
router.get('/messages', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT id, name, email, phone, subject, message, is_read, status, created_at
      FROM contact_messages
      ORDER BY created_at DESC
    `);
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Erreur list contact:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// GET /contact/stats/overview - Stats pour admin
// ============================================
router.get('/stats/overview', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const pool = getPool();
    const total = await pool.query('SELECT COUNT(*) FROM contact_messages');
    const unread = await pool.query('SELECT COUNT(*) FROM contact_messages WHERE is_read = false');
    res.json({
      total: parseInt(total.rows[0].count, 10),
      unread: parseInt(unread.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Erreur stats contact:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// POST /contact - Formulaire contact public
// ============================================
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { name, email, phone, subject, message } = req.body;

    console.log('📨 Réception message contact:', { name, email, subject });

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Champs requis manquants (name, email, message)' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    // Insérer dans contact_messages (schéma association)
    const result = await pool.query(`
      INSERT INTO contact_messages (
        name, email, phone, subject, message,
        ip_address, user_agent, is_read, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'new')
      RETURNING *
    `, [
      name.trim(),
      email.trim().toLowerCase(),
      phone?.trim() || null,
      subject?.trim() || null,
      message.trim(),
      req.ip || null,
      req.headers['user-agent'] || null
    ]);

    console.log('✅ Message contact enregistré:', result.rows[0].id);

    res.json({
      success: true,
      message: 'Message envoyé avec succès',
      id: result.rows[0].id
    });

  } catch (error) {
    console.error('❌ Erreur envoi message contact:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;