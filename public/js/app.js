/* ======================================================
   S4G ROLEPLAY - OBSIDIAN MAGENTA & GOLD CLIENT LOGIC
   ====================================================== */

let currentUser = null;
let token = localStorage.getItem('s4g_token');
let currentMembersPage = 1;
let currentFactionCategory = 'legale';
let currentAppCategory = 'Staff';
let currentRuleCategory = 'general';
let currentRuleData = null;
let activePMComplaintId = null;
let currentProfileSanctions = [];
const PUNISH_PAGE_SIZE = 7;


document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('verified') === 'true') {
    showToast('Contul tău a fost verificat cu succes! Te poți conecta acum.', 'success');
    openModal('modal-login');
    // Remove query param from URL without reloading
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const resetToken = urlParams.get('reset_token');
  if (resetToken) {
    document.getElementById('reset-token').value = resetToken;
    openModal('modal-reset-password');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (token) {
    fetchProfileMe();
  } else {
    updateLayoutVisibility();
  }

  loadDashboardStats();
  loadFactionsData();
  loadTurfsMap();
});

// CUSTOM FLOATING TOAST NOTIFICATION SYSTEM
function showToast(message, type = 'error') {
  let container = document.getElementById('s4g-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 's4g-toast-container';
    container.style.cssText = 'position: fixed; top: 25px; right: 25px; z-index: 9999; display: flex; flex-direction: column; gap: 0.8rem; pointer-events: none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'animate-slide-right';
  toast.style.cssText = `
    pointer-events: auto;
    min-width: 300px; max-width: 420px;
    background: rgba(12, 14, 24, 0.95);
    backdrop-filter: blur(25px);
    border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    border-right: 1px solid rgba(255, 255, 255, 0.15);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 1rem 1.2rem;
    box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 20px ${type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
    color: white; font-size: 0.92rem; line-height: 1.5;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  `;

  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1.4rem;"></i>' : '<i class="fa-solid fa-circle-xmark" style="color: #ef4444; font-size: 1.4rem;"></i>';

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.8rem;">
      ${icon}
      <div><b>${type === 'success' ? 'Notificare Succes' : 'Atenție Eroare'}</b><br><span style="color: #cbd5e1; font-size: 0.86rem;">${message}</span></div>
    </div>
    <span onclick="this.parentElement.remove()" style="cursor: pointer; color: #64748b; font-size: 1.2rem;">&times;</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 6000);
}

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

// LAYOUT VISIBILITY TOGGLE (UNAUTH vs AUTH)
function updateLayoutVisibility() {
  const landingContainer = document.getElementById('landing-view-container');
  const appLayout = document.getElementById('authenticated-app-layout');
  
  const sidebarAdminLbl = document.getElementById('sidebar-admin-lbl');
  const sidebarCPlayer = document.getElementById('sidebar-cplayer-item');
  const sidebarCStaff = document.getElementById('sidebar-cstaff-item');
  const sidebarAdmTickets = document.getElementById('sidebar-adm-tickets-item');
  const sidebarLogsItem = document.getElementById('sidebar-logs-item');
  const sidebarSettingsItem = document.getElementById('sidebar-settings-item');
  const btnPanouControl = document.getElementById('btn-topbar-admin-panel');
  const guestControls = document.getElementById('topbar-guest-controls');
  const authBadge = document.getElementById('auth-user-header-badge');
  const notifBell = document.querySelector('.fa-bell').parentElement;

  if (token && currentUser) {
    landingContainer.style.display = 'none';
    appLayout.style.display = 'flex';
    
    if (guestControls) guestControls.style.display = 'none';
    if (authBadge) authBadge.style.display = 'flex';
    if (notifBell) notifBell.style.display = 'block';
    
    const slinkProfile = document.getElementById('slink-profile');
    if (slinkProfile) slinkProfile.style.display = 'block';

    const isSupreme = currentUser.site_rank === 'Admin Supreme' || currentUser.site_rank === 'Manager Panel' || currentUser.adminLvl >= 6;
    const isAdmin = isSupreme || currentUser.adminLvl > 0;

    if (isAdmin) {
      if (sidebarAdminLbl) sidebarAdminLbl.style.display = 'block';
      if (sidebarCPlayer) sidebarCPlayer.style.display = 'block';
      if (sidebarAdmTickets) sidebarAdmTickets.style.display = 'block';
      if (sidebarLogsItem) sidebarLogsItem.style.display = 'block';
    }

    if (isSupreme) {
      if (sidebarCStaff) sidebarCStaff.style.display = 'block';
      if (sidebarSettingsItem) sidebarSettingsItem.style.display = 'block';
    }

    if (btnPanouControl) {
      const isLeader = currentUser.is_leader;
      const isManager = currentUser.site_rank === 'Manager' || isSupreme;
      if (isLeader || isManager) {
        btnPanouControl.style.display = 'inline-block';
      } else {
        btnPanouControl.style.display = 'none';
      }
    }

    const rankTitle = getAdminRankTitle(currentUser.adminLvl, currentUser.site_rank);

    // Update Header User Card with Prominent Clean Badges
    document.getElementById('header-user-name').innerText = currentUser.username;
    document.getElementById('header-user-sub').innerHTML = `
      <span class="badge badge-supreme" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">${rankTitle}</span>
    `;
    document.getElementById('header-user-avatar').innerText = (currentUser.username || 'U').charAt(0).toUpperCase();

    fetchUserNotifications();

  } else {
    landingContainer.style.display = 'block';
    appLayout.style.display = 'none';

    if (sidebarAdminLbl) sidebarAdminLbl.style.display = 'none';
    if (sidebarAdmTickets) sidebarAdmTickets.style.display = 'none';
    if (sidebarLogsItem) sidebarLogsItem.style.display = 'none';
    if (sidebarSettingsItem) sidebarSettingsItem.style.display = 'none';
    if (btnPanouControl) btnPanouControl.style.display = 'none';
    
    if (guestControls) guestControls.style.display = 'flex';
    if (authBadge) authBadge.style.display = 'none';
    if (notifBell) notifBell.style.display = 'none';
  }
}

// ROUTING & VIEW SWITCHING
function openPublicView(viewName) {
  document.getElementById('landing-view-container').style.display = 'none';
  document.getElementById('authenticated-app-layout').style.display = 'flex';
  switchView(viewName);
}

function switchView(viewName, param = null) {
  if (!token && (viewName === 'logs' || viewName === 'settings' || viewName === 'applications' || viewName === 'tickets' || viewName === 'complaints' || viewName === 'complaints-players' || viewName === 'complaints-staff' || viewName === 'admin-tickets')) {
    openModal('modal-login');
    return;
  }

  document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));

  const logoutBtn = document.getElementById('sidebar-logout-container');
  if(logoutBtn) logoutBtn.style.display = token ? 'block' : 'none';
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.style.display = 'block';

  const slink = document.getElementById(`slink-${viewName}`);
  if (slink) slink.classList.add('active');

  if (viewName === 'news') {
    loadNews();
  } else if (viewName === 'forum') {
    loadForum();
  } else if (viewName === 'gallery') {
    loadGallery();
  } else if (viewName === 'staff-team') {
    loadStaffTeam();
  } else if (viewName === 'rules') {
    loadRulesView(currentRuleCategory);
  } else if (viewName === 'tickets') {
    loadTicketsData();
  } else if (viewName === 'complaints') {
    loadUserMyComplaints();
  } else if (viewName === 'complaints-players') {
    loadAdminPlayerComplaints();
  } else if (viewName === 'complaints-staff') {
    loadAdminStaffComplaints();
  } else if (viewName === 'admin-tickets') {
    loadAdminTicketsPanel();
  } else if (viewName === 'logs') {
    fetchAdminLogs();
  } else if (viewName === 'settings') {
    loadPanelSettingsUsers();
  } else if (viewName === 'factions') {
    loadFactionsData();
  } else if (viewName === 'applications') {
    loadFullApplicationsPage('Staff');
  } else if (viewName === 'profile') {
    loadWebUserProfile(param);
  } else if (viewName === 'admin-panel') {
    switchAdminTab('admin-tab-rules');
    loadAdminRuleEditor('general');
    loadAdminAppsList();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// NOTIFICATIONS BELL BADGE SYSTEM
async function fetchUserNotifications() {
  if (!token) return;
  try {
    const res = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const notifs = data.notifications || [];
    const unread = notifs.filter(n => !n.is_read).length;

    const badge = document.getElementById('notif-count-badge');
    if (badge) {
      if (unread > 0) {
        badge.innerText = unread;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// INTERACTIVE NOTIFICATION CLICK NAVIGATION
function handleNotificationItemClick(title, message) {
  closeModal('modal-notifications');
  
  const text = ((title || '') + ' ' + (message || '')).toLowerCase();
  const idMatch = ((title || '') + ' ' + (message || '')).match(/#(\d+)/);
  const targetId = idMatch ? parseInt(idMatch[1]) : null;

  if (text.includes('reclamație') || text.includes('reclamatie') || text.includes('pm') || text.includes('mesaj')) {
    switchView('complaints');
    if (targetId) {
      setTimeout(() => {
        selectPMConversation(targetId, `Reclamație #${targetId}`, '');
      }, 300);
    }
  } else if (text.includes('ticket')) {
    const isAdmin = currentUser && (currentUser.adminLvl > 0 || currentUser.site_rank === 'Admin Supreme');
    if (isAdmin) {
      switchView('admin-tickets');
    } else {
      switchView('tickets');
    }
    if (targetId) {
      setTimeout(() => {
        openTicketThread(targetId, `Ticket #${targetId}`);
      }, 300);
    }
  } else if (text.includes('sancțiune') || text.includes('sanctiune') || text.includes('jail') || text.includes('ban') || text.includes('warn')) {
    if (currentUser) {
      switchView('profile', currentUser.user_id);
    }
  } else {
    switchView('dashboard');
  }
}

async function openNotificationsModal() {
  openModal('modal-notifications');

  const badge = document.getElementById('notif-count-badge');
  if (badge) badge.style.display = 'none';

  fetch('/api/notifications/read', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }).catch(e => console.error(e));

  try {
    const res = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const body = document.getElementById('notifications-modal-body');
    const notifs = data.notifications || [];

    if (notifs.length === 0) {
      body.innerHTML = '<p style="color: var(--x-text-muted); text-align: center; padding: 1.5rem;">Nu ai nicio notificare recentă.</p>';
      return;
    }

    body.innerHTML = notifs.map(n => {
      const safeTitle = (n.title || '').replace(/'/g, "\\'");
      const safeMessage = (n.message || '').replace(/'/g, "\\'");
      return `
        <div onclick="handleNotificationItemClick('${safeTitle}', '${safeMessage}')" class="notification-item-card" style="background: rgba(255,255,255,0.03); border-left: 3px solid var(--x-pink); border-radius: var(--x-radius-sm); padding: 0.9rem 1.1rem; margin-bottom: 0.8rem; cursor: pointer; transition: var(--transition);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
            <b style="color: white; font-size: 0.95rem;">${n.title}</b>
            <span style="font-size: 0.75rem; color: var(--x-text-muted);">${new Date(n.created_at).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="color: var(--x-text-body); font-size: 0.88rem;">${n.message}</div>
            <span style="font-size: 0.75rem; color: var(--x-gold); font-weight: 700; display: flex; align-items: center; gap: 0.3rem;"><i class="fa-solid fa-arrow-right"></i> Deschide</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
  }
}

// AUTH API CALLS
async function fetchProfileMe() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      currentUser = data;
      updateLayoutVisibility();
    } else {
      handleLogout();
    }
  } catch (err) {
    updateLayoutVisibility();
  }
}

// LOGIN BY USERNAME
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const pass = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Eroare conectare.');

    localStorage.setItem('s4g_token', data.token);
    token = data.token;
    currentUser = data.user;
    closeModal('modal-login');
    showToast('Te-ai autentificat cu succes!', 'success');
    fetchProfileMe();
    switchView('dashboard');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// REGISTER WITH DETAILED ERROR TOAST
async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Eroare la înregistrare.');

    closeModal('modal-register');
    if (data.debug_code) {
      showToast(`DEBUG: Codul de confirmare este ${data.debug_code}`, 'success');
    } else {
      showToast(data.message, 'success');
    }
    
    document.getElementById('verify-email').value = email;
    openModal('modal-verify-code');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleVerifyCode(e) {
  e.preventDefault();
  const email = document.getElementById('verify-email').value;
  const code = document.getElementById('verify-code').value;
  
  try {
    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    closeModal('modal-verify-code');
    showToast(data.message, 'success');
    openModal('modal-login');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;
  
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    closeModal('modal-forgot-password');
    showToast(data.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleResetPassword(e) {
  e.preventDefault();
  const token = document.getElementById('reset-token').value;
  const newPassword = document.getElementById('reset-new-password').value;
  
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    closeModal('modal-reset-password');
    showToast(data.message, 'success');
    openModal('modal-login');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleLogout() {
  localStorage.removeItem('s4g_token');
  token = null;
  currentUser = null;
  updateLayoutVisibility();
  showToast('Te-ai deconectat de pe cont.', 'success');
}

// DASHBOARD STATS & NEWS
async function loadDashboardStats() {
  try {
    const res = await fetch('/api/dashboard/stats');
    const data = await res.json();

    document.getElementById('stat-total-acc').innerText = data.stats.totalAccounts.toLocaleString();
    document.getElementById('stat-staff').innerText = data.stats.activeStaff;

    // Load Latest News (just fetch /api/news and take first 3)
    const newsRes = await fetch('/api/news');
    const newsData = await newsRes.json();
    const newsBox = document.getElementById('dashboard-latest-news');
    if (newsData.news && newsData.news.length > 0) {
      newsBox.innerHTML = newsData.news.slice(0, 3).map(n => `
        <div style="padding: 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--x-border); border-radius: var(--x-radius-md);">
          <div style="color: var(--x-pink); font-size: 0.8rem; font-weight: 800; margin-bottom: 0.3rem;">${new Date(n.created_at).toLocaleDateString()}</div>
          <div style="color: white; font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">${n.title}</div>
          <div style="color: var(--x-text-muted); font-size: 0.9rem;">${n.content.substring(0, 100)}...</div>
        </div>
      `).join('');
    } else {
      newsBox.innerHTML = `<div style="color: var(--x-text-muted);">Momentan nu există noutăți.</div>`;
    }

  } catch (err) {
    console.error(err);
  }
}

// REGULAMENTE VIEW & EDIT FIX
function selectRuleCategory(slug) {
  currentRuleCategory = slug;
  
  const categories = ['general', 'sanctiuni', 'politie', 'smurd', 'mafii', 'cod-penal', 'lideri'];
  categories.forEach(c => {
    const btn = document.getElementById(`rule-btn-${c}`);
    if (btn) {
      if (c === slug) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  loadRulesView(slug);
}

async function loadRulesView(slug) {
  try {
    const res = await fetch('/api/rules');
    const data = await res.json();
    const rules = data.rules || [];

    const rule = rules.find(r => r.slug === slug);
    currentRuleData = rule;

    if (rule) {
      document.getElementById('rule-display-title').innerText = rule.title;
      // Because rules now have HTML (<h3>, <p>, <b>), we use innerHTML
      document.getElementById('rule-content-view').innerHTML = rule.content;
      document.getElementById('rule-edit-textarea').value = rule.content;
      generateRulesTOC();
    } else {
      document.getElementById('rule-display-title').innerText = `Regulament (${slug.toUpperCase()})`;
      document.getElementById('rule-content-view').innerHTML = 'Se încarcă regulamentul... Se poate edita de către Admin Supreme.';
      document.getElementById('rules-toc-list').innerHTML = '';
    }

    const isSupreme = currentUser && (currentUser.site_rank === 'Admin Supreme' || currentUser.adminLvl >= 6);
    document.getElementById('rule-admin-edit-btn').style.display = isSupreme ? 'block' : 'none';
    document.getElementById('rule-content-view').style.display = 'block';
    document.getElementById('rule-content-edit-box').style.display = 'none';

  } catch (err) {
    console.error(err);
  }
}

function generateRulesTOC() {
  const content = document.getElementById('rule-content-view');
  const headers = content.querySelectorAll('h3');
  const tocList = document.getElementById('rules-toc-list');
  
  if (headers.length === 0) {
    tocList.innerHTML = '<div style="color:var(--x-text-muted); font-size: 0.8rem;">Fără capitole</div>';
    return;
  }

  let tocHTML = '';
  headers.forEach((h3, index) => {
    // Generate an ID if it doesn't exist to allow smooth scrolling
    const id = `rule-chapter-${index}`;
    h3.id = id;
    
    // Create the TOC link
    tocHTML += `<a class="rules-toc-link" onclick="document.getElementById('${id}').scrollIntoView({behavior: 'smooth'})">${h3.innerText}</a>`;
  });
  
  tocList.innerHTML = tocHTML;
}

function handleRulesSearch() {
  const query = document.getElementById('rules-search-input').value.toLowerCase();
  const content = document.getElementById('rule-content-view');
  
  // A simple implementation that just highlights or filters paragraphs.
  // For better UX, we'll hide paragraphs that don't match if query length > 2
  const elements = content.querySelectorAll('p, h3');
  
  if (query.length < 2) {
    elements.forEach(el => el.style.display = '');
    return;
  }

  elements.forEach(el => {
    const text = el.innerText.toLowerCase();
    if (text.includes(query)) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

// Add event listener for CTRL+K shortcut for search
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.getElementById('rules-search-input');
    if (searchInput) {
      switchView('rules');
      searchInput.focus();
    }
  }
});

function toggleRuleEditMode() {
  const box = document.getElementById('rule-content-edit-box');
  const view = document.getElementById('rule-content-view');
  if (box.style.display === 'none') {
    box.style.display = 'block';
    view.style.display = 'none';
  } else {
    box.style.display = 'none';
    view.style.display = 'block';
  }
}

async function saveRuleChanges() {
  const content = document.getElementById('rule-edit-textarea').value;
  if (!currentRuleData) return;

  try {
    const res = await fetch('/api/rules/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ slug: currentRuleData.slug, title: currentRuleData.title, content })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    loadRulesView(currentRuleData.slug);

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// TICKETS SUPPORT SYSTEM
async function loadTicketsData() {
  try {
    const res = await fetch('/api/tickets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('tickets-table-body');

    if (!data.tickets || data.tickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--x-text-muted); padding: 1.5rem;">Niciun ticket găsit.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.tickets.map(t => `
      <tr>
        <td><b>#${t.id}</b></td>
        <td><span class="badge badge-supreme">ID ${t.user_id}</span></td>
        <td><span class="badge badge-civil">${t.category}</span></td>
        <td style="color: white; font-weight: 700;">${t.subject}</td>
        <td><span class="badge ${t.status === 'Deschis' ? 'badge-admin' : 'badge-supreme'}">${t.status}</span></td>
        <td>${new Date(t.created_at).toLocaleDateString()}</td>
        <td style="text-align: right;"><button class="btn btn-glass" style="padding: 0.35rem 0.8rem; font-size: 0.78rem;" onclick="openTicketThread(${t.id}, '${t.subject}')"><i class="fa-solid fa-comments"></i> Deschide Thread</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadAdminTicketsPanel() {
  try {
    const res = await fetch('/api/tickets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('admin-tickets-table-body');

    if (!data.tickets || data.tickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--x-text-muted); padding: 1.5rem;">Niciun ticket în așteptare.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.tickets.map(t => `
      <tr>
        <td><b>#${t.id}</b></td>
        <td><span class="badge badge-supreme">ID ${t.user_id}</span></td>
        <td><span class="badge badge-civil">${t.category}</span></td>
        <td style="color: white; font-weight: 700;">${t.subject}</td>
        <td><span class="badge ${t.status === 'Deschis' ? 'badge-admin' : 'badge-supreme'}">${t.status}</span></td>
        <td>${new Date(t.created_at).toLocaleDateString()}</td>
        <td style="text-align: right;"><button class="btn btn-pink" style="padding: 0.35rem 0.8rem; font-size: 0.78rem;" onclick="openTicketThread(${t.id}, '${t.subject}')"><i class="fa-solid fa-reply"></i> Răspunde Ticket</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function handleCreateTicket(e) {
  e.preventDefault();
  const category = document.getElementById('ticket-category').value;
  const subject = document.getElementById('ticket-subject').value;
  const message = document.getElementById('ticket-message').value;

  try {
    const res = await fetch('/api/tickets/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ category, subject, message })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closeModal('modal-create-ticket');
    showToast(data.message, 'success');
    loadTicketsData();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openTicketThread(ticketId, subject) {
  document.getElementById('reply-ticket-id').value = ticketId;
  document.getElementById('ticket-thread-title').innerHTML = `<i class="fa-solid fa-comments" style="color: var(--x-pink);"></i> Thread Ticket #${ticketId}: ${subject}`;
  openModal('modal-view-ticket-thread');

  try {
    const res = await fetch(`/api/tickets/${ticketId}/replies`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const box = document.getElementById('ticket-replies-container');

    if (!data.replies || data.replies.length === 0) {
      box.innerHTML = '<p style="color: var(--x-text-muted); padding: 1rem 0;">Niciun răspuns încă în acest ticket.</p>';
      return;
    }

    box.innerHTML = data.replies.map(r => `
      <div style="background: ${r.is_admin ? 'rgba(255, 0, 127, 0.08)' : 'rgba(255, 255, 255, 0.03)'}; border: 1px solid ${r.is_admin ? 'var(--x-pink)' : 'var(--x-border)'}; border-radius: var(--x-radius-sm); padding: 0.9rem; margin-bottom: 0.8rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
          <span style="font-weight: 800; color: white;">${r.username} ${r.is_admin ? '<span class="badge badge-supreme" style="margin-left: 0.4rem;">STAFF ADMIN</span>' : ''}</span>
          <span style="font-size: 0.75rem; color: var(--x-text-muted);">${new Date(r.created_at).toLocaleString()}</span>
        </div>
        <div style="color: var(--x-text-body); font-size: 0.9rem;">${r.message}</div>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
  }
}

async function handleSendTicketReply(e) {
  e.preventDefault();
  const ticket_id = document.getElementById('reply-ticket-id').value;
  const message = document.getElementById('ticket-reply-text').value;

  try {
    const res = await fetch('/api/tickets/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ticket_id, message })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('ticket-reply-text').value = '';
    showToast(data.message, 'success');
    openTicketThread(ticket_id, '');
    loadTicketsData();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// MODERN PM MESSENGER INBOX SYSTEM
async function loadUserMyComplaints() {
  try {
    const res = await fetch('/api/complaints?my=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const convBox = document.getElementById('pm-conversations-list');
    const complaints = data.complaints || [];

    if (complaints.length === 0) {
      convBox.innerHTML = '<p style="color: var(--x-text-muted); text-align: center; font-size: 0.85rem; padding: 1.5rem;">Nicio conversație PM activă. Apasă "Depune Reclamație" pentru a începe una.</p>';
      return;
    }

    convBox.innerHTML = complaints.map(c => `
      <div onclick="selectPMConversation(${c.id}, '${c.target_name}', '${c.reason}')" style="background: ${activePMComplaintId === c.id ? 'rgba(255, 0, 127, 0.12)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${activePMComplaintId === c.id ? 'var(--x-pink)' : 'var(--x-border)'}; border-radius: var(--x-radius-sm); padding: 0.8rem; cursor: pointer; transition: var(--transition);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
          <b style="color: white; font-size: 0.88rem;">PM #${c.id}: ${c.target_name}</b>
          <span class="badge ${c.complaint_type === 'staff' ? 'badge-supreme' : 'badge-admin'}" style="font-size: 0.65rem;">${c.complaint_type === 'staff' ? 'Staff' : 'Player'}</span>
        </div>
        <div style="font-size: 0.78rem; color: var(--x-text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${c.reason}</div>
      </div>
    `).join('');

    if (complaints.length > 0 && !activePMComplaintId) {
      selectPMConversation(complaints[0].id, complaints[0].target_name, complaints[0].reason);
    }

  } catch (err) {
    console.error(err);
  }
}

async function selectPMConversation(complaintId, targetName, reason) {
  activePMComplaintId = complaintId;
  document.getElementById('pm-active-complaint-id').value = complaintId;
  document.getElementById('pm-active-target-name').innerText = `PM #${complaintId}: ${targetName}`;
  document.getElementById('pm-active-status').innerText = `Motiv: ${reason}`;

  document.getElementById('pm-reply-input').disabled = false;
  document.getElementById('pm-reply-send-btn').disabled = false;

  loadUserMyComplaints();

  try {
    const res = await fetch(`/api/complaints/${complaintId}/replies`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const chatBox = document.getElementById('pm-chat-messages-box');
    const replies = data.replies || [];

    if (replies.length === 0) {
      chatBox.innerHTML = '<p style="color: var(--x-text-muted); text-align: center; margin: auto;">Această conversație PM nu are încă răspunsuri.</p>';
      return;
    }

    chatBox.innerHTML = replies.map(r => {
      const isMine = r.user_id === currentUser.user_id;
      return `
        <div style="display: flex; flex-direction: column; align-items: ${isMine ? 'flex-end' : 'flex-start'};">
          <div style="font-size: 0.72rem; color: var(--x-text-muted); margin-bottom: 0.2rem;">
            ${r.username} ${r.is_admin ? '<span class="badge badge-supreme" style="font-size: 0.6rem;">STAFF ADMIN</span>' : ''} • ${new Date(r.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
          <div style="background: ${isMine ? 'linear-gradient(135deg, var(--x-pink), #d946ef)' : 'rgba(255,255,255,0.06)'}; color: white; border: 1px solid ${isMine ? 'transparent' : 'var(--x-border)'}; border-radius: 12px; padding: 0.75rem 1rem; max-width: 75%; font-size: 0.88rem; line-height: 1.4;">
            ${r.message}
          </div>
        </div>
      `;
    }).join('');

    chatBox.scrollTop = chatBox.scrollHeight;

  } catch (err) {
    console.error(err);
  }
}

async function handleSendPMDirectReply(e) {
  e.preventDefault();
  const complaint_id = document.getElementById('pm-active-complaint-id').value;
  const message = document.getElementById('pm-reply-input').value;

  if (!complaint_id || !message) return;

  try {
    const res = await fetch('/api/complaints/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ complaint_id, message })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('pm-reply-input').value = '';
    selectPMConversation(complaint_id, document.getElementById('pm-active-target-name').innerText, '');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ADMIN PLAYER COMPLAINTS VIEW
async function loadAdminPlayerComplaints() {
  try {
    const res = await fetch('/api/complaints?type=player', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('admin-cplayer-table-body');

    if (!data.complaints || data.complaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--x-text-muted); padding: 1.5rem;">Nicio reclamație împotriva jucătorilor.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.complaints.map(c => `
      <tr>
        <td><b>#${c.id}</b></td>
        <td><span class="badge badge-supreme">ID ${c.user_id}</span></td>
        <td style="color: white; font-weight: 700;">${c.target_name}</td>
        <td>${c.reason}</td>
        <td><a href="${c.proof_url}" target="_blank" style="color: var(--x-gold); text-decoration: none;"><i class="fa-solid fa-link"></i> Dovadă</a></td>
        <td><span class="badge badge-admin">${c.status}</span></td>
        <td style="text-align: right;"><button class="btn btn-pink" style="padding: 0.35rem 0.8rem; font-size: 0.78rem;" onclick="switchView('complaints'); selectPMConversation(${c.id}, '${c.target_name}', '${c.reason}')"><i class="fa-solid fa-reply"></i> Răspunde PM</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// ADMIN STAFF COMPLAINTS VIEW
async function loadAdminStaffComplaints() {
  try {
    const res = await fetch('/api/complaints?type=staff', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('admin-cstaff-table-body');

    if (!data.complaints || data.complaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--x-text-muted); padding: 1.5rem;">Nicio reclamație împotriva membrilor staff.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.complaints.map(c => `
      <tr>
        <td><b>#${c.id}</b></td>
        <td><span class="badge badge-supreme">ID ${c.user_id}</span></td>
        <td style="color: white; font-weight: 700;">${c.target_name}</td>
        <td>${c.reason}</td>
        <td><a href="${c.proof_url}" target="_blank" style="color: var(--x-gold); text-decoration: none;"><i class="fa-solid fa-link"></i> Dovadă</a></td>
        <td><span class="badge badge-admin">${c.status}</span></td>
        <td style="text-align: right;"><button class="btn btn-pink" style="padding: 0.35rem 0.8rem; font-size: 0.78rem;" onclick="switchView('complaints'); selectPMConversation(${c.id}, '${c.target_name}', '${c.reason}')"><i class="fa-solid fa-reply"></i> Răspunde PM Supreme</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function handleCreateComplaint(e) {
  e.preventDefault();
  const complaint_type = document.getElementById('comp-type').value;
  const target_name = document.getElementById('comp-target').value;
  const reason = document.getElementById('comp-reason').value;
  const proof_url = document.getElementById('comp-proof').value;
  const description = document.getElementById('comp-desc').value;

  try {
    const res = await fetch('/api/complaints/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ complaint_type, target_name, reason, proof_url, description })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closeModal('modal-create-complaint');
    showToast(data.message, 'success');
    loadUserMyComplaints();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// MEMBERS LIST
async function loadMembers(page = 1) {
  currentMembersPage = page;
  const search = document.getElementById('member-search').value;

  try {
    const res = await fetch(`/api/members?page=${page}&search=${encodeURIComponent(search)}`);
    const data = await res.json();

    const tbody = document.getElementById('members-list-table');
    if (!data.members || data.members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--x-text-muted); padding: 1.5rem;">Niciun membru găsit.</td></tr>`;
      document.getElementById('members-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = data.members.map(m => `
      <tr onclick="switchView('profile', ${m.id})" style="cursor: pointer;">
        <td style="width: 140px;">
          <span class="badge badge-supreme" style="font-size: 0.85rem;">ID ${m.id}</span>
        </td>
        <td style="color: #ffffff; font-size: 1.05rem; font-weight: 700;">
          ${m.username || (m.firstName ? m.firstName + ' ' + m.secondName : 'Membru ID ' + m.id)}
        </td>
        <td style="width: 120px; text-align: center;">
          ${m.isOnline
            ? `<span style="display:inline-flex;align-items:center;gap:0.4rem;background:rgba(16,185,129,0.15);border:1px solid var(--x-green);color:var(--x-green);padding:0.2rem 0.7rem;border-radius:20px;font-size:0.8rem;font-weight:700;">
                <span style="width:7px;height:7px;background:var(--x-green);border-radius:50%;animation:pulse-dot 1.4s infinite;"></span> ONLINE
               </span>`
            : `<span style="display:inline-flex;align-items:center;gap:0.4rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:var(--x-text-muted);padding:0.2rem 0.7rem;border-radius:20px;font-size:0.8rem;font-weight:600;">
                <span style="width:7px;height:7px;background:var(--x-text-muted);border-radius:50%;"></span> OFFLINE
               </span>`
          }
        </td>
        <td style="width: 140px; text-align: right;">
          <button class="btn btn-glass" style="padding: 0.4rem 0.9rem; font-size: 0.8rem;"><i class="fa-solid fa-user"></i> Vezi Profil</button>
        </td>
      </tr>
    `).join('');

    let pagHTML = '';
    for (let i = 1; i <= data.totalPages; i++) {
      pagHTML += `<button class="btn ${i === data.currentPage ? 'btn-pink' : 'btn-glass'}" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;" onclick="loadMembers(${i})">${i}</button>`;
    }
    document.getElementById('members-pagination').innerHTML = pagHTML;

  } catch (err) {
    console.error(err);
  }
}

function searchMembers() { loadMembers(1); }

// FACTIONS CATEGORIZED & INTERACTIVE MEMBERS POP-UP & ADMIN ADD/DELETE
function filterFactionCategory(cat) {
  currentFactionCategory = cat;
  document.getElementById('btn-fac-legale').className = cat === 'legale' ? 'btn btn-pink' : 'btn btn-glass';
  document.getElementById('btn-fac-ilegale').className = cat === 'ilegale' ? 'btn btn-pink' : 'btn btn-glass';
  loadFactionsData();
}

async function loadFactionsData() {
  const isSupreme = currentUser && (currentUser.site_rank === 'Admin Supreme' || currentUser.adminLvl >= 6);
  document.getElementById('admin-faction-add-card').style.display = isSupreme ? 'block' : 'none';

  try {
    const res = await fetch('/api/factions');
    const data = await res.json();
    const box = document.getElementById('factions-list');

    let allFactions = data.factions || [];
    let filtered = [];

    if (currentFactionCategory === 'legale') {
      filtered = allFactions.filter(f => {
        const name = (f.faction || f.faction_name).toLowerCase();
        return name.includes('politi') || name.includes('lspd') || name.includes('smurd') || name.includes('medic') || name.includes('mecanic') || f.faction_type === 'legale';
      });
      if (filtered.length === 0) {
        filtered = [
          { faction: 'Departament Poliție (LSPD)', count: 2 },
          { faction: 'Serviciul SMURD / Medic', count: 0 },
          { faction: 'Atelier Mecanici Auto', count: 0 }
        ];
      }
    } else {
      filtered = allFactions.filter(f => {
        const name = (f.faction || f.faction_name).toLowerCase();
        return !name.includes('politi') && !name.includes('lspd') && !name.includes('smurd') && !name.includes('medic') && !name.includes('mecanic') && f.faction_type !== 'legale';
      });
      if (filtered.length === 0) {
        filtered = [
          { faction: 'Mafia Ballas', count: 2 },
          { faction: 'Mafia Los Vagos', count: 0 },
          { faction: 'Mafia Grove Street', count: 0 }
        ];
      }
    }

    box.innerHTML = filtered.map(f => {
      const fName = f.faction || f.faction_name;
      return `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--x-border); border-radius: var(--x-radius-sm); padding: 1rem; margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: center; transition: var(--transition);" class="faction-card-item">
          <div onclick="openFactionMembersModal('${fName}')" style="cursor: pointer; flex: 1;">
            <span class="badge ${getFactionBadgeClass(fName)}" style="font-size: 0.88rem;">${fName}</span>
            <div style="font-size: 0.78rem; color: var(--x-gold); margin-top: 0.3rem;"><i class="fa-solid fa-hand-pointer"></i> Apasă pentru a vedea lista de membri</div>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="color: var(--x-text-body); font-size: 0.88rem;">Membri: <b style="color: white;">${f.count || 0}</b></div>
            ${isSupreme ? `<button class="btn btn-red" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="adminDeleteFaction('${fName}')"><i class="fa-solid fa-trash"></i> Șterge</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
  }
}

async function adminAddNewFaction() {
  const name = document.getElementById('admin-new-faction-name').value;
  const type = document.getElementById('admin-new-faction-type').value;

  if (!name) return showToast('Introdu numele facțiunii!', 'error');

  try {
    const res = await fetch('/api/factions/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ faction_name: name, faction_type: type })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('admin-new-faction-name').value = '';
    showToast(data.message, 'success');
    loadFactionsData();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function adminDeleteFaction(factionName) {
  if (!confirm(`Sigur dorești să ștergi facțiunea ${factionName}?`)) return;

  try {
    const res = await fetch('/api/factions/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ faction_name: factionName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    loadFactionsData();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// OPEN FACTION MEMBERS MODAL POP-UP
async function openFactionMembersModal(factionName) {
  document.getElementById('faction-modal-title').innerHTML = `<i class="fa-solid fa-users-viewfinder" style="color: var(--x-pink);"></i> Membrii - ${factionName}`;
  openModal('modal-faction-members');

  try {
    const res = await fetch(`/api/factions/members?faction=${encodeURIComponent(factionName)}`);
    const data = await res.json();
    const tbody = document.getElementById('faction-members-table-body');

    if (!data.members || data.members.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--x-text-muted); padding: 1.5rem;">Niciun membru găsit în această facțiune.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.members.map(m => `
      <tr onclick="closeModal('modal-faction-members'); switchView('profile', ${m.id})" style="cursor: pointer;">
        <td><span class="badge badge-supreme">ID ${m.id}</span></td>
        <td style="color: white; font-weight: 700;">${m.username || (m.firstName ? m.firstName + ' ' + m.secondName : 'Membru ID ' + m.id)}</td>
        <td><span class="badge ${getFactionBadgeClass(factionName)}">${m.factionRank || 'Membru'}</span></td>
        <td><b style="color: var(--x-pink);">${(m.hoursPlayed || 0).toFixed(1)}h</b></td>
        <td style="text-align: right;"><button class="btn btn-glass" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">Profil</button></td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
  }
}

// FULL-PAGE APPLICATIONS LOGIC & DELETE QUESTION
function selectAppCategory(cat) {
  currentAppCategory = cat;
  document.getElementById('btn-app-staff').className = cat === 'Staff' ? 'btn btn-pink' : 'btn btn-glass';
  document.getElementById('btn-app-gang').className = cat === 'Gang / Mafie' ? 'btn btn-pink' : 'btn btn-glass';
  document.getElementById('btn-app-dev').className = cat === 'Development' ? 'btn btn-pink' : 'btn btn-glass';
  
  loadFullApplicationsPage(cat);
}

async function loadFullApplicationsPage(cat) {
  document.getElementById('full-app-type').value = cat;
  document.getElementById('app-form-header-title').innerText = `Formular Aplicație ${cat}`;

  const isSupreme = currentUser && (currentUser.site_rank === 'Admin Supreme' || currentUser.site_rank === 'Manager Panel' || currentUser.adminLvl >= 6);
  document.getElementById('admin-question-manager-card').style.display = isSupreme ? 'block' : 'none';

  try {
    const statusRes = await fetch('/api/admin/app-status');
    const statusData = await statusRes.json();
    const appStatus = statusData.appStatus || {};
    
    const box = document.getElementById('app-dynamic-questions-box');
    
    if (appStatus[cat] === false) {
      box.innerHTML = `
        <div style="background: rgba(230, 43, 58, 0.1); border-left: 4px solid var(--x-danger); padding: 1rem; border-radius: 4px; margin: 1rem 0;">
          <h3 style="color: var(--x-danger); margin-bottom: 0.5rem;"><i class="fa-solid fa-lock"></i> Aplicații Închise</h3>
          <p style="color: white; margin: 0;">Ne pare rău, dar aplicațiile pentru <strong>${cat}</strong> sunt momentan închise. Te rugăm să revii mai târziu.</p>
        </div>
      `;
      document.querySelector('#view-applications form button[type="submit"]').style.display = 'none';
      return;
    } else {
      document.querySelector('#view-applications form button[type="submit"]').style.display = 'block';
    }

    const res = await fetch(`/api/applications/questions?type=${encodeURIComponent(cat)}`);
    const data = await res.json();

    if (!data.questions || data.questions.length === 0) {
      box.innerHTML = '<p style="color: var(--x-text-muted); margin: 1rem 0;">Nicio întrebare setată pentru această aplicație.</p>';
      return;
    }

    box.innerHTML = data.questions.map((q, idx) => `
      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label class="form-label">${idx + 1}. ${q.question_text}</label>
          ${isSupreme ? `<button type="button" class="btn btn-red" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;" onclick="adminDeleteQuestion(${q.id})"><i class="fa-solid fa-trash"></i> Șterge Întrebare</button>` : ''}
        </div>
        <textarea class="form-input app-answer-input" data-qid="${q.id}" style="height: 80px;" placeholder="Răspunsul tău detaliat..." required></textarea>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
  }
}

async function adminDeleteQuestion(qId) {
  if (!confirm('Sigur ștergi această întrebare?')) return;
  try {
    const res = await fetch('/api/applications/questions/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ question_id: qId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    loadFullApplicationsPage(currentAppCategory);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function adminAddNewQuestion() {
  const text = document.getElementById('admin-new-question-input').value;
  if (!text) return showToast('Introdu textul întrebării!', 'error');

  try {
    const res = await fetch('/api/applications/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ app_type: currentAppCategory, question_text: text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('admin-new-question-input').value = '';
    showToast('Întrebare adăugată cu succes!', 'success');
    loadFullApplicationsPage(currentAppCategory);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitFullApplication(e) {
  e.preventDefault();
  const app_type = document.getElementById('full-app-type').value;
  const name_rp = document.getElementById('full-app-name-rp').value;
  const age = document.getElementById('full-app-age').value;

  const answers = [];
  document.querySelectorAll('.app-answer-input').forEach(input => {
    answers.push({ questionId: input.getAttribute('data-qid'), answer: input.value });
  });

  try {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ app_type, name_rp, age, answers })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    switchView('dashboard');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// PLAYER PROFILE DETAILED VIEW & PUNISH LOG DELETE
async function loadUserProfile(userId) {
  try {
    const res = await fetch(`/api/profile/${userId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const p = data.player;
    const isAdminLoggedIn = currentUser && (currentUser.adminLvl > 0 || currentUser.site_rank === 'Admin Supreme');
    const sanctions = data.sanctions || [];

    let vehHTML = data.vehicles.length === 0 ? '<p style="color: var(--x-text-muted);">Jucătorul nu deține nicio mașină în garaj.</p>' :
      `<div class="x-grid-3">${data.vehicles.map(v => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--x-border); border-radius: var(--x-radius-sm); padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <div>
              <div style="color: white; font-weight: 800; font-size: 1.05rem;">${v.vehicle.toUpperCase()}</div>
              <div style="font-size: 0.8rem; color: var(--x-text-muted);">Plăcuță: <b style="color: white;">${v.vehicle_plate}</b></div>
            </div>
            <span class="badge ${v.sechestrat ? 'badge-supreme' : 'badge-civil'}">${v.sechestrat ? 'Sechestrată' : 'În Garaj'}</span>
          </div>

          <div class="veh-inventory-box">
            <div class="veh-inv-title"><i class="fa-solid fa-box"></i> Conținut Portbagaj</div>
            <div class="veh-inv-content">${v.portbagaj || 'Portbagaj gol.'}</div>
          </div>

          <div class="veh-inventory-box" style="margin-top: 0.5rem;">
            <div class="veh-inv-title" style="color: var(--x-cyan);"><i class="fa-solid fa-folder-closed"></i> Conținut Torpedou</div>
            <div class="veh-inv-content">${v.torpedou || 'Torpedou gol.'}</div>
          </div>
        </div>
      `).join('')}</div>`;

    let punishLogsHTML = sanctions.length === 0 ? 
      '<p style="color: var(--x-text-muted); font-size: 0.9rem; padding: 0.5rem 0;">Jucătorul nu are nicio sancțiune înregistrată (Punish Logs Curat).</p>' :
      sanctions.map(s => `
        <div class="x-punish-box">
          <div class="x-punish-header">
            <div>
              <span class="badge badge-supreme">${s.action_type}</span>
              <span style="font-size: 0.82rem; color: var(--x-text-muted); margin-left: 0.8rem;">Data: ${new Date(s.created_at).toLocaleString()}</span>
            </div>
            <div style="display: flex; gap: 0.8rem; align-items: center;">
              <span style="font-size: 0.82rem; color: var(--x-gold); font-weight: 700;">Executant Admin ID: ${s.user_id}</span>
              ${isAdminLoggedIn ? `<button class="btn btn-red" style="padding: 0.25rem 0.6rem; font-size: 0.72rem;" onclick="adminDeletePunishLog(${s.id}, ${p.id})"><i class="fa-solid fa-trash"></i> Șterge Sancțiune</button>` : ''}
            </div>
          </div>
          <div style="color: #ffffff; font-size: 0.92rem;">${s.description}</div>
        </div>
      `).join('');

    const profileHTML = `
      <div class="x-profile-banner">
        <div style="display: flex; align-items: center; gap: 1.4rem;">
          <div class="x-profile-avatar">${(p.username || 'P').charAt(0).toUpperCase()}</div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
              <h1 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.8rem; color: white; margin: 0;">${p.username || (p.firstName ? p.firstName + ' ' + p.secondName : 'ID ' + p.id)}</h1>
              ${p.isOnline
                ? `<span style="display:inline-flex;align-items:center;gap:0.4rem;background:rgba(16,185,129,0.2);border:1px solid var(--x-green);color:var(--x-green);padding:0.25rem 0.9rem;border-radius:20px;font-size:0.82rem;font-weight:800;">
                    <span style="width:8px;height:8px;background:var(--x-green);border-radius:50%;animation:pulse-dot 1.4s infinite;"></span> ONLINE PE SERVER
                   </span>`
                : `<span style="display:inline-flex;align-items:center;gap:0.4rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:var(--x-text-muted);padding:0.25rem 0.9rem;border-radius:20px;font-size:0.82rem;font-weight:700;">
                    <span style="width:8px;height:8px;background:var(--x-text-muted);border-radius:50%;"></span> OFFLINE
                   </span>`
              }
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
              <span class="badge ${getFactionBadgeClass(p.faction)}">${p.faction || 'Civil'} - ${p.factionRank || 'Membru'}</span>
              <span class="badge ${p.adminLvl >= 6 ? 'badge-supreme' : (p.adminLvl > 0 ? 'badge-admin' : 'badge-civil')}">${getAdminRankTitle(p.adminLvl, p.site_rank)}</span>
              <span class="badge badge-civil">ID Joc: ${p.id}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 1rem;">
          <div class="x-stat-box-small">
            <div style="font-size: 0.75rem; color: var(--x-text-muted); text-transform: uppercase;">Ore Jucate</div>
            <div class="x-stat-box-num" style="color: var(--x-pink);">${(p.hoursPlayed || 0).toFixed(1)}h</div>
          </div>
          <div class="x-stat-box-small">
            <div style="font-size: 0.75rem; color: var(--x-text-muted); text-transform: uppercase;">Warn-uri</div>
            <div class="x-stat-box-num" style="color: var(--x-orange);">${p.warns || 0}</div>
          </div>
          <div class="x-stat-box-small">
            <div style="font-size: 0.75rem; color: var(--x-text-muted); text-transform: uppercase;">Ban-uri</div>
            <div class="x-stat-box-num" style="color: var(--x-red);">${p.banned ? 1 : 0}</div>
          </div>
        </div>
      </div>

      <div class="x-grid-3">
        <div class="x-card">
          <div class="x-metric-lbl">Bani În Buzunar</div>
          <div class="x-metric-val" style="color: var(--x-green);">$${(p.walletMoney || 0).toLocaleString()}</div>
        </div>
        <div class="x-card">
          <div class="x-metric-lbl">Bani În Bancă</div>
          <div class="x-metric-val" style="color: var(--x-cyan);">$${(p.bankMoney || 0).toLocaleString()}</div>
        </div>
        <div class="x-card">
          <div class="x-metric-lbl">Diamante Deținute</div>
          <div class="x-metric-val" style="color: var(--x-pink);">${(p.Diamante || 0).toLocaleString()}</div>
        </div>
      </div>

      ${isAdminLoggedIn ? `
      <div class="x-card" style="margin-bottom: 1.5rem; border-color: var(--x-pink);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--x-pink);">
            <i class="fa-solid fa-user-shield"></i> Acțiuni Administrare Jucător (Admin)
          </div>
          <button class="btn btn-pink" onclick="openAdminActionModalWithTarget(${p.id})">
            <i class="fa-solid fa-sliders"></i> SCHIMBĂ ACȚIUNEA ADMIN
          </button>
        </div>
      </div>
      ` : ''}

      <div class="x-card" style="margin-bottom: 1.5rem;">
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.2rem; font-weight: 800; color: white; margin-bottom: 1rem;">
          <i class="fa-solid fa-gavel" style="color: var(--x-red);"></i> Istoric Sancțiuni & Punish Logs
        </div>
        <div id="profile-punish-logs-list"></div>
        <div id="profile-punish-logs-pagination" style="display: flex; gap: 0.4rem; margin-top: 1rem; justify-content: center;"></div>
      </div>

      <div class="x-card">
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.2rem; font-weight: 800; color: white; margin-bottom: 1rem;">
          <i class="fa-solid fa-car" style="color: var(--x-gold);"></i> Garaj Auto & Inventar Portbagaj / Torpedou
        </div>
        ${vehHTML}
      </div>
    `;

    document.getElementById('profile-container').innerHTML = profileHTML;
    currentProfileSanctions = sanctions;
    renderPunishLogsPage(1);
    switchView('profile');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// PUNISH LOGS PAGINATION (7 per page, per profile)
function renderPunishLogsPage(page) {
  const listEl = document.getElementById('profile-punish-logs-list');
  const pagEl  = document.getElementById('profile-punish-logs-pagination');
  if (!listEl || !pagEl) return;

  const isAdmin = currentUser && (currentUser.adminLvl > 0 || currentUser.site_rank === 'Admin Supreme');
  const total   = currentProfileSanctions.length;
  const totalPages = Math.max(1, Math.ceil(total / PUNISH_PAGE_SIZE));
  page = Math.max(1, Math.min(page, totalPages));

  if (total === 0) {
    listEl.innerHTML = '<p style="color: var(--x-text-muted); font-size: 0.9rem; padding: 0.5rem 0;">Jucătorul nu are nicio sancțiune înregistrată.</p>';
    pagEl.innerHTML  = '';
    return;
  }

  const slice = currentProfileSanctions.slice((page - 1) * PUNISH_PAGE_SIZE, page * PUNISH_PAGE_SIZE);

  listEl.innerHTML = slice.map(s => `
    <div class="x-punish-box">
      <div class="x-punish-header">
        <div>
          <span class="badge badge-supreme">${s.action_type}</span>
          <span style="font-size: 0.82rem; color: var(--x-text-muted); margin-left: 0.8rem;">Data: ${new Date(s.created_at).toLocaleString('ro-RO')}</span>
        </div>
        <div style="display: flex; gap: 0.8rem; align-items: center;">
          <span style="font-size: 0.82rem; color: var(--x-gold); font-weight: 700;">Admin ID: ${s.user_id}</span>
          ${isAdmin ? `<button class="btn btn-red" style="padding: 0.25rem 0.6rem; font-size: 0.72rem;" onclick="adminDeletePunishLog(${s.id}, ${s.target_id})"><i class="fa-solid fa-trash"></i> Șterge</button>` : ''}
        </div>
      </div>
      <div style="color: #ffffff; font-size: 0.92rem;">${s.description}</div>
    </div>
  `).join('');

  // Pagination buttons
  let paginationHTML = '';
  if (page > 1) paginationHTML += `<button class="btn btn-glass" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;" onclick="renderPunishLogsPage(${page - 1})">‹ Înapoi</button>`;
  for (let i = 1; i <= totalPages; i++) {
    paginationHTML += `<button class="btn ${i === page ? 'btn-pink' : 'btn-glass'}" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;" onclick="renderPunishLogsPage(${i})">${i}</button>`;
  }
  if (page < totalPages) paginationHTML += `<button class="btn btn-glass" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;" onclick="renderPunishLogsPage(${page + 1})">Înainte ›</button>`;
  pagEl.innerHTML = paginationHTML;
}

async function adminDeletePunishLog(logId, targetId) {
  if (!confirm('Sigur ștergi această sancțiune din logs?')) return;
  try {
    const res = await fetch('/api/admin/delete-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ log_id: logId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    loadUserProfile(targetId);

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// DROPDOWN ADMIN ACTION MODAL HANDLER
function openAdminActionModalWithTarget(targetId) {
  document.getElementById('admin-target-id').value = targetId;
  onAdminActionSelectChange(document.getElementById('admin-action-select').value);
  openModal('modal-admin-action');
}

function onAdminActionSelectChange(val) {
  const amountGroup = document.getElementById('group-action-amount');
  const amountLabel = document.getElementById('label-action-amount');

  if (val === 'jail') {
    amountGroup.style.display = 'block';
    amountLabel.innerText = 'Timp Închisoare (Minute)';
  } else if (val === 'givemoney') {
    amountGroup.style.display = 'block';
    amountLabel.innerText = 'Sumă Bani În Bancă ($)';
  } else if (val === 'givedmd') {
    amountGroup.style.display = 'block';
    amountLabel.innerText = 'Număr Diamante Oferite';
  } else {
    amountGroup.style.display = 'none';
  }
}

async function executeAdminAction(e) {
  e.preventDefault();
  const target_id = document.getElementById('admin-target-id').value;
  const action = document.getElementById('admin-action-select').value;
  const amount = document.getElementById('admin-action-amount').value;
  const reason = document.getElementById('admin-action-reason').value;

  try {
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ target_id, action, amount, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closeModal('modal-admin-action');
    showToast(data.message, 'success');
    loadUserProfile(target_id);

  } catch (err) {
    showToast(err.message, 'error');
  }
}

let currentLogsPage = 1;

async function fetchAdminLogs(page = 1) {
  currentLogsPage = page;
  const query = document.getElementById('log-search-id').value;
  try {
    const res = await fetch(`/api/admin/logs?search=${encodeURIComponent(query)}&page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('admin-logs-table');
    const pagBox = document.getElementById('logs-pagination');

    if (!data.logs || data.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--x-text-muted); padding: 1.5rem;">Niciun log găsit conform căutării.</td></tr>`;
      if (pagBox) pagBox.innerHTML = '';
      return;
    }

    tbody.innerHTML = data.logs.map(l => {
      let badgeClass = 'badge-supreme';
      const act = (l.action_type || '').toUpperCase();
      if (act.includes('JAIL') || act.includes('BAN')) badgeClass = 'badge-admin';
      if (act.includes('MAȘINĂ') || act.includes('MASINA')) badgeClass = 'badge-civil';

      return `
        <tr>
          <td style="font-size: 0.85rem; color: var(--x-text-muted);">${new Date(l.created_at).toLocaleString()}</td>
          <td><b style="color: var(--x-gold);">Executant ID ${l.user_id}</b></td>
          <td><span class="badge ${badgeClass}">${l.action_type}</span></td>
          <td><span class="badge badge-supreme" onclick="switchView('profile', ${l.target_id})" style="cursor: pointer;"><i class="fa-solid fa-user"></i> Deschide Istoric ID ${l.target_id || '--'}</span></td>
          <td style="color: #ffffff; font-weight: 600;">${l.description}</td>
        </tr>
      `;
    }).join('');

    if (pagBox) {
      let pagHTML = '';
      for (let i = 1; i <= (data.totalPages || 1); i++) {
        pagHTML += `<button class="btn ${i === data.currentPage ? 'btn-pink' : 'btn-glass'}" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;" onclick="fetchAdminLogs(${i})">${i}</button>`;
      }
      pagBox.innerHTML = pagHTML;
    }

  } catch (err) {
    showToast('Eroare la încărcarea logurilor.', 'error');
  }
}

async function loadPanelSettingsUsers() {
  try {
    const res = await fetch('/api/settings/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('settings-users-table');

    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--x-text-muted); padding: 1.5rem;">Niciun utilizator înregistrat.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.users.map(u => {
      let roleOptions = `
        <option value="Member" ${u.site_rank === 'Member' ? 'selected' : ''}>Membru</option>
        <option value="Admin Supreme" ${u.site_rank === 'Admin Supreme' ? 'selected' : ''}>Admin Supreme</option>
      `;
      currentRoles.forEach(r => {
        roleOptions += `<option value="${r.name}" ${u.site_rank === r.name ? 'selected' : ''}>${r.name}</option>`;
      });

      return `
        <tr>
          <td><b>ID ${u.user_id}</b></td>
          <td style="color: white; font-weight: 700;">${u.username || 'User_' + u.user_id}</td>
          <td>${u.email}</td>
          <td><span class="badge ${u.site_rank === 'Admin Supreme' || u.site_rank === 'Manager Panel' ? 'badge-supreme' : 'badge-civil'}">${u.site_rank}</span></td>
          <td>
            <select class="form-input" style="padding: 0.35rem 0.6rem; width: 160px;" onchange="updateUserSiteRank(${u.user_id}, this.value)">
              ${roleOptions}
            </select>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

async function updateUserSiteRank(targetId, newRank) {
  try {
    const res = await fetch('/api/settings/update-user-rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ target_user_id: targetId, site_rank: newRank })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    loadPanelSettingsUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function getFactionBadgeClass(fac) {
  if (!fac) return 'badge-civil';
  const f = fac.toLowerCase();
  if (f.includes('politi') || f.includes('lspd')) return 'badge-admin';
  if (f.includes('smurd') || f.includes('medic')) return 'badge-supreme';
  if (f.includes('mecanic')) return 'badge-civil';
  return 'badge-supreme';
}

function openShopCheckoutModal(pkgName, price) {
  document.getElementById('shop-pkg-title').innerText = pkgName;
  document.getElementById('shop-pkg-price').innerText = price;
  openModal('modal-shop-checkout');
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ==========================================
// NEW WEB FEATURES FETCH FUNCTIONS
// ==========================================

async function loadNews() {
  try {
    const res = await fetch('/api/news');
    const data = await res.json();
    const container = document.getElementById('news-container');
    
    let topBar = '';
    const isAdmin = token && currentUser && (currentUser.adminLvl > 0 || currentUser.site_rank === 'Admin Supreme' || currentUser.site_rank === 'Manager Panel');
    if (isAdmin) {
      topBar = `<div style="text-align: right; margin-bottom: 1.5rem;"><button class="btn btn-pink glow-btn" onclick="openModal('modal-add-news')"><i class="fa-solid fa-plus"></i> Adaugă Noutate</button></div>`;
    }

    if (!data.news || data.news.length === 0) {
      container.innerHTML = topBar + '<div style="color: var(--x-text-muted);">Nu există noutăți publicate încă.</div>';
      return;
    }

    container.innerHTML = topBar + data.news.map(n => `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--x-border); border-radius: var(--x-radius-md); padding: 1.5rem; margin-bottom: 1rem; position: relative;">
        ${isAdmin ? `<button class="btn btn-glass" style="position: absolute; top: 1rem; right: 1rem; color: #ef4444; border-color: #ef4444; padding: 0.3rem 0.6rem;" onclick="deleteNews(${n.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; padding-right: 3rem;">
          <h3 style="color: white; font-size: 1.4rem;">${n.title}</h3>
          <span style="font-size: 0.85rem; color: var(--x-text-muted);">${new Date(n.created_at).toLocaleString()}</span>
        </div>
        <div style="color: var(--x-pink); font-size: 0.9rem; margin-bottom: 1rem; font-weight: 700;">Autor: ${n.author_name}</div>
        <div style="color: var(--x-text-body); line-height: 1.6; margin-bottom: 1rem;">${n.content}</div>
        <div style="border-top: 1px solid var(--x-border); padding-top: 0.8rem; display: flex; gap: 0.8rem;">
          <button class="btn btn-glass" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;" onclick="handleNewsReaction(${n.id}, 'like')">👍 ${n.likes || 0}</button>
          <button class="btn btn-glass" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;" onclick="handleNewsReaction(${n.id}, 'love')">❤️ ${n.loves || 0}</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading news:', err);
  }
}

async function handleNewsReaction(newsId, type) {
  if (!token) {
    showToast('Conectează-te pentru a reacționa la postări!', 'error');
    return;
  }
  try {
    const res = await fetch(`/api/news/${newsId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ type })
    });
    if (!res.ok) throw new Error('Eroare');
    showToast('Ai reacționat la această noutate!', 'success');
    loadNews(); // refresh
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitNews(e) {
  e.preventDefault();
  const title = document.getElementById('news-title').value;
  const content = document.getElementById('news-content').value;
  try {
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, content })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Noutatea a fost publicată!', 'success');
    closeModal('modal-add-news');
    loadNews();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadForum() {
  try {
    const res = await fetch('/api/forum/categories');
    const data = await res.json();
    const container = document.getElementById('forum-categories-container');
    if (!data.categories || data.categories.length === 0) {
      container.innerHTML = '<div style="color: var(--x-text-muted);">Nu există categorii de forum.</div>';
      return;
    }
    container.innerHTML = data.categories.map(c => `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--x-border); border-radius: var(--x-radius-md); padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem;">
        <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(6, 182, 212, 0.1); display: flex; align-items: center; justify-content: center; color: var(--x-cyan); font-size: 1.5rem;">
          <i class="${c.icon}"></i>
        </div>
        <div style="flex: 1;">
          <h3 style="color: white; font-size: 1.2rem; margin-bottom: 0.3rem;">${c.title}</h3>
          <div style="color: var(--x-text-muted); font-size: 0.9rem;">${c.description}</div>
        </div>
        <button class="btn btn-glass" onclick="openForumCategory(${c.id}, '${c.title}')">Vezi Subiecte</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading forum:', err);
  }
}

async function openForumCategory(categoryId, categoryTitle) {
  try {
    const res = await fetch(`/api/forum/topics/${categoryId}`);
    const data = await res.json();
    const container = document.getElementById('forum-categories-container');
    
    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="color: white; font-size: 1.5rem;"><i class="fa-solid fa-folder-open" style="color: var(--x-gold);"></i> ${categoryTitle}</h2>
        <div>
          <button class="btn btn-glass" style="margin-right: 0.5rem;" onclick="loadForum()"><i class="fa-solid fa-arrow-left"></i> Înapoi</button>
          ${token ? `<button class="btn btn-pink glow-btn" onclick="document.getElementById('topic-category-id').value=${categoryId}; openModal('modal-add-topic');"><i class="fa-solid fa-pen"></i> Creează Subiect</button>` : `<button class="btn btn-glass" style="color: var(--x-cyan);" onclick="openModal('modal-login')">Conectează-te pt a scrie</button>`}
        </div>
      </div>
    `;

    if (!data.topics || data.topics.length === 0) {
      html += '<div style="color: var(--x-text-muted);">Nu există subiecte în această categorie.</div>';
    } else {
      html += data.topics.map(t => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--x-border); border-radius: var(--x-radius-md); padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1.5rem; margin-bottom: 0.8rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--x-cyan)'" onmouseout="this.style.borderColor='var(--x-border)'" onclick="openForumTopic(${t.id}, '${t.title}', ${categoryId}, '${categoryTitle}')">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--x-bg); border: 2px solid var(--x-cyan); display: flex; align-items: center; justify-content: center; color: white;">
            <i class="fa-solid fa-user"></i>
          </div>
          <div style="flex: 1;">
            <h3 style="color: white; font-size: 1.1rem; margin-bottom: 0.3rem;">${t.title}</h3>
            <div style="color: var(--x-text-muted); font-size: 0.85rem;">Autor: <span style="color: var(--x-gold);">${t.author_name}</span> | Vizionări: ${t.views}</div>
          </div>
          <button class="btn btn-glass" style="font-size: 0.8rem;">Citește</button>
        </div>
      `).join('');
    }
    
    container.innerHTML = html;
  } catch (err) {
    console.error('Error opening category:', err);
  }
}

async function openForumTopic(topicId, topicTitle, catId, catTitle) {
  try {
    const res = await fetch(`/api/forum/posts/${topicId}`);
    const data = await res.json();
    const container = document.getElementById('forum-categories-container');
    
    let html = `
      <div style="margin-bottom: 1.5rem;">
        <button class="btn btn-glass" style="margin-bottom: 1rem;" onclick="openForumCategory(${catId}, '${catTitle}')"><i class="fa-solid fa-arrow-left"></i> Inapoi la Categorie</button>
        ${currentUser && (currentUser.adminLvl > 0 || currentUser.site_rank === 'Admin Supreme' || currentUser.site_rank === 'Manager Panel') ? `<button class="btn btn-glass" style="margin-bottom: 1rem; margin-left: 1rem; border-color: var(--x-danger); color: var(--x-danger);" onclick="deleteForumTopic(${topicId}, ${catId}, '${catTitle}')"><i class="fa-solid fa-trash"></i> Șterge Subiectul</button>` : ''}
        <h2 style="color: white; font-size: 1.6rem;"><i class="fa-solid fa-file-lines" style="color: var(--x-cyan);"></i> ${topicTitle}</h2>
      </div>
    `;

    if (data.posts) {
      html += data.posts.map(p => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--x-border); border-radius: var(--x-radius-md); padding: 1.5rem; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--x-border); padding-bottom: 0.8rem;">
            <div style="width: 45px; height: 45px; border-radius: 50%; background: var(--x-bg); border: 2px solid var(--x-gold); display: flex; align-items: center; justify-content: center; color: white;"><i class="fa-solid fa-user"></i></div>
            <div>
              <div style="color: var(--x-gold); font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span style="cursor: pointer; text-decoration: underline;" onclick="switchView('profile', ${p.author_id})">${p.author_name}</span>
              </div>
              <div style="color: var(--x-text-muted); font-size: 0.8rem;">${new Date(p.created_at).toLocaleString()}</div>
            </div>
            <div style="margin-left: auto; display: flex; gap: 0.5rem;">
              <button class="btn btn-glass" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; display: ${currentUser && currentUser.adminLvl > 0 ? 'inline-block' : 'none'}; border-color: var(--x-danger); color: var(--x-danger);" onclick="adminQuickSanction(${p.author_id}, 'mute', 'Limbaj Forum')">MUTE</button>
              <button class="btn btn-glass" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; display: ${currentUser && currentUser.adminLvl > 0 ? 'inline-block' : 'none'}; border-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.1);" onclick="adminQuickSanction(${p.author_id}, 'ban', 'Abuz Forum')">BAN</button>
              <button class="btn btn-glass" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; display: ${currentUser && (currentUser.adminLvl > 0 || currentUser.site_rank === 'Admin Supreme' || currentUser.site_rank === 'Manager Panel') ? 'inline-block' : 'none'}; border-color: var(--x-pink); color: var(--x-pink);" onclick="deleteForumPost(${p.id}, ${topicId}, '${topicTitle}', ${catId}, '${catTitle}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
          <div style="color: var(--x-text-body); line-height: 1.6;">${p.content}</div>
        </div>
      `).join('');
    }

    if (token) {
      html += `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--x-border); border-radius: var(--x-radius-md); padding: 1.5rem; margin-top: 2rem;">
          <h3 style="color: white; font-family: 'Space Grotesk', sans-serif; margin-bottom: 1rem;">Lasă un Răspuns</h3>
          <textarea id="forum-reply-content" class="form-input" style="height: 100px; margin-bottom: 1rem;" placeholder="Scrie mesajul tău aici..."></textarea>
          <button class="btn btn-pink glow-btn" onclick="submitForumReply(${topicId}, ${catId}, '${catTitle}', '${topicTitle}')">POSTEAZĂ RĂSPUNS</button>
        </div>
      `;
    } else {
      html += `<div style="text-align: center; margin-top: 2rem;"><button class="btn btn-glass" onclick="openModal('modal-login')">Conectează-te pentru a răspunde</button></div>`;
    }

    container.innerHTML = html;
  } catch (err) {
    console.error('Error loading topic:', err);
  }
}

async function submitForumTopic(e) {
  e.preventDefault();
  const catId = document.getElementById('topic-category-id').value;
  const title = document.getElementById('topic-title').value;
  const content = document.getElementById('topic-content').value;
  
  try {
    const res = await fetch('/api/forum/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ category_id: catId, title, content })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    showToast('Subiect creat cu succes!', 'success');
    closeModal('modal-add-topic');
    // For simplicity, we just reload the main forum categories view, or we could reload the category.
    loadForum();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitForumReply(topicId, catId, catTitle, topicTitle) {
  const content = document.getElementById('forum-reply-content').value;
  try {
    const res = await fetch('/api/forum/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ topic_id: topicId, content })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Răspuns adăugat!', 'success');
    openForumTopic(topicId, topicTitle, catId, catTitle);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadGallery() {
  try {
    const res = await fetch('/api/gallery');
    const data = await res.json();
    const container = document.getElementById('gallery-container');

    const isAdmin = currentUser && (currentUser.adminLvl > 0 || currentUser.site_rank === 'Admin Supreme' || currentUser.site_rank === 'Manager Panel');
    const topBar = isAdmin ? `<div style="text-align: right; margin-bottom: 1.5rem;"><button class="btn btn-pink glow-btn" onclick="openModal('modal-add-gallery')"><i class="fa-solid fa-upload"></i> Încarcă Poză</button></div>` : '';

    if (!data.gallery || data.gallery.length === 0) {
      container.innerHTML = topBar + '<div style="color: var(--x-text-muted); text-align: center; padding: 3rem;"><i class="fa-solid fa-images" style="font-size: 3rem; margin-bottom: 1rem; display: block; opacity: 0.3;"></i>Nu există imagini în galerie.</div>';
      return;
    }

    let gridHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">` + data.gallery.map(g => `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--x-border); border-radius: var(--x-radius-md); overflow: hidden;">
        <div style="height: 180px; background: url('${g.image_url}') center/cover; border-bottom: 1px solid var(--x-border);"></div>
        <div style="padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <div style="color: white; font-weight: 700; margin-bottom: 0.5rem; font-size: 1rem;">${g.description || 'Imagine'}</div>
              <div style="color: var(--x-text-muted); font-size: 0.8rem;">Adăugat de: <span style="color: var(--x-cyan); cursor: pointer; text-decoration: underline;" onclick="switchView('profile', ${g.uploader_id})">${g.uploader_name}</span></div>
            </div>
            ${isAdmin ? `<button class="btn btn-glass" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border-color: var(--x-danger); color: var(--x-danger);" onclick="deleteGalleryImage(${g.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
          </div>
        </div>
      </div>
    `).join('') + `</div>`;
    container.innerHTML = topBar + gridHTML;
  } catch (err) {
    console.error('Error loading gallery:', err);
  }
}

async function submitGallery(e) {
  e.preventDefault();
  const form = document.getElementById('form-add-gallery');
  const formData = new FormData(form);
  try {
    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Poză adăugată cu succes!', 'success');
    closeModal('modal-add-gallery');
    loadGallery();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadStaffTeam() {
  try {
    const res = await fetch('/api/staff-team');
    const data = await res.json();
    const container = document.getElementById('staff-team-container');
    if (!data.staff || data.staff.length === 0) {
      container.innerHTML = '<div style="color: var(--x-text-muted);">Echipa staff nu este publică momentan.</div>';
      return;
    }
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">
        ${data.staff.map(s => `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--x-border); border-radius: var(--x-radius-md); padding: 1.5rem; text-align: center;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--x-bg); border: 2px solid var(--x-pink); margin: 0 auto 1rem auto; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem;">
              ${s.avatar_url ? `<img src="${s.avatar_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : `<i class="fa-solid fa-user-shield"></i>`}
            </div>
            <h3 style="color: white; font-size: 1.2rem; margin-bottom: 0.3rem;">${s.member_name}</h3>
            <div style="color: var(--x-pink); font-size: 0.9rem; font-weight: 700; margin-bottom: 0.8rem;">${s.role}</div>
            <div style="color: var(--x-text-muted); font-size: 0.85rem; line-height: 1.5;">${s.description || 'Membru al echipei administrative.'}</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Error loading staff team:', err);
  }
}

// ==========================================
// ADMIN PANEL LOGIC (VIPURI)
// ==========================================

function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
  
  const tabBtn = Array.from(document.querySelectorAll('.admin-tab-item')).find(el => el.getAttribute('onclick').includes(tabId));
  if (tabBtn) tabBtn.classList.add('active');
  
  const content = document.getElementById(tabId);
  if (content) content.style.display = 'block';

  if (tabId === 'admin-tab-apps') {
    loadAdminAppsList();
  } else if (tabId === 'admin-tab-staff') {
    loadAdminStaffManager();
  } else if (tabId === 'admin-tab-roles-apps') {
    loadAdminAppStatuses();
    loadAdminRoles();
  }
}

// ROLES & APP STATUS
let currentAppStatuses = {};
let currentRoles = [];

async function loadAdminAppStatuses() {
  try {
    const res = await fetch('/api/admin/app-status');
    const data = await res.json();
    currentAppStatuses = data.appStatus || {};
    
    let html = '';
    for (const [appType, isOpen] of Object.entries(currentAppStatuses)) {
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 6px;">
          <div style="color: white; font-weight: 600;">${appType}</div>
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input type="checkbox" id="app-toggle-${appType}" ${isOpen ? 'checked' : ''}>
            <span style="color: ${isOpen ? 'var(--x-success)' : 'var(--x-danger)'}; font-weight: bold;" id="app-label-${appType}">
              ${isOpen ? 'DESCHIS' : 'ÎNCHIS'}
            </span>
          </label>
        </div>
      `;
    }
    document.getElementById('admin-app-status-list').innerHTML = html;

    for (const appType of Object.keys(currentAppStatuses)) {
      const chk = document.getElementById(`app-toggle-${appType}`);
      chk.addEventListener('change', (e) => {
        const lbl = document.getElementById(`app-label-${appType}`);
        if (e.target.checked) {
          lbl.innerText = 'DESCHIS';
          lbl.style.color = 'var(--x-success)';
        } else {
          lbl.innerText = 'ÎNCHIS';
          lbl.style.color = 'var(--x-danger)';
        }
      });
    }
  } catch (err) {
    console.error('Error loading app statuses', err);
  }
}

async function adminSaveAppStatuses() {
  const newStatuses = {};
  for (const appType of Object.keys(currentAppStatuses)) {
    const chk = document.getElementById(`app-toggle-${appType}`);
    if (chk) newStatuses[appType] = chk.checked;
  }
  
  try {
    const res = await fetch('/api/admin/app-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('s4g_token')}` },
      body: JSON.stringify({ statuses: newStatuses })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(data.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAdminRoles() {
  try {
    const res = await fetch('/api/admin/roles', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('s4g_token')}` }
    });
    const data = await res.json();
    currentRoles = data.roles || [];
  } catch (err) {
    console.error('Error loading roles', err);
  }
}

async function adminSaveRole() {
  const name = document.getElementById('admin-role-name').value;
  if (!name) return showToast('Introdu numele rolului!', 'error');
  
  const checkboxes = document.querySelectorAll('#admin-role-permissions-list input[type="checkbox"]');
  const permissions = [];
  checkboxes.forEach(chk => {
    if (chk.checked) permissions.push(chk.value);
  });
  
  try {
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('s4g_token')}` },
      body: JSON.stringify({ name, permissions })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(data.message, 'success');
    loadAdminRoles();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// RULES EDITOR
async function loadAdminRuleEditor(category) {
  try {
    const res = await fetch(`/api/rules/${category}`);
    const data = await res.json();
    if (!data.rules || data.rules.length === 0) {
      document.getElementById('admin-rule-raw-content').value = '### Capitol Nou\n\nAdaugă conținut aici...';
    } else {
      const content = data.rules.map(r => r.content).join('\n\n');
      document.getElementById('admin-rule-raw-content').value = content;
    }
    document.getElementById('admin-rule-editor-title').innerText = category.toUpperCase();
    updateAdminRulePreview();
  } catch (err) {
    console.error(err);
  }
}

function updateAdminRulePreview() {
  const raw = document.getElementById('admin-rule-raw-content').value;
  let html = raw;
  html = html.replace(/### (.*)/g, '<h3 style="color:white; margin-top:1.5rem; font-size:1.6rem; border-bottom:1px solid var(--x-border); padding-bottom:0.5rem;">$1</h3>');
  html = html.replace(/- (\d+\.\d+) (.*?)\n/g, '<div style="margin-top:1rem; margin-bottom:0.4rem; color:var(--x-pink); font-weight:800; font-size:1.1rem;">• $1 $2</div>\n');
  
  html = html.replace(/\[CP (\d+)\]/g, '<span class="badge badge-cp">📍 $1 Luni CP</span>');
  html = html.replace(/\[AMENDA (\d+)\]/g, '<span class="badge badge-amenda">💵 AMENDĂ $1$</span>');
  html = html.replace(/\[INCHISOARE (\d+)\]/g, '<span class="badge badge-inchisoare">🔒 $1 Luni</span>');
  html = html.replace(/\[WARN\]/g, '<span class="badge badge-warn">⚠️ WARN F/L</span>');

  document.getElementById('admin-rule-live-preview').innerHTML = html;
}

async function saveAdminRuleChanges() {
  showToast('Regulamentul a fost salvat cu succes!', 'success');
}

// APPLICATIONS MANAGER
async function loadAdminAppsList() {
  const container = document.getElementById('admin-apps-list');
  container.innerHTML = '<div style="color: var(--x-text-muted); padding: 1rem;">Se încarcă aplicațiile...</div>';
  try {
    const res = await fetch('/api/admin/applications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      if (!data.applications || data.applications.length === 0) {
        container.innerHTML = '<div style="color: var(--x-text-muted); padding: 2rem; text-align: center;"><i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>Nu există aplicații pentru tine momentan.</div>';
        return;
      }

      // Group by status
      const pending = data.applications.filter(a => a.status === 'In Asteptare');
      const processed = data.applications.filter(a => a.status !== 'In Asteptare');

      const renderCard = (app) => {
        const statusColor = app.status === 'Acceptat' ? '#10b981' : app.status === 'Respins' ? '#ef4444' : '#f59e0b';
        const statusIcon = app.status === 'Acceptat' ? 'fa-check-circle' : app.status === 'Respins' ? 'fa-times-circle' : 'fa-clock';
        const rawDate = app.created_at;
        let dateStr = '-';
        if (rawDate) {
          const d = new Date(rawDate);
          dateStr = isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ro-RO');
        }
        return `
        <div onclick="openAppDetailModal(${app.id})" style="cursor:pointer; background: rgba(255,255,255,0.02); border: 1px solid var(--x-border); border-left: 4px solid ${statusColor}; padding: 1.2rem 1.5rem; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.02)'">
          <div>
            <div style="color: white; font-weight: 700; font-size: 1.1rem;">${app.app_type}</div>
            <div style="color: var(--x-text-muted); font-size: 0.85rem; margin-top: 0.3rem;">
              <i class="fa-solid fa-user" style="color: var(--x-pink);"></i> ${app.username || 'Necunoscut'} &nbsp;|&nbsp;
              <i class="fa-solid fa-calendar" style="color: var(--x-cyan);"></i> ${dateStr}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap: 1rem;">
            <span style="color: ${statusColor}; font-weight: 700; font-size: 0.85rem;"><i class="fa-solid ${statusIcon}"></i> ${app.status}</span>
            <i class="fa-solid fa-chevron-right" style="color: var(--x-text-muted);"></i>
          </div>
        </div>`;
      };

      let html = '';
      if (pending.length > 0) {
        html += `<div style="color: var(--x-gold); font-weight:700; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.8rem; margin-top: 0.5rem;"><i class="fa-solid fa-clock"></i> În Așteptare (${pending.length})</div>`;
        html += pending.map(renderCard).join('');
      }
      if (processed.length > 0) {
        html += `<div style="color: var(--x-text-muted); font-weight:700; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.8rem; margin-top: 1.5rem;"><i class="fa-solid fa-history"></i> Procesate (${processed.length})</div>`;
        html += processed.map(renderCard).join('');
      }

      container.innerHTML = `<div style="display: flex; flex-direction: column; gap: 0.7rem;">${html}</div>`;

      // Store apps in global for modal lookup
      window._adminAppsCache = data.applications;

    } else {
      container.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Eroare: ${data.error}</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Eroare: ${err.message}</div>`;
  }
}

function openAppDetailModal(appId) {
  const app = (window._adminAppsCache || []).find(a => a.id === appId);
  if (!app) return;

  const statusColor = app.status === 'Acceptat' ? '#10b981' : app.status === 'Respins' ? '#ef4444' : '#f59e0b';

  let answersHtml = '';
  try {
    let ans = app.answers;
    if (typeof ans === 'string') ans = JSON.parse(ans);
    if (Array.isArray(ans)) {
      answersHtml = ans.map((a, i) => `
        <div style="margin-bottom: 1.2rem;">
          <div style="color: var(--x-pink); font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem;">Întrebarea ${i + 1}: ${a.question || a.q || ''}</div>
          <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--x-border); padding: 0.8rem 1rem; border-radius: 8px; color: white; font-size: 0.95rem; line-height: 1.6; word-break: break-word; white-space: pre-wrap; overflow-wrap: break-word;">${a.answer || a.a || a}</div>
        </div>`).join('');
    } else if (typeof ans === 'object') {
      answersHtml = Object.entries(ans).map(([q, a]) => `
        <div style="margin-bottom: 1.2rem;">
          <div style="color: var(--x-pink); font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem;">${q}</div>
          <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--x-border); padding: 0.8rem 1rem; border-radius: 8px; color: white; font-size: 0.95rem; line-height: 1.6; word-break: break-word; white-space: pre-wrap; overflow-wrap: break-word;">${a}</div>
        </div>`).join('');
    } else {
      answersHtml = `<div style="color: var(--x-text-body);">${ans}</div>`;
    }
  } catch(e) {
    answersHtml = `<div style="color: var(--x-text-body);">${app.answers}</div>`;
  }

  const modalHtml = `
    <div style="margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
        <div>
          <h3 style="color: white; font-family: 'Space Grotesk', sans-serif; font-size: 1.4rem; margin-bottom: 0.4rem;">${app.app_type}</h3>
          <div style="color: var(--x-text-muted); font-size: 0.9rem;">
            <i class="fa-solid fa-user" style="color: var(--x-pink);"></i> <strong style="color: var(--x-pink);">${app.username || 'Necunoscut'}</strong> &nbsp;|&nbsp;
            <i class="fa-solid fa-id-card" style="color: var(--x-cyan);"></i> Nume RP: <strong style="color: white;">${app.name_rp || '-'}</strong> &nbsp;|&nbsp;
            <i class="fa-solid fa-calendar"></i> Vârstă: <strong style="color: white;">${app.age || '-'}</strong>
          </div>
        </div>
        <span style="color: ${statusColor}; font-weight: 700; font-size: 0.9rem; background: ${statusColor}22; padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid ${statusColor}44;">${app.status}</span>
      </div>
      <div style="border-top: 1px solid var(--x-border); padding-top: 1.5rem;">
        <div style="color: var(--x-text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1rem;"><i class="fa-solid fa-list"></i> Răspunsuri Aplicație</div>
        ${answersHtml}
      </div>
    </div>
    ${app.status === 'In Asteptare' ? `
    <div style="display: flex; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--x-border);">
      <button class="btn" style="flex:1; background: #10b981; color: white; border: none; padding: 0.8rem;" onclick="handleAdminAppAction(${app.id}, 'accept')"><i class="fa-solid fa-check"></i> ACCEPTĂ APLICAȚIA</button>
      <button class="btn btn-glass" style="flex:1; color: #ef4444; border-color: #ef4444; padding: 0.8rem;" onclick="handleAdminAppAction(${app.id}, 'deny')"><i class="fa-solid fa-xmark"></i> RESPINGE APLICAȚIA</button>
    </div>` : ''}
  `;

  document.getElementById('app-detail-modal-body').innerHTML = modalHtml;
  openModal('modal-app-detail');
}

function formatAppAnswers(ansStr) {
  try {
    let ans = ansStr;
    if (typeof ans === 'string') ans = JSON.parse(ans);
    if (Array.isArray(ans)) {
      return ans.map((a, i) => `<div style="margin-bottom: 0.5rem;"><span style="color: var(--x-pink); font-weight: bold;">Î${i+1}:</span> ${a.question || ''}<br><span style="color: white;">R: ${a.answer || a}</span></div>`).join('');
    } else if (typeof ans === 'object') {
      return Object.entries(ans).map(([q, a]) => `<div style="margin-bottom: 0.5rem;"><span style="color: var(--x-pink); font-weight: bold;">${q}:</span> ${a}</div>`).join('');
    }
    return String(ansStr);
  } catch(e) {
    return String(ansStr);
  }
}

// Custom confirm dialog state
let _confirmCallback = null;

function showConfirmDialog(message, onConfirm) {
  _confirmCallback = onConfirm;
  document.getElementById('confirm-dialog-message').innerText = message;
  openModal('modal-confirm-dialog');
}

function confirmDialogYes() {
  closeModal('modal-confirm-dialog');
  if (_confirmCallback) _confirmCallback();
  _confirmCallback = null;
}

function confirmDialogNo() {
  closeModal('modal-confirm-dialog');
  _confirmCallback = null;
}

async function handleAdminAppAction(id, action) {
  const label = action === 'accept' ? 'accepți' : 'respingi';
  showConfirmDialog(`Ești sigur că vrei să ${label} această aplicație?`, async () => {
    try {
      const res = await fetch(`/api/applications/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message || 'Acțiune procesată!', 'success');
      closeModal('modal-app-detail');
      loadAdminAppsList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// --- WEB PANEL USER PROFILE ---
async function loadWebUserProfile(userId) {
  if (!userId) userId = currentUser.user_id || currentUser.id;
  try {
    const res = await fetch(`/api/users/${userId}/profile`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('s4g_token')}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const u = data.user;
    document.getElementById('profile-avatar').innerText = u.username.charAt(0).toUpperCase();
    document.getElementById('profile-username').innerText = u.username;
    document.getElementById('profile-email').innerText = u.email;
    document.getElementById('profile-rank').innerText = u.site_rank;

    // Applications
    const appsTbody = document.getElementById('profile-apps-table');
    if (data.applications.length === 0) {
      appsTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--x-text-muted);">Nicio aplicație.</td></tr>';
    } else {
      appsTbody.innerHTML = data.applications.map(a => `
        <tr>
          <td style="color: white; font-weight: bold;">${a.app_type}</td>
          <td>${a.age} ani</td>
          <td>
            <span class="badge ${a.status === 'Acceptat' ? 'badge-success' : a.status === 'Respins' ? 'badge-danger' : 'badge-warning'}">
              ${a.status}
            </span>
          </td>
        </tr>
      `).join('');
    }

    // Sanctions
    const sancTbody = document.getElementById('profile-sanctions-table');
    if (data.sanctions.length === 0) {
      sancTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--x-success);">Nicio sancțiune. Ești curat!</td></tr>';
    } else {
      sancTbody.innerHTML = data.sanctions.map(s => `
        <tr>
          <td style="color: var(--x-danger); font-weight: bold; text-transform: uppercase;">${s.type}</td>
          <td>${s.reason}</td>
          <td>${s.admin_name}</td>
          <td style="font-size: 0.85rem;">${new Date(s.created_at).toLocaleString()}</td>
        </tr>
      `).join('');
    }

    // Forum Activity
    const forumBox = document.getElementById('profile-forum-activity');
    if (data.topics.length === 0 && data.replies.length === 0) {
      forumBox.innerHTML = '<p style="color: var(--x-text-muted);">Nicio activitate recentă pe forum.</p>';
    } else {
      let html = '';
      data.topics.forEach(t => {
        html += `
          <div style="background: rgba(255,255,255,0.02); border-left: 2px solid var(--x-gold); padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px;">
            <div style="font-size: 0.8rem; color: var(--x-gold); margin-bottom: 0.3rem;"><i class="fa-solid fa-pen"></i> A creat subiect nou</div>
            <div style="color: white; font-weight: bold;">${t.title}</div>
            <div style="color: var(--x-text-muted); font-size: 0.85rem;">${new Date(t.created_at).toLocaleString()}</div>
          </div>
        `;
      });
      data.replies.forEach(r => {
        html += `
          <div style="background: rgba(255,255,255,0.02); border-left: 2px solid var(--x-pink); padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px;">
            <div style="font-size: 0.8rem; color: var(--x-pink); margin-bottom: 0.3rem;"><i class="fa-solid fa-reply"></i> A răspuns la un subiect</div>
            <div style="color: white; font-size: 0.9rem;">"${r.content.substring(0, 80)}${r.content.length > 80 ? '...' : ''}"</div>
            <div style="color: var(--x-text-muted); font-size: 0.85rem;">${new Date(r.created_at).toLocaleString()}</div>
          </div>
        `;
      });
      forumBox.innerHTML = html;
    }

  } catch (err) {
    console.error(err);
    showToast('Eroare încărcare profil.', 'error');
  }
}

async function adminQuickSanction(targetId, type, reason) {
  if (!confirm(`Ești sigur că vrei să îi dai ${type.toUpperCase()} acestui utilizator?`)) return;
  
  try {
    const res = await fetch('/api/admin/sanction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('s4g_token')}` },
      body: JSON.stringify({ target_id: targetId, type, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    showToast(data.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- DELETION FUNCTIONS (ADMIN ONLY) ---
async function deleteGalleryImage(id) {
  if (!confirm('Ești sigur că vrei să ștergi această poză?')) return;
  try {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Eroare ștergere.');
    showToast('Poza a fost ștearsă.', 'success');
    loadGallery();
  } catch(err) {
    showToast(err.message, 'error');
  }
}

async function deleteNews(id) {
  if (!confirm('Ești sigur că vrei să ștergi această noutate?')) return;
  try {
    const res = await fetch(`/api/news/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Eroare ștergere.');
    showToast('Noutatea a fost ștearsă.', 'success');
    loadNews();
  } catch(err) {
    showToast(err.message, 'error');
  }
}

async function deleteForumTopic(id, catId, catTitle) {
  if (!confirm('Ești sigur că vrei să ștergi ACEST SUBIECT și toate răspunsurile sale?')) return;
  try {
    const res = await fetch(`/api/forum/topics/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Eroare ștergere.');
    showToast('Subiectul a fost șters.', 'success');
    openForumCategory(catId, catTitle);
  } catch(err) {
    showToast(err.message, 'error');
  }
}

async function deleteForumPost(id, topicId, topicTitle, catId, catTitle) {
  if (!confirm('Ești sigur că vrei să ștergi acest răspuns?')) return;
  try {
    const res = await fetch(`/api/forum/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Eroare ștergere.');
    showToast('Răspunsul a fost șters.', 'success');
    openForumTopic(topicId, topicTitle, catId, catTitle);
  } catch(err) {
    showToast(err.message, 'error');
  }
}

async function loadAdminStaffManager() {
  const container = document.getElementById('admin-staff-manager-table');
  if (!container) return;
  try {
    const res = await fetch('/api/admin/staff', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.staff || data.staff.length === 0) {
      container.innerHTML = '<div style="padding: 1rem; color: var(--x-text-muted);">Niciun membru staff găsit.</div>';
      return;
    }
    
    const rolesRes = await fetch('/api/admin/roles', { headers: { 'Authorization': `Bearer ${token}` } });
    const rolesData = await rolesRes.json();
    const roles = rolesData.roles || [];

    let html = data.staff.map(u => `
      <tr>
        <td style="color: white; font-weight: 700; cursor: pointer;" onclick="switchView('profile', ${u.id})">${u.username}</td>
        <td style="color: var(--x-text-muted); font-size: 0.85rem;">${u.email || '-'}</td>
        <td>
          <select class="form-input" style="padding: 0.3rem; font-size: 0.85rem;" onchange="updateUserSiteRank(${u.id}, this.value)">
            <option value="User" ${u.site_rank === 'User' ? 'selected' : ''}>User (Jucător)</option>
            ${roles.map(r => `<option value="${r.name}" ${u.site_rank === r.name ? 'selected' : ''}>${r.name}</option>`).join('')}
            <option value="Admin Supreme" ${u.site_rank === 'Admin Supreme' ? 'selected' : ''}>Admin Supreme</option>
            <option value="Manager Panel" ${u.site_rank === 'Manager Panel' ? 'selected' : ''}>Manager Panel</option>
          </select>
        </td>
        <td style="color: var(--x-cyan);">${u.faction || '-'}</td>
        <td style="text-align: right;"><button class="btn btn-glass" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border-color: var(--x-danger); color: var(--x-danger);" onclick="openAdvancedSanctions(${u.id})"><i class="fa-solid fa-gavel"></i> Acțiuni</button></td>
      </tr>
    `).join('');
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="padding: 1rem; color: var(--x-danger);">Eroare: ${err.message}</div>`;
  }
}

function openAdvancedSanctions(id) {
  document.getElementById('sanction-target-id').value = id;
  document.getElementById('sanction-duration-hours').value = '';
  openModal('modal-advanced-sanctions');
}

async function submitAdvancedSanction(action) {
  const targetId = document.getElementById('sanction-target-id').value;
  const value = document.getElementById('sanction-duration-hours').value;

  if ((action === 'temp_ban' || action === 'temp_mute') && !value) {
    showToast('Te rog introdu numărul de ore pentru suspendare.', 'error');
    return;
  }

  showConfirmDialog('Ești sigur că vrei să aplici această sancțiune?', async () => {
    try {
      const res = await fetch('/api/admin/advanced-sanction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ target_id: targetId, action, value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare sancționare.');
      showToast(data.message, 'success');
      closeModal('modal-advanced-sanctions');
      loadAdminStaffManager();
    } catch(err) {
      showToast(err.message, 'error');
    }
  });
}

function filterAdminUsers() {
  const input = document.getElementById('admin-user-search').value.toLowerCase();
  const rows = document.querySelectorAll('#admin-staff-manager-table > div');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    if (text.includes(input)) {
      row.style.display = 'grid';
    } else {
      row.style.display = 'none';
    }
  });
}
