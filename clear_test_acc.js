const mysql = require('mysql2/promise');
require('dotenv').config();

async function clearTestAccount() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'andreitest'
    });

    await conn.query("DELETE FROM panel_accounts WHERE username = 'Andrei15334' OR user_id = 1");
    await conn.query("DELETE FROM panel_codes WHERE user_id = 1");

    console.log("✅ Contul Andrei15334 și codurile asociate au fost șterse complet din baza de date MySQL!");
    await conn.end();
  } catch (err) {
    console.error("Eroare la ștergere:", err.message);
  }
}

clearTestAccount();
