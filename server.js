const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http');
require('dotenv').config();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public/uploads'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

const rulesData = require('./rulesData.js');

// GLOBALS FOR NODEMAILER
let emailTransporter = null;
async function initEmail() {
  try {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'Simple4Good2026@gmail.com',
        pass: process.env.GMAIL_PASS || 'xltjvxekykkiqvra'
      }
    });
    console.log(`Real Gmail SMTP ready for Simple4Good2026@gmail.com`);
  } catch(e) {
    console.error("Failed to init Gmail SMTP", e);
  }
}
initEmail();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'S4G_SECRET_2026';

let dbPool = null;
let useMock = false;

async function initDB() {
  try {
    dbPool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'andreitest',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const conn = await dbPool.getConnection();
    console.log('Connected to MySQL Database successfully!');
    conn.release();

    // Create Tables first
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        user_id INT UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        site_rank VARCHAR(50) DEFAULT 'Member',
        referral_code VARCHAR(20) UNIQUE,
        reffered_by INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);



    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        target_name VARCHAR(100) NOT NULL,
        complaint_type VARCHAR(50) DEFAULT 'player',
        reason VARCHAR(255) NOT NULL,
        proof_url TEXT NOT NULL,
        description LONGTEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'In asteptare',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Fix panel_accounts, panel_complaints columns
    const columnsToEnsure = [
      "ALTER TABLE `panel_accounts` ADD COLUMN `username` VARCHAR(100) NOT NULL DEFAULT ''",
      "ALTER TABLE `panel_accounts` ADD COLUMN `site_rank` VARCHAR(50) DEFAULT 'Member'",
      "ALTER TABLE `panel_complaints` ADD COLUMN `complaint_type` VARCHAR(50) DEFAULT 'player'"
    ];

    for (const q of columnsToEnsure) {
      try { await dbPool.query(q); } catch (e) { /* Column already exists */ }
    }

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        author_id INT NOT NULL,
        author_name VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL,
        image_url TEXT,
        likes INT DEFAULT 0,
        loves INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure columns exist for news
    const newsCols = [
      "ALTER TABLE `panel_news` ADD COLUMN `likes` INT DEFAULT 0",
      "ALTER TABLE `panel_news` ADD COLUMN `loves` INT DEFAULT 0"
    ];
    for (const q of newsCols) {
      try { await dbPool.query(q); } catch (e) {}
    }

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_forum_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'fa-solid fa-folder',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_forum_topics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        author_id INT NOT NULL,
        author_name VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_forum_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topic_id INT NOT NULL,
        author_id INT NOT NULL,
        author_name VARCHAR(100) NOT NULL,
        content LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_gallery (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uploader_id INT NOT NULL,
        uploader_name VARCHAR(100) NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_staff_team (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_name VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        avatar_url TEXT,
        description TEXT,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_factions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faction_name VARCHAR(100) NOT NULL UNIQUE,
        faction_type VARCHAR(50) NOT NULL DEFAULT 'legale',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message LONGTEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Deschis',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_ticket_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        user_id INT NOT NULL,
        username VARCHAR(100) NOT NULL,
        message LONGTEXT NOT NULL,
        is_admin INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_complaint_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        complaint_id INT NOT NULL,
        user_id INT NOT NULL,
        username VARCHAR(100) NOT NULL,
        message LONGTEXT NOT NULL,
        is_admin INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_app_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        app_type VARCHAR(100) NOT NULL,
        question_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        content LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS panel_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        target_id INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await seedDefaultRules();

  } catch (err) {
    console.warn('MySQL offline, running live fallback mode:', err.message);
    useMock = true;
    initMockDBWithAdmin();
  }
}

async function seedDefaultRules() {
  if (useMock) return;
  const defaultRules = rulesData;

  for (const r of defaultRules) {
    try {
      await dbPool.query('INSERT IGNORE INTO panel_rules (slug, title, category, content) VALUES (?, ?, ?, ?)', [r.slug, r.title, r.category, r.content]);
    } catch (e) {}
  }
}

let mockData = {};
function initMockDBWithAdmin() {
  const hashedPassword = bcrypt.hashSync('admin', 8);

  mockData.accounts = [];

  mockData.notifications = [
    { id: 1, user_id: 2, title: 'Răspuns Ticket #1', message: 'Admin Supreme Andrei_Supreme ți-a răspuns la ticket!', is_read: 0, created_at: new Date() }
  ];

  mockData.factions = [
    { id: 1, faction_name: 'Departament Poliție (LSPD)', faction_type: 'legale' },
    { id: 2, faction_name: 'Serviciul SMURD / Medic', faction_type: 'legale' },
    { id: 3, faction_name: 'Atelier Mecanici Auto', faction_type: 'legale' },
    { id: 4, faction_name: 'Mafia Ballas', faction_type: 'ilegale' }
  ];

  mockData.tickets = [
    { id: 1, user_id: 2, category: 'Probleme Tehnice / Bug', subject: 'Problema forum', message: 'Nu pot posta un comentariu pe forum.', status: 'Deschis', created_at: new Date() }
  ];

  mockData.ticketReplies = [
    { id: 1, ticket_id: 1, user_id: 1, username: 'Andrei_Supreme', message: 'Salut! Am rezolvat bug-ul, poți încerca acum.', is_admin: 1, created_at: new Date() }
  ];

  mockData.complaints = [];
  mockData.complaintReplies = [];

  mockData.questions = [
    { id: 1, app_type: 'Staff', question_text: 'De ce dorești să te alături echipei de Staff S4G?' },
    { id: 2, app_type: 'Staff', question_text: 'Ce experiență ai în administrarea forumurilor/site-urilor?' }
  ];

  mockData.applications = [];
  mockData.logs = [
    { id: 1, user_id: 1, action_type: 'ADMIN_SET_RANK', description: 'Admin Supreme Andrei_Supreme a accesat panoul de setări', target_id: 1, created_at: new Date() }
  ];

  mockData.rules = rulesData.map((r, i) => ({ id: i + 1, ...r }));

  // New mock data for web features
  mockData.news = [
    { id: 1, author_id: 1, author_name: 'Andrei_Supreme', title: 'Lansare noul Website S4G!', content: 'Bine ați venit pe noul nostru website independent!', image_url: '', likes: 10, loves: 5, created_at: new Date() }
  ];

  mockData.forum_categories = [
    { id: 1, title: 'Discuții Generale', description: 'Orice discuție care nu se încadrează în alte categorii.', icon: 'fa-solid fa-comments' },
    { id: 2, title: 'Anunțuri Administrative', description: 'Cele mai noi anunțuri din partea staff-ului.', icon: 'fa-solid fa-bullhorn' }
  ];

  mockData.forum_topics = [
    { id: 1, category_id: 1, author_id: 2, author_name: 'Ionut_Member', title: 'Salutare tuturor!', content: 'Acesta este primul meu mesaj pe noul forum.', views: 15, created_at: new Date() }
  ];

  mockData.forum_posts = [
    { id: 1, topic_id: 1, author_id: 1, author_name: 'Andrei_Supreme', content: 'Salut Ionuț! Bine ai venit.', created_at: new Date() }
  ];

  mockData.gallery = [
    { id: 1, uploader_id: 1, uploader_name: 'Andrei_Supreme', image_url: 'logo.png', description: 'Logo S4G Oficial', created_at: new Date() }
  ];

  mockData.staff_team = [
    { id: 1, member_name: 'Andrei_Supreme', role: 'Fondator', avatar_url: '', description: 'Fondatorul comunității S4G.', display_order: 1 }
  ];

  mockData.appStatus = {
    'Staff': true,
    'Departament Poliție (LSPD)': true,
    'Serviciul SMURD / Medic': true,
    'Atelier Mecanici Auto': true,
    'Mafia Ballas': true,
    'Gang / Mafie': true
  };

  mockData.roles = [
    { id: 1, name: 'Manager Panel', permissions: ['manage_staff_apps', 'manage_police_apps', 'manage_smurd_apps', 'manage_mecanic_apps', 'manage_gang_apps', 'manage_rules', 'manage_roles', 'full_access'] },
    { id: 2, name: 'Admin Supreme', permissions: ['manage_staff_apps', 'manage_police_apps', 'manage_smurd_apps', 'manage_mecanic_apps', 'manage_gang_apps', 'manage_rules'] }
  ];

  mockData.accounts.push({
    id: 999,
    user_id: 999,
    username: 'andrei15334',
    email: 'andrei@s4g.ro',
    password: hashedPassword,
    site_rank: 'Manager Panel',
    is_verified: true,
    verify_token: null,
    reset_token: null,
    reset_expires: null,
    is_banned: false,
    is_muted: false
  });

  mockData.sanctions = [
    // Example: { id: 1, user_id: 2, admin_name: 'andrei15334', type: 'warn', reason: 'Limbaj', created_at: new Date() }
  ];
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Neautorizat! Conectează-te mai întâi.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Sesiune expirată.' });
    req.user = user;
    next();
  });
}

// REGISTER WITH DETAILED ERROR HANDLING
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Completați toate câmpurile din formular!' });
  }

  try {
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    if (!useMock) {
      try {
        await dbPool.query("ALTER TABLE `panel_accounts` ADD COLUMN `username` VARCHAR(100) NOT NULL DEFAULT ''");
      } catch (e) {}

      // Check existing username or email in panel_accounts
      const [existingAcc] = await dbPool.query('SELECT * FROM panel_accounts WHERE email = ? OR username = ?', [email, username]);
      if (existingAcc.length > 0) {
        return res.status(400).json({ error: 'Numele de utilizator sau adresa de email este deja înregistrată!' });
      }

      // Hack: In loc sa modificam coloana user_id care ar putea fi primary key in mintea veche a bazei,
      // generam un user_id virtual (folosim un numar intamplator mare). Mai târziu ar trebui stears complet, dar asa evitam erori SQL de UNIQUE constraint.
      const fake_user_id = Math.floor(Math.random() * 9999999) + 1000;

      const hashedPassword = await bcrypt.hash(password, 10);
      const siteRank = (username.toLowerCase().includes('admin')) ? 'Admin Supreme' : 'Member';

      await dbPool.query(
        'INSERT INTO panel_accounts (username, user_id, email, password, site_rank) VALUES (?, ?, ?, ?, ?)',
        [username, fake_user_id, email, hashedPassword, siteRank]
      );
    } else {
      const existing = mockData.accounts.find(a => a.email.toLowerCase() === email.toLowerCase() || a.username.toLowerCase() === username.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'Numele de utilizator sau adresa de email este deja înregistrată!' });
      }

      const hashedPassword = bcrypt.hashSync(password, 8);
      const newId = mockData.accounts.length > 0 ? Math.max(...mockData.accounts.map(a => a.id)) + 1 : 1;
      const siteRank = (username.toLowerCase().includes('admin')) ? 'Admin Supreme' : 'Member';
      
      mockData.accounts.push({ 
        id: newId, 
        user_id: newId, 
        username, 
        email, 
        password: hashedPassword, 
        site_rank: siteRank,
        is_verified: false,
        verify_token: verifyCode,
        reset_token: null,
        reset_expires: null
      });
    }

    // Trimite email-ul de verificare
    if (emailTransporter) {
      const mailOptions = {
        from: '"S4G Panel" <noreply@s4g.ro>',
        to: email,
        subject: 'Cod Confirmare Cont - S4G Roleplay',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #060606; color: white; padding: 2rem; border-radius: 8px; border: 1px solid #1f1f1f;">
            <h2 style="color: #e62b3a; text-align: center;">BINE AI VENIT PE S4G!</h2>
            <p>Salutare <strong>${username}</strong>,</p>
            <p>Îți mulțumim că te-ai alăturat comunității Simple4Good. Pentru a-ți activa contul, folosește codul de securitate de mai jos:</p>
            <div style="text-align: center; margin: 2rem 0; font-size: 2.5rem; letter-spacing: 5px; color: #e62b3a; font-weight: bold; background: rgba(230, 43, 58, 0.1); padding: 1rem; border-radius: 8px;">
              ${verifyCode}
            </div>
            <p style="color: #888; font-size: 0.9em;">Introdu acest cod în fereastra de pe site pentru a finaliza înregistrarea.</p>
          </div>
        `
      };
      
      const info = await emailTransporter.sendMail(mailOptions);
      console.log('Verification Email sent: %s', nodemailer.getTestMessageUrl(info));
    }

    res.json({ success: true, message: 'Cont creat cu succes! Verifică-ți e-mailul pentru codul de confirmare.', debug_code: verifyCode });

  } catch (err) {
    res.status(400).json({ error: 'Eroare la înregistrare: ' + err.message });
  }
});

// LOGIN BY USERNAME
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Completați Nume utilizator și Parolă!' });

  try {
    let account = null;

    if (!useMock) {
      const [accs] = await dbPool.query('SELECT * FROM panel_accounts WHERE username = ? OR email = ?', [username, username]);
      if (accs.length === 0) return res.status(400).json({ error: 'Cont inexistent!' });
      account = accs[0];

      const valid = await bcrypt.compare(password, account.password);
      if (!valid) return res.status(400).json({ error: 'Parola incorectă!' });
      
      // Basic check for DB implementation, assume verified for now if no column exists
      if (account.is_verified === 0 || account.is_verified === false) {
        return res.status(403).json({ error: 'Contul nu este verificat! Te rugăm să îți verifici adresa de e-mail.' });
      }

    } else {
      account = mockData.accounts.find(a => a.username.toLowerCase() === username.toLowerCase() || a.email.toLowerCase() === username.toLowerCase());
      if (!account) return res.status(400).json({ error: 'Contul nu există!' });

      const valid = bcrypt.compareSync(password, account.password);
      if (!valid) return res.status(400).json({ error: 'Parola incorectă!' });
      
      if (account.is_verified === false) {
        return res.status(403).json({ error: 'Contul nu este verificat! Te rugăm să îți verifici adresa de e-mail.' });
      }
    }

    if (account.is_banned) {
      return res.status(403).json({ error: 'Acest cont este restricționat (BANNED)!' });
    }

    const payload = {
      id: account.id,
      user_id: account.user_id || account.id, // Keep user_id in payload for backwards compatibility with tickets logic
      username: account.username,
      email: account.email,
      site_rank: account.site_rank,
      adminLvl: account.adminLvl || 0,
      faction: account.faction || null,
      is_leader: account.is_leader || false
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: payload });

  } catch (err) {
    res.status(400).json({ error: 'Eroare conectare: ' + err.message });
  }
});

// GET ME
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    let account = {};

    if (!useMock) {
      const [accs] = await dbPool.query('SELECT * FROM panel_accounts WHERE id = ? OR user_id = ?', [req.user.id, req.user.user_id]);
      account = accs[0] || {};
    } else {
      account = mockData.accounts.find(a => a.id === req.user.id || a.user_id === req.user.user_id) || {};
    }

    res.json({
      id: account.id,
      user_id: account.user_id,
      username: account.username,
      email: account.email,
      site_rank: account.site_rank,
      adminLvl: (account.site_rank === 'Admin Supreme' ? 7 : 0)
    });

  } catch (err) {
    res.status(500).json({ error: 'Eroare profil.' });
  }
});

// DASHBOARD STATS
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    let stats = { totalAccounts: 0, activeStaff: 0 };

    if (!useMock) {
      const [totAcc] = await dbPool.query('SELECT COUNT(*) as count FROM panel_accounts');
      const [stf] = await dbPool.query('SELECT COUNT(*) as count FROM panel_accounts WHERE site_rank = "Admin Supreme"');

      stats.totalAccounts = totAcc[0].count;
      stats.activeStaff = stf[0].count;
    } else {
      stats.totalAccounts = mockData.accounts.length;
      stats.activeStaff = mockData.accounts.filter(u => u.site_rank === 'Admin Supreme').length;
    }

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: 'Eroare statistici.' });
  }
});


// NOTIFICATIONS SYSTEM
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    let notifications = [];
    if (!useMock) {
      const [n] = await dbPool.query('SELECT * FROM panel_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15', [req.user.user_id]);
      notifications = n;
    } else {
      notifications = mockData.notifications.filter(n => n.user_id === req.user.user_id);
    }
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Eroare notificari.' });
  }
});

app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    if (!useMock) {
      await dbPool.query('UPDATE panel_notifications SET is_read = 1 WHERE user_id = ?', [req.user.user_id]);
    } else {
      mockData.notifications.forEach(n => { if (n.user_id === req.user.user_id) n.is_read = 1; });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare marcare citit.' });
  }
});

// TICKETS API SYSTEM
app.get('/api/tickets', authenticateToken, async (req, res) => {
  try {
    let tickets = [];
    const isAdmin = req.user.adminLvl > 0 || req.user.site_rank === 'Admin Supreme';

    if (!useMock) {
      if (isAdmin) {
        const [t] = await dbPool.query('SELECT * FROM panel_tickets ORDER BY id DESC');
        tickets = t;
      } else {
        const [t] = await dbPool.query('SELECT * FROM panel_tickets WHERE user_id = ? ORDER BY id DESC', [req.user.user_id]);
        tickets = t;
      }
    } else {
      if (isAdmin) {
        tickets = mockData.tickets;
      } else {
        tickets = mockData.tickets.filter(t => t.user_id === req.user.user_id);
      }
    }
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: 'Eroare preluare tickete.' });
  }
});

app.post('/api/tickets/create', authenticateToken, async (req, res) => {
  const { category, subject, message } = req.body;
  if (!category || !subject || !message) return res.status(400).json({ error: 'Completați subiectul și mesajul!' });

  try {
    if (!useMock) {
      await dbPool.query('INSERT INTO panel_tickets (user_id, category, subject, message) VALUES (?, ?, ?, ?)', [req.user.user_id, category, subject, message]);
    } else {
      mockData.tickets.push({ id: mockData.tickets.length + 1, user_id: req.user.user_id, category, subject, message, status: 'Deschis', created_at: new Date() });
    }
    res.json({ success: true, message: 'Ticketul de suport a fost creat cu succes!' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare creare ticket.' });
  }
});

app.get('/api/tickets/:id/replies', authenticateToken, async (req, res) => {
  const ticketId = req.params.id;
  try {
    let replies = [];
    if (!useMock) {
      const [r] = await dbPool.query('SELECT * FROM panel_ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId]);
      replies = r;
    } else {
      replies = mockData.ticketReplies.filter(r => r.ticket_id === Number(ticketId));
    }
    res.json({ replies });
  } catch (err) {
    res.status(500).json({ error: 'Eroare raspunsuri ticket.' });
  }
});

app.post('/api/tickets/reply', authenticateToken, async (req, res) => {
  const { ticket_id, message } = req.body;
  if (!ticket_id || !message) return res.status(400).json({ error: 'Scrieți un răspuns!' });

  const isAdmin = req.user.adminLvl > 0 || req.user.site_rank === 'Admin Supreme';

  try {
    if (!useMock) {
      await dbPool.query('INSERT INTO panel_ticket_replies (ticket_id, user_id, username, message, is_admin) VALUES (?, ?, ?, ?, ?)',
        [ticket_id, req.user.user_id, req.user.username, message, isAdmin ? 1 : 0]
      );
      if (isAdmin) {
        await dbPool.query('UPDATE panel_tickets SET status = "Raspuns Admin" WHERE id = ?', [ticket_id]);
        
        const [t] = await dbPool.query('SELECT user_id FROM panel_tickets WHERE id = ?', [ticket_id]);
        if (t.length > 0) {
          await dbPool.query('INSERT INTO panel_notifications (user_id, title, message) VALUES (?, ?, ?)',
            [t[0].user_id, `Răspuns nou la Ticket #${ticket_id}`, `Admin ${req.user.username} ți-a răspuns la ticket!`]
          );
        }
      }
    } else {
      mockData.ticketReplies.push({ id: mockData.ticketReplies.length + 1, ticket_id: Number(ticket_id), user_id: req.user.user_id, username: req.user.username, message, is_admin: isAdmin ? 1 : 0, created_at: new Date() });
      if (isAdmin) {
        const t = mockData.tickets.find(tk => tk.id === Number(ticket_id));
        if (t) {
          t.status = "Raspuns Admin";
          mockData.notifications.push({ id: mockData.notifications.length + 1, user_id: t.user_id, title: `Răspuns nou la Ticket #${ticket_id}`, message: `Admin ${req.user.username} ți-a răspuns la ticket!`, is_read: 0, created_at: new Date() });
        }
      }
    }
    res.json({ success: true, message: 'Răspuns trimis cu succes!' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare trimitere răspuns.' });
  }
});

// COMPLAINTS API SYSTEM WITH ERROR MESSAGES FIX
app.get('/api/complaints', authenticateToken, async (req, res) => {
  const typeFilter = req.query.type || '';
  const myOnly = req.query.my === 'true';

  try {
    let complaints = [];
    const isAdmin = req.user.adminLvl > 0 || req.user.site_rank === 'Admin Supreme';

    if (!useMock) {
      try {
        await dbPool.query("ALTER TABLE `panel_complaints` ADD COLUMN `complaint_type` VARCHAR(50) DEFAULT 'player'");
      } catch(e) {}

      let sql = 'SELECT * FROM panel_complaints';
      let params = [];
      let where = [];

      if (!isAdmin || myOnly) {
        where.push('user_id = ?');
        params.push(req.user.user_id);
      }
      if (typeFilter) {
        where.push('complaint_type = ?');
        params.push(typeFilter);
      }

      if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
      sql += ' ORDER BY id DESC';

      const [c] = await dbPool.query(sql, params);
      complaints = c;

    } else {
      complaints = mockData.complaints;
      if (!isAdmin || myOnly) complaints = complaints.filter(c => c.user_id === req.user.user_id);
      if (typeFilter) complaints = complaints.filter(c => c.complaint_type === typeFilter);
    }
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ error: 'Eroare preluare reclamații: ' + err.message });
  }
});

app.post('/api/complaints/create', authenticateToken, async (req, res) => {
  const { target_name, complaint_type, reason, proof_url, description } = req.body;
  if (!target_name || !reason || !proof_url || !description) return res.status(400).json({ error: 'Completați toate câmpurile reclamației!' });

  try {
    if (!useMock) {
      try {
        await dbPool.query("ALTER TABLE `panel_complaints` ADD COLUMN `complaint_type` VARCHAR(50) DEFAULT 'player'");
      } catch(e) {}

      await dbPool.query('INSERT INTO panel_complaints (user_id, target_name, complaint_type, reason, proof_url, description) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.user_id, target_name, complaint_type || 'player', reason, proof_url, description]
      );
    } else {
      mockData.complaints.push({ id: mockData.complaints.length + 1, user_id: req.user.user_id, target_name, complaint_type: complaint_type || 'player', reason, proof_url, description, status: 'In asteptare', created_at: new Date() });
    }
    res.json({ success: true, message: 'Reclamația a fost trimisă cu succes!' });
  } catch (err) {
    res.status(400).json({ error: 'Eroare creare reclamație: ' + err.message });
  }
});

app.get('/api/complaints/:id/replies', authenticateToken, async (req, res) => {
  const complaintId = req.params.id;
  try {
    let replies = [];
    if (!useMock) {
      const [r] = await dbPool.query('SELECT * FROM panel_complaint_replies WHERE complaint_id = ? ORDER BY created_at ASC', [complaintId]);
      replies = r;
    } else {
      replies = mockData.complaintReplies.filter(r => r.complaint_id === Number(complaintId));
    }
    res.json({ replies });
  } catch (err) {
    res.status(500).json({ error: 'Eroare raspunsuri reclamatie.' });
  }
});

app.post('/api/complaints/reply', authenticateToken, async (req, res) => {
  const { complaint_id, message } = req.body;
  if (!complaint_id || !message) return res.status(400).json({ error: 'Scrieți un răspuns!' });

  const isAdmin = req.user.adminLvl > 0 || req.user.site_rank === 'Admin Supreme';

  try {
    if (!useMock) {
      await dbPool.query('INSERT INTO panel_complaint_replies (complaint_id, user_id, username, message, is_admin) VALUES (?, ?, ?, ?, ?)',
        [complaint_id, req.user.user_id, req.user.username, message, isAdmin ? 1 : 0]
      );
      if (isAdmin) {
        await dbPool.query('UPDATE panel_complaints SET status = "Raspuns Admin" WHERE id = ?', [complaint_id]);
        
        const [c] = await dbPool.query('SELECT user_id FROM panel_complaints WHERE id = ?', [complaint_id]);
        if (c.length > 0) {
          await dbPool.query('INSERT INTO panel_notifications (user_id, title, message) VALUES (?, ?, ?)',
            [c[0].user_id, `Răspuns PM Reclamație #${complaint_id}`, `Admin ${req.user.username} ți-a răspuns la reclamație!`]
          );
        }
      }
    } else {
      mockData.complaintReplies.push({ id: mockData.complaintReplies.length + 1, complaint_id: Number(complaint_id), user_id: req.user.user_id, username: req.user.username, message, is_admin: isAdmin ? 1 : 0, created_at: new Date() });
      if (isAdmin) {
        const c = mockData.complaints.find(comp => comp.id === Number(complaint_id));
        if (c) {
          c.status = "Raspuns Admin";
          mockData.notifications.push({ id: mockData.notifications.length + 1, user_id: c.user_id, title: `Răspuns PM Reclamație #${complaint_id}`, message: `Admin ${req.user.username} ți-a răspuns la reclamație!`, is_read: 0, created_at: new Date() });
        }
      }
    }
    res.json({ success: true, message: 'Mesaj PM trimis cu succes!' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare trimitere mesaj.' });
  }
});

// EMAIL VERIFICATION ENDPOINT
app.post('/api/auth/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Date incomplete.' });
  
  if (!useMock) {
    // Basic SQL implementation placeholder
    return res.status(500).json({ error: 'SQL nu este complet implementat.' });
  } else {
    const account = mockData.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (!account) return res.status(400).json({ error: 'Contul nu a putut fi gasit.' });
    if (account.verify_token !== code) return res.status(400).json({ error: 'Cod invalid.' });
    
    account.is_verified = true;
    account.verify_token = null;
    
    res.json({ success: true, message: 'Contul tau a fost verificat cu succes!' });
  }
});

// FORGOT PASSWORD ENDPOINT
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Introdu adresa de e-mail.' });
  
  try {
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);
    let accountName = 'Utilizator';

    if (!useMock) {
      const [rows] = await dbPool.query('SELECT * FROM panel_accounts WHERE email = ?', [email]);
      if (rows.length === 0) return res.status(400).json({ error: 'Nu există niciun cont cu această adresă de email.' });
      accountName = rows[0].username;
      await dbPool.query('UPDATE panel_accounts SET reset_token = ?, reset_expires = ? WHERE email = ?', [resetToken, resetExpires, email]);
    } else {
      const account = mockData.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
      if (!account) return res.status(400).json({ error: 'Nu există niciun cont cu această adresă de email.' });
      account.reset_token = resetToken;
      account.reset_expires = resetExpires;
      accountName = account.username;
    }

    if (emailTransporter) {
      const siteUrl = process.env.SITE_URL || `http://localhost:${PORT}`;
      const resetUrl = `${siteUrl}/?reset_token=${resetToken}`;
      const mailOptions = {
        from: '"S4G Panel" <Simple4Good2026@gmail.com>',
        to: email,
        subject: 'Recuperare Parola - S4G Roleplay',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #060606; color: white; padding: 2rem; border-radius: 8px; border: 1px solid #1f1f1f;">
            <h2 style="color: #e62b3a; text-align: center;">RECUPERARE PAROLA</h2>
            <p>Salutare <strong>${accountName}</strong>,</p>
            <p>Am primit o cerere de resetare a parolei pentru contul tau. Dacă nu tu ai solicitat acest lucru, poți ignora acest e-mail.</p>
            <p>Dacă dorești să îți resetezi parola, apasă pe butonul de mai jos. Link-ul expiră în 15 minute!</p>
            <div style="text-align: center; margin: 2rem 0;">
              <a href="${resetUrl}" style="background: #e62b3a; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 4px;">RESETEAZĂ PAROLA</a>
            </div>
          </div>
        `
      };
      await emailTransporter.sendMail(mailOptions);
    }

    res.json({ success: true, message: 'Un e-mail cu instrucțiuni a fost trimis pe adresa ta.' });
  } catch (err) {
    res.status(400).json({ error: 'Eroare la procesare: ' + err.message });
  }
});


// RESET PASSWORD ENDPOINT
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Date incomplete.' });

  try {
    if (!useMock) {
      const [rows] = await dbPool.query('SELECT * FROM panel_accounts WHERE reset_token = ?', [token]);
      if (rows.length === 0) return res.status(400).json({ error: 'Token invalid sau expirat.' });
      const account = rows[0];
      if (new Date() > new Date(account.reset_expires)) return res.status(400).json({ error: 'Token-ul a expirat. Solicită un nou email.' });
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await dbPool.query('UPDATE panel_accounts SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [hashedPassword, account.id]);
    } else {
      const account = mockData.accounts.find(a => a.reset_token === token);
      if (!account) return res.status(400).json({ error: 'Token invalid.' });
      if (Date.now() > account.reset_expires) return res.status(400).json({ error: 'Token expirat.' });
      account.password = bcrypt.hashSync(newPassword, 10);
      account.reset_token = null;
      account.reset_expires = null;
    }
    res.json({ success: true, message: 'Parola a fost schimbată cu succes! Te poți autentifica.' });
  } catch (err) {
    res.status(400).json({ error: 'Eroare la resetare: ' + err.message });
  }
});

// GET PROFILE DETAILS WITH TRUNK & GLOVEBOX INVENTORY
app.get('/api/profile/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    let player = null;
    let vehicles = [];
    let sanctions = [];

    if (!useMock) {
      const [users] = await dbPool.query('SELECT * FROM vrp_users WHERE id = ?', [userId]);
      if (users.length === 0) return res.status(404).json({ error: 'Jucătorul nu există in baza de date.' });
      player = users[0];

      const [vehs] = await dbPool.query('SELECT * FROM vrp_user_vehicles WHERE user_id = ?', [userId]);
      vehicles = vehs;

      const [logs] = await dbPool.query('SELECT * FROM panel_logs WHERE target_id = ? ORDER BY created_at DESC', [userId]);
      sanctions = logs;

    } else {
      player = mockData.users.find(u => u.id === Number(userId));
      if (!player) return res.status(404).json({ error: 'Jucătorul nu există.' });
      vehicles = mockData.vehicles.filter(v => v.user_id === Number(userId));
      sanctions = mockData.logs.filter(l => l.target_id === Number(userId));
    }

    // Verifica daca jucatorul e online pe FiveM
    const fivemPlayers = await getFiveMLiveData();
    const onlineNames = new Set(fivemPlayers.map(p => (p.name || '').toLowerCase()));
    const isOnline = onlineNames.has((player.username || '').toLowerCase());

    res.json({ player: { ...player, isOnline }, vehicles, sanctions });

  } catch (err) {
    res.status(500).json({ error: 'Eroare preluare profil.' });
  }
});


// DELETE PUNISH LOG (ADMIN ONLY)
app.post('/api/admin/delete-log', authenticateToken, async (req, res) => {
  const { log_id } = req.body;
  if (!log_id) return res.status(400).json({ error: 'ID log nespecificat!' });

  try {
    if (!useMock) {
      await dbPool.query('DELETE FROM panel_logs WHERE id = ?', [log_id]);
    } else {
      mockData.logs = mockData.logs.filter(l => l.id !== Number(log_id));
    }
    res.json({ success: true, message: 'Sancțiunea a fost ștersă din logs cu succes!' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare ștergere log.' });
  }
});

// FACTIONS LIST, ADD & DELETE
app.get('/api/factions', async (req, res) => {
  try {
    let factions = [];
    if (!useMock) {
      const [f] = await dbPool.query('SELECT faction as faction_name, COUNT(*) as count FROM vrp_users WHERE faction IS NOT NULL AND faction != "Civil" GROUP BY faction');
      factions = f;
    } else {
      factions = mockData.factions.map(f => {
        const count = mockData.users.filter(u => u.faction && u.faction.toLowerCase().includes(f.faction_name.toLowerCase())).length;
        return { faction: f.faction_name, count, faction_type: f.faction_type, id: f.id };
      });
    }
    res.json({ factions });
  } catch (err) {
    res.status(500).json({ error: 'Eroare factiuni.' });
  }
});

app.post('/api/factions/add', authenticateToken, async (req, res) => {
  const { faction_name, faction_type } = req.body;
  if (!faction_name) return res.status(400).json({ error: 'Numele facțiunii este obligatoriu!' });

  try {
    if (!useMock) {
      await dbPool.query('INSERT INTO panel_factions (faction_name, faction_type) VALUES (?, ?)', [faction_name, faction_type || 'legale']);
    } else {
      mockData.factions.push({ id: mockData.factions.length + 1, faction_name, faction_type: faction_type || 'legale' });
    }
    res.json({ success: true, message: `Facțiunea ${faction_name} a fost adăugată!` });
  } catch (err) {
    res.status(500).json({ error: 'Eroare adăugare facțiune.' });
  }
});

app.post('/api/factions/delete', authenticateToken, async (req, res) => {
  const { faction_name } = req.body;
  if (!faction_name) return res.status(400).json({ error: 'Facțiunea nespecificată!' });

  try {
    if (!useMock) {
      await dbPool.query('DELETE FROM panel_factions WHERE faction_name = ?', [faction_name]);
    } else {
      mockData.factions = mockData.factions.filter(f => f.faction_name !== faction_name);
    }
    res.json({ success: true, message: `Facțiunea ${faction_name} a fost ștersă din baza de date!` });
  } catch (err) {
    res.status(500).json({ error: 'Eroare ștergere facțiune.' });
  }
});

// FACTION MEMBERS POPUP API
app.get('/api/factions/members', async (req, res) => {
  const factionName = req.query.faction || '';
  try {
    let members = [];
    if (!useMock) {
      const [m] = await dbPool.query('SELECT id, username, firstName, secondName, factionRank, hoursPlayed FROM vrp_users WHERE faction LIKE ? ORDER BY factionRank DESC, hoursPlayed DESC', [`%${factionName}%`]);
      members = m;
    } else {
      const f = factionName.toLowerCase();
      members = mockData.users.filter(u => u.faction && u.faction.toLowerCase().includes(f));
    }

    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: 'Eroare membri factiune.' });
  }
});

// APPLICATION QUESTIONS EDIT & DELETE
app.get('/api/applications/questions', async (req, res) => {
  const appType = req.query.type || 'Staff';
  try {
    let questions = [];
    if (!useMock) {
      const [q] = await dbPool.query('SELECT * FROM panel_app_questions WHERE app_type = ? ORDER BY id ASC', [appType]);
      questions = q;
    } else {
      questions = mockData.questions.filter(q => q.app_type === appType);
    }
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: 'Eroare întrebări.' });
  }
});

app.post('/api/applications/questions', authenticateToken, async (req, res) => {
  const { app_type, question_text } = req.body;
  if (!app_type || !question_text) return res.status(400).json({ error: 'Completați întrebarea!' });

  try {
    if (!useMock) {
      await dbPool.query('INSERT INTO panel_app_questions (app_type, question_text) VALUES (?, ?)', [app_type, question_text]);
    } else {
      mockData.questions.push({ id: mockData.questions.length + 1, app_type, question_text });
    }
    res.json({ success: true, message: 'Întrebare adăugată cu succes!' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare adăugare întrebare.' });
  }
});

app.post('/api/applications/questions/delete', authenticateToken, async (req, res) => {
  const { question_id } = req.body;
  try {
    if (!useMock) {
      await dbPool.query('DELETE FROM panel_app_questions WHERE id = ?', [question_id]);
    } else {
      mockData.questions = mockData.questions.filter(q => q.id !== Number(question_id));
    }
    res.json({ success: true, message: 'Întrebarea a fost ștersă!' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare ștergere întrebare.' });
  }
});

// SUBMIT APPLICATION FULL PAGE
app.post('/api/applications', authenticateToken, async (req, res) => {
  const { app_type, name_rp, age, answers } = req.body;
  if (!app_type || !name_rp || !age || !answers) return res.status(400).json({ error: 'Completați toate răspunsurile!' });

  if (useMock && mockData.appStatus && mockData.appStatus[app_type] === false) {
    return res.status(403).json({ error: 'Aplicațiile sunt momentan închise.' });
  }

  try {
    if (!useMock) {
      await dbPool.query(
        'INSERT INTO panel_applications (user_id, app_type, name_rp, age, answers) VALUES (?, ?, ?, ?, ?)',
        [req.user.user_id, app_type, name_rp, age, JSON.stringify(answers)]
      );
    } else {
      mockData.applications.push({ id: mockData.applications.length + 1, user_id: req.user.user_id, app_type, name_rp, age, answers, status: 'In Asteptare' });
    }
    res.json({ success: true, message: `Aplicația ta pentru ${app_type} a fost trimisă cu succes!` });
  } catch (err) {
    res.status(500).json({ error: 'Eroare salvare aplicație.' });
  }
});

app.get('/api/admin/applications', authenticateToken, async (req, res) => {
  const user = req.user;
  try {
    if (!useMock) {
      const [roleRows] = await dbPool.query('SELECT permissions FROM panel_roles WHERE name = ?', [user.site_rank]);
      let perms = [];
      if (roleRows.length > 0) {
        perms = typeof roleRows[0].permissions === 'string' ? JSON.parse(roleRows[0].permissions) : roleRows[0].permissions;
      }

      let allowedTypes = [];
      if (perms.includes('full_access') || user.site_rank === 'Admin Supreme' || user.site_rank === 'Manager Panel' || user.adminLvl >= 7) {
        allowedTypes = ['ALL'];
      } else {
        if (perms.includes('manage_police_apps')) allowedTypes.push('Departament Poliție (LSPD)');
        if (perms.includes('manage_smurd_apps')) allowedTypes.push('Serviciul SMURD / Medic');
        if (perms.includes('manage_mecanic_apps')) allowedTypes.push('Atelier Mecanici Auto');
        if (perms.includes('manage_gang_apps')) { allowedTypes.push('Mafia Ballas'); allowedTypes.push('Gang / Mafie'); }
        if (perms.includes('manage_staff_apps')) allowedTypes.push('Staff');
      }

      if (allowedTypes.length === 0) return res.json({ applications: [] });

      let query = 'SELECT a.*, u.username FROM panel_applications a JOIN panel_accounts u ON a.user_id = u.id ORDER BY a.id DESC';
      let params = [];

      if (!allowedTypes.includes('ALL')) {
        query = 'SELECT a.*, u.username FROM panel_applications a JOIN panel_accounts u ON a.user_id = u.id WHERE a.app_type IN (?) ORDER BY a.id DESC';
        params = [allowedTypes];
      }

      const [apps] = await dbPool.query(query, params);
      return res.json({ applications: apps });
    } else {
      let visibleApps = [];
      if (user.site_rank === 'Admin Supreme' || user.site_rank === 'Manager Panel' || user.adminLvl >= 7) {
        visibleApps = mockData.applications;
      } else if (user.is_leader && user.faction) {
        const fName = user.faction.toLowerCase();
        visibleApps = mockData.applications.filter(a => a.app_type.toLowerCase().includes(fName));
      }
      
      const enrichedApps = visibleApps.map(a => {
        const u = mockData.accounts.find(acc => acc.id == a.user_id) || {};
        return { ...a, username: u.username };
      });
      
      return res.json({ applications: enrichedApps });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Eroare citire aplicatii.' });
  }
});

app.post('/api/applications/:id/action', authenticateToken, async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { action } = req.body; // 'accept' or 'deny'

  try {
    if (!useMock) {
      const [appRows] = await dbPool.query('SELECT * FROM panel_applications WHERE id = ?', [id]);
      if (appRows.length === 0) return res.status(404).json({ error: 'Aplicația nu a fost găsită.' });
      const app = appRows[0];

      const [roleRows] = await dbPool.query('SELECT permissions FROM panel_roles WHERE name = ?', [user.site_rank]);
      let perms = [];
      if (roleRows.length > 0) {
        perms = typeof roleRows[0].permissions === 'string' ? JSON.parse(roleRows[0].permissions) : roleRows[0].permissions;
      }

      let hasAccess = false;
      if (perms.includes('full_access') || user.site_rank === 'Admin Supreme' || user.site_rank === 'Manager Panel' || user.adminLvl >= 7) {
        hasAccess = true;
      } else {
        if (app.app_type === 'Departament Poliție (LSPD)' && perms.includes('manage_police_apps')) hasAccess = true;
        if (app.app_type === 'Serviciul SMURD / Medic' && perms.includes('manage_smurd_apps')) hasAccess = true;
        if (app.app_type === 'Atelier Mecanici Auto' && perms.includes('manage_mecanic_apps')) hasAccess = true;
        if ((app.app_type === 'Mafia Ballas' || app.app_type === 'Gang / Mafie') && perms.includes('manage_gang_apps')) hasAccess = true;
        if (app.app_type === 'Staff' && perms.includes('manage_staff_apps')) hasAccess = true;
      }

      if (!hasAccess) return res.status(403).json({ error: 'Nu ai acces la această facțiune.' });

      const newStatus = action === 'accept' ? 'Acceptat' : 'Respins';
      await dbPool.query('UPDATE panel_applications SET status = ? WHERE id = ?', [newStatus, id]);
      
      return res.json({ success: true, message: `Aplicația a fost ${newStatus.toLowerCase()}.` });
    } else {
      const app = mockData.applications.find(a => a.id == id);
      if (!app) return res.status(404).json({ error: 'Aplicația nu a fost găsită.' });

      let hasAccess = false;
      if (user.site_rank === 'Admin Supreme' || user.site_rank === 'Manager Panel' || user.adminLvl >= 7) hasAccess = true;
      else {
        const factName = app.app_type.toLowerCase();
        if (user.faction && user.faction.toLowerCase().includes(factName) && user.is_leader) {
          hasAccess = true;
        }
      }

      if (!hasAccess) return res.status(403).json({ error: 'Nu ai acces la această facțiune.' });

      app.status = action === 'accept' ? 'Acceptat' : 'Respins';
      return res.json({ success: true, message: `Aplicația a fost ${app.status.toLowerCase()}.` });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Eroare la procesarea aplicației.' });
  }
});

// ADMIN ACTION
app.post('/api/admin/action', authenticateToken, async (req, res) => {
  const { target_id, action, reason, amount } = req.body;
  const adminId = req.user.user_id;

  try {
    let desc = `Acțiune Admin ${action.toUpperCase()} executată pe ID ${target_id}. Motiv: ${reason || amount || 'Nespecificat'}`;

    if (!useMock) {
      if (action === 'kick') await dbPool.query('UPDATE vrp_users SET kick_flag = 1 WHERE id = ?', [target_id]);
      if (action === 'jail') await dbPool.query('UPDATE vrp_users SET aJailCP = ? WHERE id = ?', [parseInt(amount) || 15, target_id]);
      if (action === 'unjail') await dbPool.query('UPDATE vrp_users SET aJailCP = 0 WHERE id = ?', [target_id]);
      if (action === 'ban') await dbPool.query('UPDATE vrp_users SET banned = 1, bannedReason = ? WHERE id = ?', [reason || 'Banat din Panel', target_id]);

      // UNBAN: reseteaza banned=0 SI warns=0 ca sa nu fie re-banat automat de loop
      if (action === 'unban') await dbPool.query('UPDATE vrp_users SET banned = 0, warns = 0 WHERE id = ?', [target_id]);

      if (action === 'unwarn') await dbPool.query('UPDATE vrp_users SET warns = GREATEST(0, warns - 1) WHERE id = ?', [target_id]);
      if (action === 'givemoney') await dbPool.query('UPDATE vrp_users SET bankMoney = bankMoney + ? WHERE id = ?', [parseInt(amount) || 0, target_id]);
      if (action === 'givedmd') await dbPool.query('UPDATE vrp_users SET Diamante = Diamante + ? WHERE id = ?', [parseInt(amount) || 0, target_id]);

      // WARN: incrementeaza warns; daca ajunge la 3, seteaza automat banned=1
      if (action === 'warn') {
        await dbPool.query('UPDATE vrp_users SET warns = warns + 1 WHERE id = ?', [target_id]);
        const [warnCheck] = await dbPool.query('SELECT warns FROM vrp_users WHERE id = ?', [target_id]);
        if (warnCheck.length > 0 && warnCheck[0].warns >= 3) {
          await dbPool.query('UPDATE vrp_users SET banned = 1 WHERE id = ?', [target_id]);
          desc += ' | AUTO-BAN aplicat: 3/3 Warn-uri acumulate!';
        }
      }

      await dbPool.query('INSERT INTO panel_logs (user_id, action_type, description, target_id) VALUES (?, ?, ?, ?)', [adminId, action.toUpperCase(), desc, target_id]);
      
      await dbPool.query('INSERT INTO panel_notifications (user_id, title, message) VALUES (?, ?, ?)',
        [target_id, `Sancțiune Admin (${action.toUpperCase()})`, desc]
      );

    } else {
      mockData.logs.push({ id: mockData.logs.length + 1, user_id: adminId, action_type: action.toUpperCase(), description: desc, target_id: Number(target_id), created_at: new Date() });
      mockData.notifications.push({ id: mockData.notifications.length + 1, user_id: Number(target_id), title: `Sancțiune Admin (${action.toUpperCase()})`, message: desc, is_read: 0, created_at: new Date() });
    }

    res.json({ success: true, message: desc });
  } catch (err) {
    res.status(500).json({ error: 'Eroare executare acțiune admin: ' + err.message });
  }
});

// RULES FULL PAGE & EDIT
app.get('/api/rules', async (req, res) => {
  try {
    let rules = [];
    if (!useMock) {
      const [r] = await dbPool.query('SELECT * FROM panel_rules ORDER BY id ASC');
      rules = r;
    } else {
      rules = mockData.rules;
    }
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: 'Eroare regulamente.' });
  }
});

app.get('/api/rules/:slug', async (req, res) => {
  try {
    let rules = [];
    if (!useMock) {
      const [r] = await dbPool.query('SELECT * FROM panel_rules WHERE slug = ?', [req.params.slug]);
      rules = r;
    } else {
      rules = mockData.rules.filter(r => r.slug === req.params.slug);
    }
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: 'Eroare regulamente.' });
  }
});

app.post('/api/rules/edit', authenticateToken, async (req, res) => {
  const { slug, title, content } = req.body;
  try {
    if (!useMock) {
      await dbPool.query('UPDATE panel_rules SET title = ?, content = ? WHERE slug = ?', [title, content, slug]);
    } else {
      const r = mockData.rules.find(rule => rule.slug === slug);
      if (r) { r.title = title; r.content = content; }
    }
    res.json({ success: true, message: 'Regulament actualizat cu succes!' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare salvare regulament.' });
  }
});



function getAdminRankTitle(adminLvl, site_rank) {
  const lvl = Number(adminLvl) || 0;
  if (lvl >= 10 || site_rank === 'Admin Supreme') return 'Fondator / Admin Supreme';
  if (lvl === 9) return 'Co-Fondator';
  if (lvl === 8) return 'Head Admin';
  if (lvl === 7) return 'Super Admin';
  if (lvl === 6) return 'Admin Lvl 6';
  if (lvl === 5) return 'Admin Lvl 5';
  if (lvl === 4) return 'Admin Lvl 4';
  if (lvl === 3) return 'Admin Lvl 3';
  if (lvl === 2) return 'Admin Lvl 2';
  if (lvl === 1) return 'Helper';
  return site_rank || 'Membru';
}

app.get('/api/admin/logs', authenticateToken, async (req, res) => {
  const search = (req.query.target_id || req.query.search || '').trim();
  const page = parseInt(req.query.page) || 1;
  const limit = 7; // Maxim 7 pe pagină conform cerinței
  const offset = (page - 1) * limit;

  try {
    let allLogs = [];
    if (!useMock) {
      let sql = 'SELECT * FROM panel_logs';
      let params = [];
      
      if (search) {
        const isNum = !isNaN(Number(search));
        if (isNum) {
          sql += ' WHERE target_id = ? OR user_id = ? OR description LIKE ?';
          params = [Number(search), Number(search), `%${search}%`];
        } else {
          sql += ' WHERE action_type LIKE ? OR description LIKE ?';
          params = [`%${search}%`, `%${search}%`];
        }
      }
      sql += ' ORDER BY created_at DESC LIMIT 200';
      const [l] = await dbPool.query(sql, params);
      allLogs = l;



    } else {
      allLogs = mockData.logs;
    }

    const totalCount = allLogs.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const paginatedLogs = allLogs.slice(offset, offset + limit);

    res.json({ logs: paginatedLogs, currentPage: page, totalPages, totalCount });
  } catch (err) {
    res.status(500).json({ error: 'Eroare loguri: ' + err.message });
  }
});

app.get('/api/settings/users', authenticateToken, async (req, res) => {
  try {
    let users = [];
    if (!useMock) {
      const [u] = await dbPool.query('SELECT id, username, user_id, email, site_rank FROM panel_accounts ORDER BY id DESC');
      users = u;
    } else {
      users = mockData.accounts;
    }
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Eroare setari.' });
  }
});

app.post('/api/settings/update-user-rank', authenticateToken, async (req, res) => {
  const { target_user_id, site_rank } = req.body;
  try {
    if (!useMock) {
      await dbPool.query('UPDATE panel_accounts SET site_rank = ? WHERE user_id = ?', [site_rank, target_user_id]);
    } else {
      const a = mockData.accounts.find(acc => acc.user_id === Number(target_user_id));
      if (a) a.site_rank = site_rank;
    }
    res.json({ success: true, message: `Grad actualizat în: ${site_rank}` });
  } catch (err) {
    res.status(500).json({ error: 'Eroare salvare grad.' });
  }
});

// ===============================
// NEW WEB FEATURES (NEWS, FORUM, GALLERY, STAFF)
// ===============================

// NEWS API
app.get('/api/news', async (req, res) => {
  try {
    let news = [];
    if (!useMock) {
      const [n] = await dbPool.query('SELECT * FROM panel_news ORDER BY created_at DESC');
      news = n;
    } else {
      news = mockData.news;
    }
    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: 'Eroare preluare news.' });
  }
});

app.post('/api/news', authenticateToken, async (req, res) => {
  if (req.user.adminLvl < 1 && req.user.site_rank !== 'Admin Supreme') return res.status(403).json({ error: 'Fara acces.' });
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Toate campurile sunt obligatorii!' });
  try {
    if (!useMock) {
      await dbPool.query('INSERT INTO panel_news (author_id, author_name, title, content) VALUES (?, ?, ?, ?)', [req.user.user_id, req.user.username, title, content]);
    } else {
      mockData.news.unshift({ id: mockData.news.length + 1, author_id: req.user.user_id, author_name: req.user.username, title, content, likes: 0, loves: 0, created_at: new Date() });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare adaugare noutate.' });
  }
});

app.delete('/api/news/:id', authenticateToken, async (req, res) => {
  const user = req.user;
  // Permitem ștergerea doar pentru admini
  if (user.adminLvl < 1 && user.site_rank !== 'Admin Supreme' && user.site_rank !== 'Manager') {
    return res.status(403).json({ error: 'Acces interzis! Nu ești administrator.' });
  }
  
  const { id } = req.params;
  if (useMock) {
    const idx = mockData.news.findIndex(x => x.id == id);
    if (idx === -1) return res.status(404).json({ error: 'Noutatea nu a fost găsită.' });
    mockData.news.splice(idx, 1);
    return res.json({ message: 'Noutatea a fost ștearsă cu succes.' });
  }
  // TODO DB Implementation
});

// FORUM API - CATEGORIES
app.get('/api/forum/categories', async (req, res) => {
  try {
    let categories = [];
    if (!useMock) {
      const [c] = await dbPool.query('SELECT * FROM panel_forum_categories ORDER BY id ASC');
      categories = c;
    } else {
      categories = mockData.forum_categories;
    }
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Eroare forum categories.' });
  }
});

// FORUM API - TOPICS IN CATEGORY
app.get('/api/forum/topics/:categoryId', async (req, res) => {
  try {
    let topics = [];
    if (!useMock) {
      const [t] = await dbPool.query('SELECT * FROM panel_forum_topics WHERE category_id = ? ORDER BY created_at DESC', [req.params.categoryId]);
      topics = t;
    } else {
      topics = mockData.forum_topics.filter(t => t.category_id == req.params.categoryId);
    }
    res.json({ topics });
  } catch (err) {
    res.status(500).json({ error: 'Eroare forum topics.' });
  }
});

// FORUM API - POSTS IN TOPIC
app.get('/api/forum/posts/:topicId', async (req, res) => {
  try {
    let posts = [];
    if (!useMock) {
      const [p] = await dbPool.query('SELECT * FROM panel_forum_posts WHERE topic_id = ? ORDER BY created_at ASC', [req.params.topicId]);
      posts = p;
    } else {
      posts = mockData.forum_posts.filter(p => p.topic_id == req.params.topicId);
    }
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: 'Eroare forum posts.' });
  }
});

// GALLERY API
app.get('/api/gallery', async (req, res) => {
  try {
    let gallery = [];
    if (!useMock) {
      const [g] = await dbPool.query('SELECT * FROM panel_gallery ORDER BY created_at DESC');
      gallery = g;
    } else {
      gallery = mockData.gallery;
    }
    res.json({ gallery });
  } catch (err) {
    res.status(500).json({ error: 'Eroare gallery.' });
  }
});

// STAFF TEAM API
app.get('/api/staff-team', async (req, res) => {
  try {
    let staff = [];
    if (!useMock) {
      const [s] = await dbPool.query('SELECT * FROM panel_staff_team ORDER BY display_order ASC, id ASC');
      staff = s;
    } else {
      staff = mockData.staff_team;
    }
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: 'Eroare staff team.' });
  }
});

// NEW POST ENDPOINTS FOR INTERACTIVITY
app.post('/api/news/:id/react', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  if (useMock) {
    const n = mockData.news.find(x => x.id == id);
    if (!n) return res.status(404).json({ error: 'Not found' });
    if (type === 'like') n.likes = (n.likes || 0) + 1;
    if (type === 'love') n.loves = (n.loves || 0) + 1;
    return res.json({ message: 'Reacted' });
  }
  const col = type === 'love' ? 'loves' : 'likes';
  try {
    if (!useMock) {
      await dbPool.query(`UPDATE panel_news SET ${col} = ${col} + 1 WHERE id = ?`, [req.params.id]);
    } else {
      const n = mockData.news.find(x => x.id == req.params.id);
      if (n) { if (type === 'love') n.loves++; else n.likes++; }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare reactie.' });
  }
});

app.post('/api/forum/topics', authenticateToken, async (req, res) => {
  const { category_id, title, content } = req.body;
  if (!category_id || !title || !content) return res.status(400).json({ error: 'Toate campurile sunt obligatorii!' });
  const acc = mockData.accounts.find(a => a.id === req.user.id);
  if (useMock && acc && acc.is_muted) return res.status(403).json({ error: 'Ai primit MUTE și nu mai poți posta pe forum.' });
  try {
    if (!useMock) {
      await dbPool.query('INSERT INTO panel_forum_topics (category_id, author_id, author_name, title, content) VALUES (?, ?, ?, ?, ?)', [category_id, req.user.user_id, req.user.username, title, content]);
    } else {
      mockData.forum_topics.push({ id: mockData.forum_topics.length + 1, category_id: Number(category_id), author_id: req.user.user_id, author_name: req.user.username, title, content, views: 0, created_at: new Date() });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare creare subiect.' });
  }
});

app.post('/api/forum/posts', authenticateToken, async (req, res) => {
  const { topic_id, content } = req.body;
  if (!topic_id || !content) return res.status(400).json({ error: 'Completati comentariul!' });
  const acc = mockData.accounts.find(a => a.id === req.user.id);
  if (useMock && acc && acc.is_muted) return res.status(403).json({ error: 'Ai primit MUTE și nu mai poți posta.' });
  try {
    if (!useMock) {
      await dbPool.query('INSERT INTO panel_forum_posts (topic_id, author_id, author_name, content) VALUES (?, ?, ?, ?)', [topic_id, req.user.user_id, req.user.username, content]);
    } else {
      mockData.forum_posts.push({ id: mockData.forum_posts.length + 1, topic_id: Number(topic_id), author_id: req.user.user_id, author_name: req.user.username, content, created_at: new Date() });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare adaugare comentariu.' });
  }
});

app.post('/api/gallery', authenticateToken, upload.single('image'), async (req, res) => {
  const { description } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Fisierul imagine este obligatoriu!' });
  const image_url = '/uploads/' + req.file.filename;

  const acc = mockData.accounts.find(a => a.id === req.user.id);
  if (useMock && acc && acc.is_muted) return res.status(403).json({ error: 'Ai primit MUTE și nu mai poți posta.' });
  try {
    if (!useMock) {
      await dbPool.query('INSERT INTO panel_gallery (uploader_id, uploader_name, image_url, description) VALUES (?, ?, ?, ?)', [req.user.user_id, req.user.username, image_url, description]);
    } else {
      mockData.gallery.unshift({ id: mockData.gallery.length + 1, uploader_id: req.user.user_id, uploader_name: req.user.username, image_url, description, created_at: new Date() });
    }
    res.json({ success: true, image_url });
  } catch (err) {
    res.status(500).json({ error: 'Eroare adaugare poza.' });
  }
});

app.post('/api/admin/sanction', authenticateToken, async (req, res) => {
  const isAdmin = req.user.adminLvl > 0 || req.user.site_rank === 'Admin Supreme' || req.user.site_rank === 'Manager Panel';
  if (!isAdmin) return res.status(403).json({ error: 'Acces interzis.' });

  const { target_id, type, reason } = req.body;
  if (!target_id || !type) return res.status(400).json({ error: 'Date invalide.' });

  try {
    if (!useMock) {
      if (type === 'ban') {
        await dbPool.query('UPDATE panel_accounts SET is_banned = 1 WHERE id = ?', [target_id]);
      } else if (type === 'mute') {
        await dbPool.query('UPDATE panel_accounts SET is_muted = 1 WHERE id = ?', [target_id]);
      }
      await dbPool.query('INSERT INTO panel_admin_logs (admin_name, target_id, action, reason) VALUES (?, ?, ?, ?)', [req.user.username, target_id, type.toUpperCase(), reason || 'Sanctiune standard']);
    } else {
      const acc = mockData.accounts.find(a => a.id === target_id);
      if (acc) {
        if (type === 'ban') acc.is_banned = true;
        if (type === 'mute') acc.is_muted = true;
        mockData.adminLogs.unshift({ id: mockData.adminLogs.length + 1, admin_name: req.user.username, target_id, action: type.toUpperCase(), reason: reason || 'N/A', created_at: new Date() });
      }
    }
    res.json({ success: true, message: 'Sancțiune aplicată cu succes.' });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la aplicarea sancțiunii.' });
  }
});

app.post('/api/admin/advanced-sanction', authenticateToken, async (req, res) => {
  const isAdmin = req.user.adminLvl >= 7 || req.user.site_rank === 'Manager Panel' || req.user.site_rank === 'Admin Supreme';
  if (!isAdmin) return res.status(403).json({ error: 'Acces interzis.' });

  const { target_id, action, value } = req.body;
  
  try {
    if (!useMock) {
      if (action === 'warn') {
        await dbPool.query('UPDATE panel_accounts SET warns = warns + 1 WHERE id = ?', [target_id]);
      } else if (action === 'temp_ban') {
        const expires = new Date(Date.now() + value * 60 * 60 * 1000); // value is in hours
        await dbPool.query('UPDATE panel_accounts SET is_banned = 1, temp_ban_expires = ? WHERE id = ?', [expires, target_id]);
      } else if (action === 'temp_mute') {
        const expires = new Date(Date.now() + value * 60 * 60 * 1000); // value is in hours
        await dbPool.query('UPDATE panel_accounts SET is_muted = 1, temp_mute_expires = ? WHERE id = ?', [expires, target_id]);
      } else if (action === 'perm_ban') {
        await dbPool.query('UPDATE panel_accounts SET is_banned = 1, temp_ban_expires = NULL WHERE id = ?', [target_id]);
      } else if (action === 'kick') {
        // Kick does nothing persistent except logging it
      } else if (action === 'delete_account') {
        await dbPool.query('DELETE FROM panel_accounts WHERE id = ?', [target_id]);
      }
      await dbPool.query('INSERT INTO panel_admin_logs (admin_name, target_id, action, reason) VALUES (?, ?, ?, ?)', [req.user.username, target_id, `ADVANCED_${action.toUpperCase()}`, `Valoare: ${value || 'N/A'}`]);
    } else {
      const acc = mockData.accounts.find(a => a.id === target_id);
      if (acc) {
        if (action === 'warn') acc.warns = (acc.warns || 0) + 1;
        if (action === 'temp_ban') { acc.is_banned = true; acc.temp_ban_expires = new Date(Date.now() + value * 60 * 60 * 1000); }
        if (action === 'temp_mute') { acc.is_muted = true; acc.temp_mute_expires = new Date(Date.now() + value * 60 * 60 * 1000); }
        if (action === 'perm_ban') { acc.is_banned = true; acc.temp_ban_expires = null; }
        if (action === 'delete_account') mockData.accounts = mockData.accounts.filter(a => a.id !== target_id);
        mockData.adminLogs.unshift({ id: mockData.adminLogs.length + 1, admin_name: req.user.username, target_id, action: `ADVANCED_${action.toUpperCase()}`, reason: `Valoare: ${value || 'N/A'}`, created_at: new Date() });
      }
    }
    res.json({ success: true, message: 'Acțiune avansată procesată.' });
  } catch(err) {
    res.status(500).json({ error: 'Eroare la aplicarea acțiunii avansate.' });
  }
});

app.delete('/api/gallery/:id', authenticateToken, async (req, res) => {
  const isAdmin = req.user.adminLvl > 0 || req.user.site_rank === 'Admin Supreme' || req.user.site_rank === 'Manager Panel';
  if (!isAdmin) return res.status(403).json({ error: 'Nu ai acces.' });
  try {
    if (!useMock) {
      await dbPool.query('DELETE FROM panel_gallery WHERE id = ?', [req.params.id]);
    } else {
      mockData.gallery = mockData.gallery.filter(g => g.id !== parseInt(req.params.id));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare stergere poza.' });
  }
});

app.delete('/api/news/:id', authenticateToken, async (req, res) => {
  const isAdmin = req.user.adminLvl > 0 || req.user.site_rank === 'Admin Supreme' || req.user.site_rank === 'Manager Panel';
  if (!isAdmin) return res.status(403).json({ error: 'Nu ai acces.' });
  try {
    if (!useMock) {
      await dbPool.query('DELETE FROM panel_news WHERE id = ?', [req.params.id]);
    } else {
      mockData.news = mockData.news.filter(n => n.id !== parseInt(req.params.id));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare stergere noutate.' });
  }
});

app.delete('/api/forum/topics/:id', authenticateToken, async (req, res) => {
  const isAdmin = req.user.adminLvl > 0 || req.user.site_rank === 'Admin Supreme' || req.user.site_rank === 'Manager Panel';
  if (!isAdmin) return res.status(403).json({ error: 'Nu ai acces.' });
  try {
    if (!useMock) {
      await dbPool.query('DELETE FROM panel_forum_topics WHERE id = ?', [req.params.id]);
      await dbPool.query('DELETE FROM panel_forum_posts WHERE topic_id = ?', [req.params.id]);
    } else {
      mockData.forum_topics = mockData.forum_topics.filter(t => t.id !== parseInt(req.params.id));
      mockData.forum_posts = mockData.forum_posts.filter(p => p.topic_id !== parseInt(req.params.id));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare stergere topic.' });
  }
});

app.delete('/api/forum/posts/:id', authenticateToken, async (req, res) => {
  const isAdmin = req.user.adminLvl > 0 || req.user.site_rank === 'Admin Supreme' || req.user.site_rank === 'Manager Panel';
  if (!isAdmin) return res.status(403).json({ error: 'Nu ai acces.' });
  try {
    if (!useMock) {
      await dbPool.query('DELETE FROM panel_forum_posts WHERE id = ?', [req.params.id]);
    } else {
      mockData.forum_posts = mockData.forum_posts.filter(p => p.id !== parseInt(req.params.id));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare stergere raspuns.' });
  }
});

// --- ROLE & APP STATUS API ---

app.get('/api/admin/roles', authenticateToken, async (req, res) => {
  const isAdmin = req.user.adminLvl >= 7 || req.user.site_rank === 'Manager Panel' || req.user.site_rank === 'Admin Supreme';
  if (!isAdmin) return res.status(403).json({ error: 'Acces interzis.' });
  
  if (!useMock) {
    try {
      const [rows] = await dbPool.query('SELECT * FROM panel_roles');
      const roles = rows.map(r => ({ id: r.id, name: r.name, permissions: JSON.parse(r.permissions) }));
      return res.json({ roles });
    } catch(err) {
      return res.status(500).json({ error: 'Eroare bază de date.' });
    }
  }
  res.json({ roles: mockData.roles });
});

app.post('/api/admin/roles', authenticateToken, async (req, res) => {
  if (req.user.site_rank !== 'Manager Panel') return res.status(403).json({ error: 'Acces interzis. Doar Managerii pot crea roluri.' });
  const { name, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'Numele rolului este obligatoriu.' });
  
  if (!useMock) {
    try {
      const permsStr = JSON.stringify(permissions || []);
      await dbPool.query(
        'INSERT INTO panel_roles (name, permissions) VALUES (?, ?) ON DUPLICATE KEY UPDATE permissions = ?',
        [name, permsStr, permsStr]
      );
      return res.json({ success: true, message: 'Rol salvat cu succes în baza de date!' });
    } catch(err) {
      return res.status(500).json({ error: 'Eroare la salvarea rolului.' });
    }
  }

  const existing = mockData.roles.find(r => r.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.permissions = permissions || [];
  } else {
    mockData.roles.push({ id: mockData.roles.length + 1, name, permissions: permissions || [] });
  }
  res.json({ success: true, message: 'Rol salvat cu succes!' });
});

app.get('/api/admin/staff', authenticateToken, async (req, res) => {
  const isAdmin = req.user.adminLvl >= 7 || req.user.site_rank === 'Manager Panel' || req.user.site_rank === 'Admin Supreme';
  if (!isAdmin) return res.status(403).json({ error: 'Acces interzis.' });
  try {
    if (!useMock) {
      const [rows] = await dbPool.query("SELECT * FROM panel_accounts WHERE id != ?", [req.user.id]);
      return res.json({ staff: rows });
    } else {
      const staff = mockData.accounts.filter(a => a.id !== req.user.id);
      return res.json({ staff });
    }
  } catch(err) {
    return res.status(500).json({ error: 'Eroare extragere utilizatori.' });
  }
});

app.get('/api/admin/app-status', async (req, res) => {
  if (!useMock) {
    try {
      const [rows] = await dbPool.query('SELECT * FROM panel_app_status');
      const appStatus = {};
      rows.forEach(r => { appStatus[r.app_type] = r.is_open === 1; });
      return res.json({ appStatus });
    } catch(err) {
      return res.status(500).json({ error: 'Eroare bază de date.' });
    }
  }
  res.json({ appStatus: mockData.appStatus });
});

app.post('/api/admin/app-status', authenticateToken, async (req, res) => {
  const hasAccess = req.user.site_rank === 'Manager Panel' || req.user.site_rank === 'Admin Supreme';
  if (!hasAccess) return res.status(403).json({ error: 'Acces interzis.' });
  
  const { statuses } = req.body;
  if (statuses) {
    if (!useMock) {
      try {
        for (const [appType, isOpen] of Object.entries(statuses)) {
          await dbPool.query(
            'INSERT INTO panel_app_status (app_type, is_open) VALUES (?, ?) ON DUPLICATE KEY UPDATE is_open = ?',
            [appType, isOpen ? 1 : 0, isOpen ? 1 : 0]
          );
        }
        return res.json({ success: true, message: 'Status aplicații actualizat în baza de date!' });
      } catch(err) {
        return res.status(500).json({ error: 'Eroare actualizare status.' });
      }
    }
    mockData.appStatus = statuses;
  }
  res.json({ success: true, message: 'Status aplicații actualizat cu succes!' });
});

// --- USER PROFILE & SANCTIONS API ---

app.get('/api/users/:id/profile', authenticateToken, async (req, res) => {
  const targetId = parseInt(req.params.id);
  try {
    if (!useMock) {
      const [accounts] = await dbPool.query('SELECT id, username, email, site_rank, faction, adminLvl, warns, is_banned, is_muted, created_at FROM panel_accounts WHERE id = ?', [targetId]);
      if (accounts.length === 0) return res.status(404).json({ error: 'Utilizator inexistent.' });
      const account = accounts[0];

      const [userApps] = await dbPool.query('SELECT * FROM panel_applications WHERE user_id = ? ORDER BY created_at DESC', [targetId]);
      const [userSanctions] = await dbPool.query('SELECT * FROM panel_sanctions WHERE user_id = ? ORDER BY created_at DESC', [targetId]);
      const [userTopics] = await dbPool.query('SELECT * FROM panel_forum_topics WHERE author_id = ? ORDER BY created_at DESC LIMIT 10', [targetId]);

      return res.json({
        user: account,
        applications: userApps,
        sanctions: userSanctions,
        topics: userTopics,
        replies: []
      });
    } else {
      const account = mockData.accounts.find(a => a.user_id === targetId || a.id === targetId);
      if (!account) return res.status(404).json({ error: 'Utilizator inexistent.' });
      const userApps = mockData.applications.filter(a => a.user_id === targetId);
      const userSanctions = mockData.sanctions ? mockData.sanctions.filter(s => s.user_id === targetId) : [];
      return res.json({ user: { id: account.id, username: account.username, site_rank: account.site_rank, email: account.email }, applications: userApps, sanctions: userSanctions, topics: [], replies: [] });
    }
  } catch(err) {
    return res.status(500).json({ error: 'Eroare încărcare profil: ' + err.message });
  }
});

app.post('/api/admin/sanction', authenticateToken, (req, res) => {
  const isAdmin = req.user.adminLvl >= 1 || req.user.site_rank === 'Manager Panel' || req.user.site_rank === 'Admin Supreme';
  if (!isAdmin) return res.status(403).json({ error: 'Acces interzis.' });
  
  const { target_id, type, reason, amount } = req.body;
  if (!target_id || !type) return res.status(400).json({ error: 'Date invalide.' });
  
  const account = mockData.accounts.find(a => a.user_id === parseInt(target_id) || a.id === parseInt(target_id));
  if (!account) return res.status(404).json({ error: 'Jucătorul nu a fost găsit.' });
  
  if (type === 'mute') account.is_muted = true;
  if (type === 'unmute') account.is_muted = false;
  if (type === 'ban') account.is_banned = true;
  if (type === 'unban') account.is_banned = false;
  
  mockData.sanctions.push({
    id: mockData.sanctions.length + 1,
    user_id: account.user_id || account.id,
    admin_name: req.user.username,
    type: type,
    reason: reason || 'Niciun motiv specificat',
    created_at: new Date()
  });
  
  res.json({ success: true, message: `Sancțiune ${type.toUpperCase()} aplicată cu succes lui ${account.username}.` });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 S4G FiveM Web Panel is RUNNING on http://localhost:${PORT}`);
  });
});
