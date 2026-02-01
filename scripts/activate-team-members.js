#!/usr/bin/env node
/**
 * Active tous les utilisateurs actifs comme membres de l'équipe (page À propos).
 * À lancer depuis le dossier backend : node scripts/activate-team-members.js
 * Ou : npm run activate-team-members (si le script est ajouté au package.json)
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const update = await pool.query(
      `UPDATE users SET is_team_member = true WHERE is_active = true RETURNING id, email, firstname, lastname`
    );
    const count = update.rowCount || 0;
    console.log(`✅ ${count} utilisateur(s) activé(s) comme membre(s) de l'équipe.`);
    if (count > 0) {
      const check = await pool.query(
        `SELECT id, email, firstname, lastname, team_position, team_order FROM users WHERE is_team_member = true AND is_active = true ORDER BY team_order ASC NULLS LAST, firstname ASC`
      );
      console.log('Membres qui apparaîtront sur /about :');
      check.rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.firstname || ''} ${r.lastname || ''} (${r.email})`));
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    if (err.code === '28P01') console.error('💡 Vérifiez DATABASE_URL dans backend/.env');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
