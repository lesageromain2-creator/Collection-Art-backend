// backend/database/db.js
const { Pool } = require('pg');

// Le pool sera passé par le serveur via app.locals
let pool = null;

// Initialiser le pool (appelé depuis server.js)
const initPool = (pgPool) => {
  pool = pgPool;
};

// Fonction pour exécuter une requête qui retourne plusieurs lignes
const query = async (text, params = []) => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    if (error.code === '28P01') {
      console.error('💡 Fix: Vérifiez le mot de passe dans DATABASE_URL (backend/.env). Supabase → Settings → Database → Database password.');
    }
    throw error;
  }
};

// Fonction pour exécuter une requête qui retourne une seule ligne
const queryOne = async (text, params = []) => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  
  try {
    const result = await pool.query(text, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database queryOne error:', error);
    throw error;
  }
};

// Fonction pour obtenir le pool directement (utile pour les transactions)
const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
};

module.exports = {
  initPool,
  query,
  queryOne,
  getPool
};