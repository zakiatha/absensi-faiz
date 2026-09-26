/**
 * E-ABSENSI ASRAMA PUTRA - MAIN APPLICATION LOGIC
 * High-performance, tactile, mobile-friendly application controller.
 * Hardened with OWASP Security Standards (XSS, Injection, Auth & Integrity Defense).
 */

class AbsensiApp {
  constructor() {
    this.currentUser = null;
    this.currentView = 'view-dashboard';
    this.activeAbsenState = {}; // Mapping studentId -> { status, note }
    this.audioCtx = null;

    this.init();
  }

  init() {
    this.initTheme();
    this.initAuth();
    this.setupEventListeners();
    this.setupDatePickers();
    this.setupCloudSyncUI();
    this.renderActiveUser();

    // Check if logged in
    if (!this.currentUser) {
      this.switchView('view-login');
    } else {
      this.switchView('view-dashboard');
      this.renderDashboard();
    }
  }

  // --- AUDIO SYNTHESIZER (Web Audio API - Offline & Tactile) ---
  playHaptic(ms = 35) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) {
        // ignore
      }
    }
  }

  playAudioFeedback(type = 'click') {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  // --- THEME CONTROLLER ---
  initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    this.setTheme(savedTheme);

    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
        this.playAudioFeedback('click');
      });
    }
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    const iconSun = document.getElementById('icon-theme-sun');
    const iconMoon = document.getElementById('icon-theme-moon');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (theme === 'dark') {
      if (iconSun) iconSun.style.display = 'block';
      if (iconMoon) iconMoon.style.display = 'none';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#090d16');
    } else {
      if (iconSun) iconSun.style.display = 'none';
      if (iconMoon) iconMoon.style.display = 'block';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#1e40af');
    }
  }

  // --- SUPABASE CLOUD SYNC UI & HANDLERS ---
  setupCloudSyncUI() {
    if (window.SupabaseSync) {
      window.SupabaseSync.onStatusChange((status, lastSync) => {
        const dot = document.getElementById('cloud-status-dot');
        const label = document.getElementById('cloud-status-label');
        const btn = document.getElementById('btn-cloud-sync');
        if (!dot || !label) return;

        dot.className = 'cloud-dot ' + status;
        if (status === 'connected') {
          label.textContent = 'Cloud Aktif';
          if (btn) btn.title = `Supabase Terhubung (${lastSync ? 'Sinkron: ' + lastSync.toLocaleTimeString('id-ID') : 'Aktif'}). Klik untuk sinkron ulang.`;
        } else if (status === 'syncing') {
          label.textContent = 'Sinkron...';
          if (btn) btn.title = 'Sedang menyinkronkan data dengan Supabase...';
        } else if (status === 'checking') {
          label.textContent = 'Cek Cloud...';
          if (btn) btn.title = 'Memeriksa koneksi Supabase...';
        } else {
          label.textContent = 'Lokal (Offline)';
          if (btn) btn.title = 'Berjalan dalam mode lokal (Offline). Klik untuk coba hubungkan ke Supabase.';
        }
      });

      const btnCloudSync = document.getElementById('btn-cloud-sync');
      if (btnCloudSync) {
        btnCloudSync.addEventListener('click', async () => {
          this.playHaptic(40);
          this.showToast('Memeriksa koneksi & sinkronisasi Supabase...', 'info');
          const connected = await window.SupabaseSync.checkConnection();
          if (connected) {
            const res = await window.SupabaseSync.pullAllFromSupabase(window.store);
            if (res.success) {
              this.showToast('Data berhasil disinkronkan dengan Supabase Cloud!', 'success');
              this.onCloudSyncComplete();
            } else {
              this.showToast('Gagal menarik data dari Supabase: ' + (res.error || 'Unknown error'), 'error');
            }
          } else {
            this.showToast('Koneksi Supabase belum aktif. Pastikan tabel di SQL Editor sudah dibuat.', 'warning');
          }
        });
      }

      // Hook admin cloud sync button
      const btnAdminSync = document.getElementById('btn-admin-sync-cloud');
      if (btnAdminSync) {
        btnAdminSync.addEventListener('click', async () => {
          this.playHaptic(50);
          this.showToast('Memulai sinkronisasi data lokal ke Supabase...', 'info');
          const connected = await window.SupabaseSync.checkConnection();
          if (!connected) {
            this.showToast('Koneksi ke Supabase gagal atau tabel belum dibuat di SQL Editor.', 'error');
            return;
          }
          const pushRes = await window.SupabaseSync.pushAllToSupabase(window.store);
          if (pushRes.success) {
            this.showToast('Seluruh data lokal berhasil diunggah ke Supabase Cloud!', 'success');
          } else {
            this.showToast('Gagal mengunggah data: ' + (pushRes.error || 'Unknown error'), 'error');
          }
        });
      }
    }
  }

  onCloudSyncComplete() {
    if (this.currentView === 'view-dashboard') {
      this.renderDashboard();
    } else if (this.currentView === 'view-admin') {
      this.renderAdminView();
    } else if (this.currentView === 'view-rekap') {
      this.renderRekapView();
    } else if (this.currentView === 'view-absen') {
      this.loadStudentListForAttendance();
    }
  }

  // --- AUTHENTICATION & DEFENSIVE RATE LIMITING ---
  initAuth() {
    const rawUser = localStorage.getItem(CURRENT_USER_KEY);
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        // Exclude any password or hash from memory session
        const { password, passwordHash, ...safeUser } = user;
        this.currentUser = safeUser;
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  async login(username, password) {
    // 1. Check Rate Limiter (Brute-force protection)
    if (window.loginLimiter) {
      const lockSeconds = window.loginLimiter.isLocked();
      if (lockSeconds) {
        this.showToast(`Terlalu banyak percobaan gagal! Mohon tunggu ${lockSeconds} detik.`, 'error');
        this.playHaptic(80);
        return false;
      }
    }

    // 2. Validate input format
    const cleanU = (username || '').trim();
    if (window.SecurityUtils) {
      const vUser = window.SecurityUtils.validateInput(cleanU, 'username', 30);
      if (!vUser.valid) {
        this.showToast(vUser.message, 'error');
        return false;
      }
    }

    const user = window.store.getUser(cleanU);
    if (!user) {
      if (window.loginLimiter) window.loginLimiter.recordFailure();
      this.showToast('Username atau password tidak cocok!', 'error');
      return false;
    }

    if (user.status === 'inactive') {
      this.showToast('Akun Anda dinonaktifkan oleh Administrator. Hubungi Admin Pusat untuk akses.', 'error');
      return false;
    }

    // 3. Cryptographic Verification
    const isMatch = await window.store.verifyPassword(password, user);
    if (!isMatch) {
      let attempts = 1;
      if (window.loginLimiter) attempts = window.loginLimiter.recordFailure();
      this.showToast(`Password salah! (Percobaan ${attempts}/5)`, 'error');
      return false;
    }

    // Reset rate limiter on successful authentication
    if (window.loginLimiter) window.loginLimiter.recordSuccess();

    // Store sanitized session (no password/hash in session storage)
    const { password: p, passwordHash: ph, ...safeSessionUser } = user;
    this.currentUser = safeSessionUser;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeSessionUser));

    this.showToast(`Selamat datang, ${user.name}!`, 'success');
    this.playAudioFeedback('success');
    this.renderActiveUser();
    this.switchView('view-dashboard');
    this.renderDashboard();
    return true;
  }

  async register(userData) {
    if (window.SecurityUtils) {
      const vUser = window.SecurityUtils.validateInput(userData.username, 'username', 30);
      if (!vUser.valid) {
        this.showToast(`Username: ${vUser.message}`, 'error');
        return false;
      }
      const vName = window.SecurityUtils.validateInput(userData.name, 'text', 80);
      if (!vName.valid) {
        this.showToast(`Nama: ${vName.message}`, 'error');
        return false;
      }
      if (!userData.password || userData.password.length < 6) {
        this.showToast('Kata sandi minimal 6 karakter!', 'error');
        return false;
      }
    }

    if (window.store.getUser(userData.username)) {
      this.showToast('Username sudah dipakai, gunakan username lain!', 'error');
      return false;
    }

    await window.store.saveUser(userData);

    const { password: p, passwordHash: ph, ...safeSessionUser } = userData;
    this.currentUser = safeSessionUser;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeSessionUser));

    this.showToast('Pendaftaran akun berhasil!', 'success');
    this.playAudioFeedback('success');
    this.renderActiveUser();
    this.switchView('view-dashboard');
    this.renderDashboard();
    return true;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    this.showToast('Anda telah keluar dari akun.', 'info');
    this.renderActiveUser();
    this.switchView('view-login');
  }

  renderActiveUser() {
    const container = document.getElementById('nav-user-container');
    const desktopNavMenu = document.getElementById('desktop-nav-menu');
    const navDeskAdmin = document.getElementById('nav-desk-admin');
    const bottomNav = document.getElementById('mobile-bottom-nav');
    const btnNavAdmin = document.getElementById('btn-nav-admin');

    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const isGuest = !this.currentUser;

    // Apply body classes for CSS responsive styling
    if (isGuest) {
      document.body.className = 'guest-mode';
    } else if (isAdmin) {
      document.body.className = 'admin-mode';
    } else {
      document.body.className = 'non-admin-mode';
    }

    // Desktop Top Navigation Rules:
    // - Guest (tidak punya akun / belum login): No top navigation bar at all!
    // - Bapak Kamar (User): Shows Beranda, Absen Sesi, Rekap Bulanan. Menu Admin is strictly hidden!
    // - Admin Pusat: Shows Beranda, Absen Sesi, Rekap Bulanan, AND Menu Admin!
    if (desktopNavMenu) {
      desktopNavMenu.style.display = isGuest ? 'none' : 'flex';
    }
    if (navDeskAdmin) {
      navDeskAdmin.style.display = isAdmin ? 'inline-flex' : 'none';
    }

    // Mobile Bottom Navigation Bar:
    // Mobile only (hidden on desktop via CSS display: none !important).
    // On mobile: hidden for guest, shown for authenticated users.
    if (bottomNav) {
      bottomNav.style.display = isGuest ? 'none' : '';
    }
    if (btnNavAdmin) {
      btnNavAdmin.style.display = isAdmin ? 'flex' : 'none';
    }

    if (!container) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;

    if (!this.currentUser) {
      container.innerHTML = `
        <button class="btn btn-primary" onclick="app.switchView('view-login')" style="min-height:38px; padding:6px 16px; font-size:0.85rem; font-weight:700;">
          Masuk
        </button>
      `;
      return;
    }

    const initials = this.currentUser.name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();

    const roleBadge = this.currentUser.role === 'admin' ? 'Admin' : 'PJ Kamar';

    container.innerHTML = `
      <div class="user-action-group" style="display:flex; align-items:center; gap:6px;">
        <div class="user-pill" title="Klik untuk edit profil & kata sandi" onclick="app.openSelfProfileModal()" style="cursor:pointer;">
          <div class="user-avatar-small">${esc(initials)}</div>
          <div class="user-details-col" style="display:flex; flex-direction:column;">
            <span class="user-name-text" style="font-size:0.80rem; font-weight:700; line-height:1.2; max-width:85px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${esc(this.currentUser.name.split(' ')[0])}
            </span>
            <span class="user-role-text" style="font-size:0.65rem; color:var(--text-muted); font-weight:700; font-family:var(--font-mono);">${esc(roleBadge)} ⚙️</span>
          </div>
        </div>
        <button class="btn-icon btn-logout" id="btn-logout" onclick="app.logout()" title="Keluar / Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    `;
  }

  // --- NAVIGATION CONTROLLER ---
  switchView(viewId) {
    if (viewId === 'view-admin') {
      if (!this.currentUser) {
        this.switchView('view-login');
        return;
      }
      if (this.currentUser.role !== 'admin') {
        this.showToast('Akses ditolak: Menu Admin hanya untuk Administrator!', 'error');
        this.switchView('view-dashboard');
        return;
      }
    }

    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => sec.classList.remove('active'));

    const targetSec = document.getElementById(viewId);
    if (targetSec) {
      targetSec.classList.add('active');
      this.currentView = viewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update Bottom Nav active state (Mobile)
    const navItems = {
      'view-dashboard': 'btn-nav-home',
      'view-absen': 'btn-nav-absen',
      'view-rekap': 'btn-nav-rekap',
      'view-admin': 'btn-nav-admin'
    };

    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
    if (navItems[viewId]) {
      const activeBtn = document.getElementById(navItems[viewId]);
      if (activeBtn) activeBtn.classList.add('active');
    }

    // Update Desktop Nav active state (Header)
    const deskNavMap = {
      'view-dashboard': 'nav-desk-dashboard',
      'view-absen': 'nav-desk-absen',
      'view-rekap': 'nav-desk-rekap',
      'view-admin': 'nav-desk-admin'
    };
    document.querySelectorAll('.desktop-nav-link').forEach(btn => btn.classList.remove('active'));
    if (deskNavMap[viewId]) {
      const activeDeskBtn = document.getElementById(deskNavMap[viewId]);
      if (activeDeskBtn) activeDeskBtn.classList.add('active');
    }

    // Trigger View Renderers
    if (viewId === 'view-dashboard') this.renderDashboard();
    if (viewId === 'view-absen') this.renderAbsenView();
    if (viewId === 'view-rekap') this.renderRekapView();
    if (viewId === 'view-admin') this.renderAdminView();
  }

  // --- DASHBOARD RENDERER ---
  renderDashboard() {
    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const today = new Date();
    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const formattedDate = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    const heroDateText = document.getElementById('hero-date-text');
    if (heroDateText) heroDateText.textContent = formattedDate;

    // Greeting
    const heroGreeting = document.getElementById('hero-greeting-text');
    if (heroGreeting && this.currentUser) {
      heroGreeting.textContent = `Ahlan wa Sahlan, ${esc(this.currentUser.name.split(' ')[0])}!`;
    }

    // Target room for dashboard
    let targetRoomId = 'kamar-1';
    if (this.currentUser && this.currentUser.role === 'bapak_kamar' && this.currentUser.roomId) {
      targetRoomId = this.currentUser.roomId;
    }
    const currentRoom = window.store.getRoomById(targetRoomId) || window.store.getRooms()[0];

    const roomSubtitle = document.getElementById('dashboard-session-subtitle');
    if (roomSubtitle && currentRoom) {
      roomSubtitle.textContent = `Status pengisian untuk: ${esc(currentRoom.name)} (${esc(currentRoom.pjName)})`;
    }

    // Render 4 Sessions Matrix for Today
    const sessionsContainer = document.getElementById('dashboard-sessions-container');
    if (sessionsContainer && currentRoom) {
      const sessions = window.store.getSessions();
      sessionsContainer.innerHTML = '';

      sessions.forEach(sess => {
        const log = window.store.getAttendanceLog(dateStr, sess.id, currentRoom.id);
        const isDone = !!log;

        let iconSvg = '🌅';
        if (sess.id === 'siang') iconSvg = '☀️';
        if (sess.id === 'sore') iconSvg = '🌇';
        if (sess.id === 'malam') iconSvg = '🌙';

        const box = document.createElement('div');
        box.className = `session-box ${isDone ? 'done' : ''}`;
        box.innerHTML = `
          <div class="session-icon-circle">${iconSvg}</div>
          <div class="session-name">${esc(sess.name)}</div>
          <div class="session-time">${esc(sess.timeRange)}</div>
          <div class="session-status-tag ${isDone ? 'tag-done' : 'tag-pending'}">
            ${isDone ? '✓ Sudah Diabsen' : '⏳ Belum Diabsen'}
          </div>
        `;

        box.addEventListener('click', () => {
          this.playAudioFeedback('click');
          this.switchView('view-absen');
          const roomSelect = document.getElementById('select-absen-room');
          const sessionSelect = document.getElementById('select-absen-session');
          const dateInput = document.getElementById('input-absen-date');
          if (roomSelect) roomSelect.value = currentRoom.id;
          if (sessionSelect) sessionSelect.value = sess.id;
          if (dateInput) dateInput.value = dateStr;
          this.loadStudentListForAttendance();
        });

        sessionsContainer.appendChild(box);
      });
    }

    // Diligence & Performance Stats
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const bapakRecap = window.store.getBapakKamarRecap(currentYear, currentMonth);
    const roomPerformance = bapakRecap.find(r => r.roomId === currentRoom.id) || bapakRecap[0];

    if (roomPerformance) {
      const statTotalFilled = document.getElementById('stat-total-filled');
      const statTarget = document.getElementById('stat-target-sessions');
      const statRate = document.getElementById('stat-diligence-rate');
      const statBar = document.getElementById('stat-diligence-bar');
      const statRoomName = document.getElementById('stat-room-name');
      const statTotalStudents = document.getElementById('stat-total-students');
      const badgeScore = document.getElementById('badge-diligence-score');

      if (statTotalFilled) statTotalFilled.textContent = roomPerformance.totalFilledSessions;
      if (statTarget) statTarget.textContent = roomPerformance.targetSessions;
      if (statRate) statRate.textContent = `${roomPerformance.rate}%`;
      if (statBar) statBar.style.width = `${roomPerformance.rate}%`;
      if (statRoomName) statRoomName.textContent = esc(currentRoom.name.split(' - ')[0]);

      const roomStudents = window.store.getStudents(currentRoom.id);
      if (statTotalStudents) statTotalStudents.textContent = `${roomStudents.length} Santri Terdaftar`;

      if (badgeScore) {
        badgeScore.textContent = esc(roomPerformance.badge);
        badgeScore.className = `badge badge-${esc(roomPerformance.badgeColor)}`;
      }
    }

    // Recent 5 Logs
    const recentLogsBody = document.getElementById('table-recent-logs-body');
    if (recentLogsBody) {
      const logs = window.store.getAttendanceLogs().slice(0, 5);
      if (logs.length === 0) {
        recentLogsBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">
              Belum ada riwayat absensi yang tercatat.
            </td>
          </tr>
        `;
      } else {
        recentLogsBody.innerHTML = logs.map(l => `
          <tr>
            <td>
              <strong>${esc(l.date)}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">${esc(l.recordedAt.split(' ')[1] || '')}</div>
            </td>
            <td><span class="badge badge-primary">${esc(l.sessionId.toUpperCase())}</span></td>
            <td><strong>${esc(l.roomName.split(' - ')[0])}</strong></td>
            <td>${esc(l.recordedByName)}</td>
            <td>
              <span class="badge badge-hadir">H: ${l.summary.hadir}</span>
              <span class="badge badge-izin">I: ${l.summary.izin}</span>
              <span class="badge badge-sakit">S: ${l.summary.sakit}</span>
              <span class="badge badge-pulang">P: ${l.summary.pulang}</span>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // --- ABSENSI VIEW & FORM CONTROLLER ---
  renderAbsenView() {
    this.populateRoomSelector('select-absen-room');

    const selectRoom = document.getElementById('select-absen-room');
    if (selectRoom && this.currentUser && this.currentUser.role === 'bapak_kamar' && this.currentUser.roomId) {
      selectRoom.value = this.currentUser.roomId;
      selectRoom.disabled = true;
    } else if (selectRoom) {
      selectRoom.disabled = false;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dateInput = document.getElementById('input-absen-date');
    const badgeDateLocked = document.getElementById('badge-date-locked');
    const isPJ = this.currentUser && this.currentUser.role !== 'admin';

    if (isPJ) {
      if (dateInput) {
        dateInput.value = todayStr;
        dateInput.readOnly = true;
        dateInput.style.backgroundColor = 'var(--bg-surface-elevated, #f1f5f9)';
        dateInput.style.cursor = 'not-allowed';
      }
      if (badgeDateLocked) badgeDateLocked.style.display = 'inline-block';
    } else {
      if (dateInput) {
        if (!dateInput.value) dateInput.value = todayStr;
        dateInput.readOnly = false;
        dateInput.style.backgroundColor = '';
        dateInput.style.cursor = 'default';
      }
      if (badgeDateLocked) badgeDateLocked.style.display = 'none';
    }

    // Toggle Manual Student Input Card (Only for Admin, strictly hidden for all PJ Kamar)
    const cardPicker = document.getElementById('card-student-picker');
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    if (cardPicker) {
      cardPicker.style.display = isAdmin ? 'block' : 'none';
    }

    this.loadStudentListForAttendance();
  }

  loadStudentListForAttendance() {
    const selectRoom = document.getElementById('select-absen-room');
    const selectSession = document.getElementById('select-absen-session');
    const dateInput = document.getElementById('input-absen-date');

    if (!selectRoom || !selectSession || !dateInput) return;

    const roomId = selectRoom.value;
    const sessionId = selectSession.value;
    const dateStr = dateInput.value;

    const existingLog = window.store.getAttendanceLog(dateStr, sessionId, roomId);

    this.activeAbsenState = {};
    this.sessionStudents = [];

    // Always fetch fresh master students currently assigned to this room
    const allRoomStudents = window.store.getStudents(roomId) || [];

    if (allRoomStudents.length === 0) {
      this.renderSessionStudentCards();
      this.populateStudentAddPicker();
      this.updateAttendanceCounters();
      return;
    }

    if (existingLog && Array.isArray(existingLog.items) && existingLog.items.length > 0) {
      // Map existing recorded status and notes by studentId
      const savedStatusMap = new Map();
      existingLog.items.forEach(item => {
        savedStatusMap.set(item.studentId, {
          status: item.status || 'hadir',
          note: item.note || ''
        });
      });

      // Populate using all active room students so newly added students are ALWAYS included
      allRoomStudents.forEach(std => {
        this.sessionStudents.push(std);
        if (savedStatusMap.has(std.id)) {
          this.activeAbsenState[std.id] = savedStatusMap.get(std.id);
        } else {
          // Newly added student from master data who wasn't yet present in this saved session
          this.activeAbsenState[std.id] = {
            status: 'hadir',
            note: ''
          };
        }
      });
    } else {
      // Auto Pre-Population for Room Students:
      // Check if an earlier session recorded today for this room has 'pulang' or 'sakit'
      const allTodayLogsForRoom = window.store.getAttendanceLogs().filter(
        l => l.date === dateStr && l.roomId === roomId && Array.isArray(l.items) && l.items.length > 0
      );

      const sessionPriority = ['sore', 'siang', 'pagi', 'malam'];
      let baseLog = null;
      for (const sId of sessionPriority) {
        if (sId !== sessionId) {
          baseLog = allTodayLogsForRoom.find(l => l.sessionId === sId);
          if (baseLog) break;
        }
      }

      const carriedMap = {};
      if (baseLog && baseLog.items) {
        baseLog.items.forEach(item => {
          if (item.status === 'pulang' || item.status === 'sakit') {
            carriedMap[item.studentId] = { status: item.status, note: item.note || '' };
          }
        });
      }

      allRoomStudents.forEach(std => {
        this.sessionStudents.push(std);
        if (carriedMap[std.id]) {
          this.activeAbsenState[std.id] = { ...carriedMap[std.id] };
        } else {
          this.activeAbsenState[std.id] = {
            status: 'hadir',
            note: ''
          };
        }
      });
    }

    this.renderSessionStudentCards();
    this.populateStudentAddPicker();
    this.updateAttendanceCounters();
  }

  renderSessionStudentCards() {
    const listContainer = document.getElementById('students-attendance-list');
    const totalCountSpan = document.getElementById('count-total-students');
    if (!listContainer) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    if (totalCountSpan) totalCountSpan.textContent = `${this.sessionStudents.length} Anak`;

    listContainer.innerHTML = '';

    if (this.sessionStudents.length === 0) {
      listContainer.innerHTML = `
        <div class="card" style="text-align:center; padding:36px 16px; color:var(--text-muted); border:1.5px dashed var(--border-subtle); grid-column:1/-1;">
          <div style="font-size:2.2rem; margin-bottom:8px;">📋</div>
          <strong style="color:var(--text-main); font-size:1rem; display:block; margin-bottom:6px;">Belum Ada Santri di Sesi Kamar Ini</strong>
          <p style="font-size:0.85rem; max-width:440px; margin:0 auto 12px; line-height:1.5;">
            Sesi ini belum memiliki daftar santri.
          </p>
        </div>
      `;
      this.updateAttendanceCounters();
      return;
    }

    this.sessionStudents.forEach(std => {
      const state = this.activeAbsenState[std.id] || { status: 'hadir', note: '' };
      const initials = (std.name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const isUnmarked = !state.status;

      const card = document.createElement('div');
      card.className = `student-card ${isUnmarked ? 'unmarked' : ''}`;
      card.id = `card-std-${esc(std.id)}`;

      card.innerHTML = `
        <div class="student-header">
          <div class="student-info">
            <div class="student-avatar">${esc(initials)}</div>
            <div>
              <div class="student-name">
                ${esc(std.name)}
                ${isUnmarked ? `<span class="unmarked-indicator" id="unmarked-indicator-${esc(std.id)}">Belum Diabsen</span>` : ''}
              </div>
              <div class="student-meta">
                <span>NIS: ${esc(std.nis)}</span>
                <span>•</span>
                <span>Kelas ${esc(std.class)}</span>
              </div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="note-toggle-link" onclick="app.toggleNoteInput('${esc(std.id)}')">
              ${state.note ? '📝 Edit Catatan' : '+ Catatan'}
            </span>
            ${isAdmin ? `
            <button type="button" class="btn btn-secondary" style="min-height:26px; padding:2px 7px; font-size:0.7rem; color:var(--sakit-color); border-color:rgba(239,68,68,0.25);" title="Keluarkan santri dari kamar ini pada sesi ini" onclick="app.removeStudentFromSession('${esc(std.id)}')">
              ✕
            </button>` : ''}
          </div>
        </div>

        <div class="status-buttons-matrix">
          <button type="button" class="status-btn ${state.status === 'hadir' ? 'selected' : ''}" data-status="hadir" onclick="app.setStudentStatus('${esc(std.id)}', 'hadir')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Hadir</span>
          </button>

          <button type="button" class="status-btn ${state.status === 'izin' ? 'selected' : ''}" data-status="izin" onclick="app.setStudentStatus('${esc(std.id)}', 'izin')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>Izin</span>
          </button>

          <button type="button" class="status-btn ${state.status === 'sakit' ? 'selected' : ''}" data-status="sakit" onclick="app.setStudentStatus('${esc(std.id)}', 'sakit')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Sakit</span>
          </button>

          <button type="button" class="status-btn ${state.status === 'pulang' ? 'selected' : ''}" data-status="pulang" onclick="app.setStudentStatus('${esc(std.id)}', 'pulang')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Pulang</span>
          </button>
        </div>

        <div class="note-input-container ${state.note ? 'visible' : ''}" id="note-box-${esc(std.id)}">
          <input type="text" class="note-input" maxlength="250" placeholder="Tuliskan catatan santri..." value="${esc(state.note || '')}" onchange="app.updateStudentNote('${esc(std.id)}', this.value)" />
        </div>
      `;

      listContainer.appendChild(card);
    });

    this.updateAttendanceCounters();
  }

  populateStudentAddPicker() {
    const picker = document.getElementById('select-add-student-picker');
    if (!picker) return;

    const allStudents = window.store.getStudents() || [];
    const currentIds = new Set((this.sessionStudents || []).map(s => s.id));
    let available = allStudents.filter(s => !currentIds.has(s.id));

    // Room filter chip
    if (this.studentPickerRoomFilter && this.studentPickerRoomFilter !== 'all') {
      available = available.filter(s => s.roomId === this.studentPickerRoomFilter);
    }

    // Search query filter
    const q = (this.studentPickerQuery || '').trim().toLowerCase();
    if (q) {
      available = available.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.nis && s.nis.toLowerCase().includes(q))
      );
    }

    available.sort((a, b) => a.name.localeCompare(b.name));

    if (available.length === 0) {
      picker.innerHTML = `<option value="">-- Tidak ada santri yang sesuai pencarian/filter --</option>`;
      return;
    }

    picker.innerHTML = `
      <option value="">-- Pilih Nama Santri (${available.length} anak ditemukan) --</option>
      ${available.map(s => {
        const room = window.store.getRoomById(s.roomId);
        const roomName = room ? room.name.split(' - ')[0] : (s.roomId || '-');
        return `<option value="${s.id}">${s.name} (NIS: ${s.nis} | Asal: ${roomName})</option>`;
      }).join('')}
    `;

    // Auto-select if single result under active search
    if (q && available.length === 1) {
      picker.selectedIndex = 1;
    }
  }

  addStudentToCurrentSession() {
    const picker = document.getElementById('select-add-student-picker');
    if (!picker) return;
    let studentId = picker.value;

    // Fallback if search was typed and user directly clicks add or presses Enter
    if (!studentId && picker.options.length > 1 && this.studentPickerQuery) {
      studentId = picker.options[1].value;
    }

    if (!studentId) {
      this.showToast('Silakan cari atau pilih nama santri dari daftar terlebih dahulu!', 'warning');
      return;
    }

    const std = window.store.getStudentById(studentId);
    if (!std) {
      this.showToast('Data santri tidak ditemukan!', 'error');
      return;
    }

    if (this.sessionStudents.some(s => s.id === std.id)) {
      this.showToast(`Santri ${std.name} sudah ada di daftar kamar ini!`, 'warning');
      return;
    }

    this.sessionStudents.push(std);
    this.activeAbsenState[std.id] = { status: 'hadir', note: '' };

    // Reset search query after adding so user can search for the next child immediately
    const searchInput = document.getElementById('input-search-student-add');
    if (searchInput) searchInput.value = '';
    this.studentPickerQuery = '';

    this.renderSessionStudentCards();
    this.populateStudentAddPicker();

    this.playHaptic(20);
    this.playAudioFeedback('click');
    this.showToast(`${std.name} dimasukkan ke kamar ini (Hadir).`, 'success');

    if (searchInput) searchInput.focus();
  }

  loadRoomDefaultStudents() {
    const selectRoom = document.getElementById('select-absen-room');
    if (!selectRoom) return;
    const roomId = selectRoom.value;
    const defaultStudents = window.store.getStudents(roomId);

    if (defaultStudents.length === 0) {
      this.showToast('Tidak ada santri yang terdaftar secara bawaan di kamar ini.', 'info');
      return;
    }

    let addedCount = 0;
    defaultStudents.forEach(std => {
      if (!this.sessionStudents.some(s => s.id === std.id)) {
        this.sessionStudents.push(std);
        this.activeAbsenState[std.id] = { status: 'hadir', note: '' };
        addedCount++;
      }
    });

    this.renderSessionStudentCards();
    this.populateStudentAddPicker();

    if (addedCount > 0) {
      this.playHaptic(30);
      this.playAudioFeedback('success');
      this.showToast(`${addedCount} santri bawaan kamar berhasil dimuat!`, 'success');
    } else {
      this.showToast('Semua santri bawaan kamar sudah ada di daftar.', 'info');
    }
  }

  removeStudentFromSession(studentId) {
    const std = this.sessionStudents.find(s => s.id === studentId);
    this.sessionStudents = this.sessionStudents.filter(s => s.id !== studentId);
    delete this.activeAbsenState[studentId];

    this.renderSessionStudentCards();
    this.populateStudentAddPicker();

    this.playHaptic(20);
    this.showToast(`${std ? std.name : 'Santri'} dikeluarkan dari kamar ini.`, 'info');
  }

  setStudentStatus(studentId, status) {
    if (!this.activeAbsenState[studentId]) return;

    this.activeAbsenState[studentId].status = status;
    this.playHaptic(25);
    this.playAudioFeedback('click');

    const card = document.getElementById(`card-std-${studentId}`);
    if (card) {
      card.classList.remove('unmarked', 'pulse-warning');
      const ind = document.getElementById(`unmarked-indicator-${studentId}`);
      if (ind) ind.remove();

      const buttons = card.querySelectorAll('.status-btn');
      buttons.forEach(btn => {
        if (btn.getAttribute('data-status') === status) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });
    }

    this.updateAttendanceCounters();
  }

  toggleNoteInput(studentId) {
    const box = document.getElementById(`note-box-${studentId}`);
    if (box) {
      box.classList.toggle('visible');
      if (box.classList.contains('visible')) {
        const inp = box.querySelector('input');
        if (inp) inp.focus();
      }
    }
  }

  updateStudentNote(studentId, val) {
    if (this.activeAbsenState[studentId]) {
      // Input sanitization and bounded length limit
      const clean = String(val || '').trim().slice(0, 250);
      this.activeAbsenState[studentId].note = clean;
    }
  }

  bulkMarkAllHadir() {
    if (!this.sessionStudents || this.sessionStudents.length === 0) {
      this.showToast('Belum ada santri di kamar ini. Silakan masukkan santri terlebih dahulu!', 'warning');
      return;
    }
    this.sessionStudents.forEach(std => {
      this.activeAbsenState[std.id].status = 'hadir';
      const card = document.getElementById(`card-std-${std.id}`);
      if (card) {
        card.classList.remove('unmarked', 'pulse-warning');
        const ind = document.getElementById(`unmarked-indicator-${std.id}`);
        if (ind) ind.remove();

        card.querySelectorAll('.status-btn').forEach(btn => {
          if (btn.getAttribute('data-status') === 'hadir') btn.classList.add('selected');
          else btn.classList.remove('selected');
        });
      }
    });

    this.playHaptic(40);
    this.playAudioFeedback('success');
    this.showToast('Seluruh santri ditandai HADIR!', 'success');
    this.updateAttendanceCounters();
  }

  updateAttendanceCounters() {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let pulang = 0;
    let unmarked = 0;

    (this.sessionStudents || []).forEach(std => {
      const item = this.activeAbsenState[std.id];
      if (!item || !item.status) unmarked++;
      else if (item.status === 'hadir') hadir++;
      else if (item.status === 'izin') izin++;
      else if (item.status === 'sakit') sakit++;
      else if (item.status === 'pulang') pulang++;
      else unmarked++;
    });

    const cHadir = document.getElementById('counter-hadir');
    const cIzin = document.getElementById('counter-izin');
    const cSakit = document.getElementById('counter-sakit');
    const cPulang = document.getElementById('counter-pulang');
    const cUnmarked = document.getElementById('counter-unmarked');
    const bUnmarked = document.getElementById('badge-unmarked');
    const cTotal = document.getElementById('count-total-students');

    if (cHadir) cHadir.textContent = hadir;
    if (cIzin) cIzin.textContent = izin;
    if (cSakit) cSakit.textContent = sakit;
    if (cPulang) cPulang.textContent = pulang;
    if (cUnmarked) cUnmarked.textContent = unmarked;
    if (cTotal) cTotal.textContent = `${(this.sessionStudents || []).length} Anak`;
    if (bUnmarked) {
      bUnmarked.style.display = unmarked > 0 ? 'inline-flex' : 'none';
    }
  }

  saveAttendance() {
    const selectRoom = document.getElementById('select-absen-room');
    const selectSession = document.getElementById('select-absen-session');
    const dateInput = document.getElementById('input-absen-date');

    if (!selectRoom || !selectSession || !dateInput) return;

    const roomId = selectRoom.value;
    const sessionId = selectSession.value;
    const dateStr = dateInput.value;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isPJ = this.currentUser && this.currentUser.role !== 'admin';

    // Strict Rule 1: PJ cannot edit/save past or future dates
    if (isPJ && dateStr !== todayStr) {
      this.playHaptic(80);
      this.playAudioFeedback('error');
      this.showToast('PJ hanya dapat menginput absensi untuk hari yang sedang berjalan. Tanggal lampau hanya dapat diubah oleh Admin.', 'error');
      dateInput.value = todayStr;
      return;
    }

    const room = window.store.getRoomById(roomId);
    if (!room) {
      this.showToast('Kamar tidak valid!', 'error');
      return;
    }

    // Strict Rule 2: Must have at least 1 student in the session
    if (!this.sessionStudents || this.sessionStudents.length === 0) {
      this.playHaptic(50);
      this.playAudioFeedback('error');
      this.showToast('Belum ada santri dimasukkan ke sesi kamar ini! Silakan masukkan santri yang hadir.', 'warning');
      return;
    }

    // Strict Rule 3: Ensure every student has an explicit attendance status chosen
    const unchosenStudents = this.sessionStudents.filter(std => {
      const state = this.activeAbsenState[std.id];
      return !state || !state.status;
    });

    if (unchosenStudents.length > 0) {
      this.playHaptic(80);
      this.playAudioFeedback('error');
      this.showToast(`Peringatan: Masih ada ${unchosenStudents.length} santri yang belum diisi statusnya! PJ kamar wajib menginput kehadiran per anak.`, 'warning');
      const firstCard = document.getElementById(`card-std-${unchosenStudents[0].id}`);
      if (firstCard) {
        firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        unchosenStudents.forEach(std => {
          const c = document.getElementById(`card-std-${std.id}`);
          if (c) {
            c.classList.add('pulse-warning');
            setTimeout(() => c.classList.remove('pulse-warning'), 2500);
          }
        });
      }
      return;
    }

    const items = this.sessionStudents.map(std => {
      const state = this.activeAbsenState[std.id] || { status: 'hadir', note: '' };
      return {
        studentId: std.id,
        studentName: std.name,
        nis: std.nis,
        class: std.class,
        status: state.status,
        note: (state.note || '').slice(0, 250)
      };
    });

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const record = {
      id: `att-${roomId}-${dateStr}-${sessionId}`,
      date: dateStr,
      sessionId: sessionId,
      sessionName: sessionId.toUpperCase(),
      roomId: room.id,
      roomName: room.name,
      recordedByUsername: this.currentUser ? this.currentUser.username : room.pjId,
      recordedByName: this.currentUser ? this.currentUser.name : room.pjName,
      recordedAt: `${dateStr} ${timeStr}`,
      items: items,
      summary: {
        hadir: items.filter(i => i.status === 'hadir').length,
        izin: items.filter(i => i.status === 'izin').length,
        sakit: items.filter(i => i.status === 'sakit').length,
        pulang: items.filter(i => i.status === 'pulang').length,
        total: items.length
      }
    };

    window.store.saveAttendanceLog(record);

    this.playHaptic(60);
    this.playAudioFeedback('success');
    this.showToast(`Berhasil menyimpan absensi ${sessionId.toUpperCase()} ${room.name.split(' - ')[0]} (${items.length} santri)!`, 'success');

    // User Requirement: Screen does NOT redirect to dashboard! Stay on attendance view.
    this.renderDashboard(); // Background refresh of dashboard data
    this.updateAttendanceCounters();

    // Visual button micro-interaction to give crystal-clear feedback
    const saveBtns = [
      document.getElementById('btn-save-attendance-bottom'),
      document.getElementById('btn-save-attendance-top')
    ];

    saveBtns.forEach(btn => {
      if (btn) {
        const origHTML = btn.innerHTML;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          ✅ Tersimpan Rapi!
        `;
        btn.style.backgroundColor = 'var(--hadir-color)';
        btn.style.borderColor = 'var(--hadir-border)';
        setTimeout(() => {
          btn.innerHTML = origHTML;
          btn.style.backgroundColor = '';
          btn.style.borderColor = '';
        }, 2200);
      }
    });
  }

  // --- REKAPITULASI VIEW CONTROLLER ---
  renderRekapView() {
    this.populateRoomSelector('rekap-select-room', true);

    const monthSelect = document.getElementById('rekap-select-month');
    const yearSelect = document.getElementById('rekap-select-year');
    const roomSelect = document.getElementById('rekap-select-room');

    if (!monthSelect || !yearSelect) return;

    const today = new Date();
    if (!monthSelect.value) monthSelect.value = String(today.getMonth() + 1);
    if (!yearSelect.value) yearSelect.value = String(today.getFullYear());

    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    const roomId = roomSelect ? roomSelect.value : 'all';

    // Requirement: Non-admin users (PJ) cannot view "Rekap Keaktifan Bapak Kamar"
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const tabPj = document.getElementById('tab-rekap-pj');
    const subPj = document.getElementById('subpanel-rekap-pj');
    const tabStd = document.getElementById('tab-rekap-students');
    const subStd = document.getElementById('subpanel-rekap-students');
    const subLog = document.getElementById('subpanel-rekap-logs');

    if (!isAdmin) {
      if (tabPj) tabPj.style.display = 'none';
      if (subPj) subPj.style.display = 'none';
      // Automatically switch PJ to student recap if PJ tab was active
      if (tabPj && tabPj.classList.contains('active')) {
        tabPj.classList.remove('active');
        if (tabStd) tabStd.classList.add('active');
        if (subStd) subStd.style.display = 'block';
        if (subLog) subLog.style.display = 'none';
      }
    } else {
      if (tabPj) tabPj.style.display = 'inline-flex';
    }

    // Update Print Header
    const printPeriod = document.getElementById('print-period-text');
    if (printPeriod) {
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      printPeriod.textContent = `Periode: ${monthNames[month - 1]} ${year}`;
    }

    if (isAdmin) {
      this.renderRekapPjTable(year, month);
    }
    this.renderRekapStudentsTable(year, month, roomId);
    this.renderRekapLogsTable(year, month, roomId);
  }

  renderRekapPjTable(year, month) {
    const tableBody = document.getElementById('table-rekap-pj-body');
    if (!tableBody) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const recapList = window.store.getBapakKamarRecap(year, month);

    if (recapList.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px;">Tidak ada data bapak kamar.</td></tr>`;
      return;
    }

    tableBody.innerHTML = recapList.map(item => `
      <tr>
        <td>
          <strong>${esc(item.pjName)}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">@${esc(item.pjUsername)}</div>
        </td>
        <td><strong>${esc(item.roomName.split(' - ')[0])}</strong></td>
        <td><strong style="color:var(--primary); font-size:1.05rem;">${item.totalFilledSessions}</strong> kali</td>
        <td>${item.targetSessions} sesi</td>
        <td>
          <div style="font-weight:800; font-size:1rem; font-family:var(--font-mono);">${item.rate}%</div>
          <div class="progress-bar-bg" style="width:70px;">
            <div class="progress-bar-fill" style="width:${item.rate}%; background-color:var(--${item.badgeColor === 'success' ? 'hadir' : item.badgeColor === 'danger' ? 'sakit' : 'izin'}-color);"></div>
          </div>
        </td>
        <td>${item.bySession.pagi || 0}</td>
        <td>${item.bySession.siang || 0}</td>
        <td>${item.bySession.sore || 0}</td>
        <td>${item.bySession.malam || 0}</td>
        <td><span class="badge badge-${esc(item.badgeColor)}">${esc(item.badge)}</span></td>
      </tr>
    `).join('');
  }

  renderRekapStudentsTable(year, month, roomId) {
    const tableBody = document.getElementById('table-rekap-students-body');
    if (!tableBody) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    let studentStats = window.store.getStudentMonthlyRecap(year, month, roomId);

    // Apply Filter by Percentage / Status
    const filterPercentage = document.getElementById('rekap-filter-percentage');
    const filterVal = filterPercentage ? filterPercentage.value : 'all';

    if (filterVal === 'low') {
      studentStats = studentStats.filter(s => s.totalRecorded > 0 && s.attendancePercentage < 75);
    } else if (filterVal === 'medium') {
      studentStats = studentStats.filter(s => s.totalRecorded > 0 && s.attendancePercentage >= 75 && s.attendancePercentage < 90);
    } else if (filterVal === 'high') {
      studentStats = studentStats.filter(s => s.totalRecorded > 0 && s.attendancePercentage >= 90);
    } else if (filterVal === 'unrecorded') {
      studentStats = studentStats.filter(s => s.totalRecorded === 0);
    }

    // Apply Sorting
    const sortPercentage = document.getElementById('rekap-sort-percentage');
    const sortVal = sortPercentage ? sortPercentage.value : 'lowest';

    if (sortVal === 'lowest') {
      studentStats.sort((a, b) => a.attendancePercentage - b.attendancePercentage || a.name.localeCompare(b.name));
    } else if (sortVal === 'highest') {
      studentStats.sort((a, b) => b.attendancePercentage - a.attendancePercentage || a.name.localeCompare(b.name));
    } else if (sortVal === 'name') {
      studentStats.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (studentStats.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--text-muted);">Tidak ada santri yang sesuai kriteria filter persentase.</td></tr>`;
      return;
    }

    tableBody.innerHTML = studentStats.map((std, idx) => {
      let badgeClass = 'badge-hadir';
      let statusIcon = '🌟';
      if (std.totalRecorded === 0) {
        badgeClass = 'badge-secondary';
        statusIcon = '❓';
      } else if (std.attendancePercentage < 75) {
        badgeClass = 'badge-sakit';
        statusIcon = '⚠️';
      } else if (std.attendancePercentage < 90) {
        badgeClass = 'badge-izin';
        statusIcon = '⚡';
      }

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong style="cursor:pointer; color:var(--primary);" title="Klik untuk cek riwayat harian" onclick="app.viewStudentAttendanceHistory('${esc(std.studentId)}')">
              ${esc(std.name)}
            </strong>
            <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">NIS: ${esc(std.nis)}</div>
          </td>
          <td>${esc(std.roomName.split(' - ')[0])}</td>
          <td>${esc(std.class)}</td>
          <td><span class="badge badge-hadir">${std.hadir}</span></td>
          <td><span class="badge badge-izin">${std.izin}</span></td>
          <td><span class="badge badge-sakit">${std.sakit}</span></td>
          <td><span class="badge badge-pulang">${std.pulang}</span></td>
          <td>
            <span class="badge ${badgeClass}" style="font-family:var(--font-mono); font-size:0.85rem; font-weight:700;">
              ${statusIcon} ${std.totalRecorded > 0 ? `${std.attendancePercentage}%` : 'Belum Ada'}
            </span>
          </td>
          <td>
            <button class="btn btn-secondary" style="min-height:30px; padding:3px 10px; font-size:0.75rem;" onclick="app.viewStudentAttendanceHistory('${esc(std.studentId)}')">
              🔍 Cek Rincian
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderRekapLogsTable(year, month, roomId) {
    const tableBody = document.getElementById('table-rekap-logs-body');
    if (!tableBody) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const isPJ = this.currentUser && this.currentUser.role !== 'admin';

    // 1. Scope Banner & PJ Dropdown Configuration
    const scopeIndicator = document.getElementById('rekap-log-scope-indicator');
    const filterPjSelect = document.getElementById('rekap-log-filter-pj');
    const subtitleEl = document.getElementById('rekap-log-subtitle');

    if (isPJ) {
      const myRoom = window.store.getRoomById(this.currentUser.roomId) || { name: 'Kamar Anda' };
      if (scopeIndicator) {
        scopeIndicator.innerHTML = `
          <span class="badge badge-primary" style="font-size:0.75rem; padding:4px 10px;">
            🏠 Mode PJ: ${esc(myRoom.name.split(' - ')[0])}
          </span>
        `;
      }
      if (subtitleEl) {
        subtitleEl.textContent = `Menampilkan log absensi untuk ${esc(myRoom.name)} & anak yang diinput pada sesi ini`;
      }
      if (filterPjSelect) {
        filterPjSelect.innerHTML = `
          <option value="${esc(this.currentUser.username)}" selected>Hanya Log Saya (@${esc(this.currentUser.username)})</option>
          <option value="my_room">Semua Log Kamar Ini</option>
        `;
      }
    } else {
      if (scopeIndicator) {
        scopeIndicator.innerHTML = `
          <span class="badge badge-success" style="font-size:0.75rem; padding:4px 10px;">
            🛡️ Mode Administrator
          </span>
        `;
      }
      if (subtitleEl) {
        subtitleEl.textContent = `Audit lengkap seluruh sesi absensi, kamar, dan ustadz penginput`;
      }
      if (filterPjSelect && (filterPjSelect.options.length <= 1 || !filterPjSelect.querySelector('option[value="all"]'))) {
        const currentPjVal = filterPjSelect.value;
        const users = window.store.getUsers().filter(u => u.role === 'bapak_kamar' || u.role === 'admin');
        filterPjSelect.innerHTML = `
          <option value="all">Semua Petugas Penginput</option>
          ${users.map(u => `
            <option value="${esc(u.username)}">${esc(u.name)} (@${esc(u.username)})</option>
          `).join('')}
        `;
        if (currentPjVal && Array.from(filterPjSelect.options).some(o => o.value === currentPjVal)) {
          filterPjSelect.value = currentPjVal;
        }
      }
    }

    // 2. Fetch and Scope Base Logs
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    let logs = window.store.getAttendanceLogs().filter(l => l.date && l.date.startsWith(prefix));

    // Sort by recordedAt descending so most recent sessions appear at the top
    logs.sort((a, b) => (b.recordedAt || b.date).localeCompare(a.recordedAt || a.date));

    // Room Filter from Header (if specified)
    if (roomId && roomId !== 'all') {
      logs = logs.filter(l => l.roomId === roomId);
    }

    // Strict Scoping for PJ Kamar: Only display their room or their own inputs
    if (isPJ) {
      const selectedPjFilter = filterPjSelect ? filterPjSelect.value : this.currentUser.username;
      if (selectedPjFilter === this.currentUser.username) {
        logs = logs.filter(l => l.recordedByUsername === this.currentUser.username || l.roomId === this.currentUser.roomId);
      } else {
        logs = logs.filter(l => l.roomId === this.currentUser.roomId);
      }
    } else {
      const selectedPj = filterPjSelect ? filterPjSelect.value : 'all';
      if (selectedPj && selectedPj !== 'all') {
        logs = logs.filter(l => l.recordedByUsername === selectedPj);
      }
    }

    // 3. Filter by Sesi
    const filterSession = document.getElementById('rekap-log-filter-session');
    if (filterSession && filterSession.value !== 'all') {
      logs = logs.filter(l => l.sessionId === filterSession.value);
    }

    // 4. Search Filter across Date, Session, Room, Officer, and Students
    const searchInput = document.getElementById('rekap-log-search');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
      logs = logs.filter(l => {
        const inDate = l.date.toLowerCase().includes(query);
        const inRoom = (l.roomName || '').toLowerCase().includes(query);
        const inSession = (l.sessionName || l.sessionId || '').toLowerCase().includes(query);
        const inOfficer = (l.recordedByName || '').toLowerCase().includes(query) || (l.recordedByUsername || '').toLowerCase().includes(query);
        const inStudents = (l.items || []).some(item => 
          (item.studentName || '').toLowerCase().includes(query) || 
          (item.nis || '').toLowerCase().includes(query)
        );
        return inDate || inRoom || inSession || inOfficer || inStudents;
      });
    }

    if (logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:28px 16px; color:var(--text-muted);">Tidak ada rekaman log absensi yang sesuai kriteria filter.</td></tr>`;
      return;
    }

    tableBody.innerHTML = logs.map(l => {
      // Extract initials for author avatar
      const initials = (l.recordedByName || 'PJ')
        .split(' ')
        .filter(p => !p.startsWith('Ust') && !p.startsWith('H.') && p.length > 0)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('') || (l.recordedByName || 'PJ').slice(0, 2).toUpperCase();

      const timeOnly = l.recordedAt ? (l.recordedAt.split(' ')[1] || '') : '';

      return `
        <tr>
          <td><strong>${esc(l.date)}</strong></td>
          <td><span class="badge badge-primary" style="font-weight:700;">${esc((l.sessionName || l.sessionId).toUpperCase())}</span></td>
          <td>
            <div style="font-weight:700; color:var(--text-main);">${esc(l.roomName.split(' - ')[0])}</div>
            <small style="color:var(--text-muted); font-size:0.75rem;">${(l.items || []).length} Santri Presensi</small>
          </td>
          <td>
            <div class="author-pill-container">
              <div class="author-avatar-sm" title="${esc(l.recordedByName)}">${esc(initials)}</div>
              <div>
                <strong style="color:var(--text-main); display:block; font-size:0.86rem;">${esc(l.recordedByName)}</strong>
                <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                  <span style="font-family:var(--font-mono); font-size:0.74rem; color:var(--text-muted);">@${esc(l.recordedByUsername)}</span>
                  <span class="badge ${l.recordedByUsername === 'admin' ? 'badge-primary' : 'badge-secondary'}" style="font-size:0.68rem; padding:1px 6px;">
                    ${l.recordedByUsername === 'admin' ? 'Admin' : 'PJ Kamar'}
                  </span>
                </div>
              </div>
            </div>
          </td>
          <td style="font-size:0.75rem; font-family:var(--font-mono); color:var(--text-secondary);">
            <div style="font-weight:600;">🕒 ${esc(timeOnly || l.recordedAt)}</div>
            <div style="color:var(--text-muted); font-size:0.72rem;">${esc(l.date)}</div>
          </td>
          <td>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">
              <span class="badge badge-hadir">H: ${l.summary ? l.summary.hadir : (l.items || []).filter(i => i.status === 'hadir').length}</span>
              <span class="badge badge-izin">I: ${l.summary ? l.summary.izin : (l.items || []).filter(i => i.status === 'izin').length}</span>
              <span class="badge badge-sakit">S: ${l.summary ? l.summary.sakit : (l.items || []).filter(i => i.status === 'sakit').length}</span>
              <span class="badge badge-pulang">P: ${l.summary ? l.summary.pulang : (l.items || []).filter(i => i.status === 'pulang').length}</span>
            </div>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary" style="min-height:32px; padding:3px 10px; font-size:0.75rem;" onclick="app.viewSessionAttendanceDetails('${esc(l.id)}')">
                👁️ Rincian
              </button>
              ${isAdmin ? `
              <button class="btn btn-danger" style="min-height:32px; padding:3px 8px; font-size:0.75rem;" onclick="app.deleteAttendanceLogPrompt('${esc(l.id)}')">
                Hapus
              </button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  deleteAttendanceLogPrompt(logId) {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.showToast('Hanya Administrator yang memiliki hak menghapus absensi!', 'error');
      return;
    }
    if (confirm('Yakin ingin menghapus rekaman absensi ini?')) {
      window.store.deleteAttendanceLog(logId);
      this.showToast('Log absensi berhasil dihapus.', 'info');
      this.renderRekapView();
      this.renderDashboard();
    }
  }

  // --- CSV EXPORT WITH FORMULA INJECTION DEFENSE (CWE-1236) ---
  exportCSV() {
    const monthSelect = document.getElementById('rekap-select-month');
    const yearSelect = document.getElementById('rekap-select-year');
    const roomSelect = document.getElementById('rekap-select-room');

    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    const roomId = roomSelect ? roomSelect.value : 'all';

    const students = window.store.getStudentMonthlyRecap(year, month, roomId);

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += 'No,NIS,Nama Santri,Kamar,Kelas,Hadir,Izin,Sakit,Pulang,Total Sesi,Persentase Kehadiran\n';

    const sanitize = (val) => window.SecurityUtils ? window.SecurityUtils.sanitizeCSVCell(val) : `"${String(val).replace(/"/g, '""')}"`;

    students.forEach((s, idx) => {
      csvContent += `${idx + 1},${sanitize(s.nis)},${sanitize(s.name)},${sanitize(s.roomName)},${sanitize(s.class)},${s.hadir},${s.izin},${s.sakit},${s.pulang},${s.totalRecorded},"${s.attendancePercentage}%"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rekap_absensi_asrama_${year}_${month}.csv`;
    link.click();
    this.showToast('File CSV berhasil diunduh (terlindungi dari CSV Injection)!', 'success');
  }

  printReport() {
    window.print();
  }

  // --- ADMIN CONTROL CENTER CONTROLLER ---
  renderAdminView() {
    this.renderAdminRooms();
    this.renderAdminStudents();
    this.renderAdminCriteria();
    this.renderAdminSessions();
    this.renderAdminUsers();
  }

  renderAdminRooms() {
    const tbody = document.getElementById('table-admin-rooms-body');
    if (!tbody) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const rooms = window.store.getRooms();
    tbody.innerHTML = rooms.map(r => `
      <tr>
        <td style="font-family:var(--font-mono); font-size:0.8rem;">${esc(r.id)}</td>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${esc(r.pjName)}</td>
        <td>${r.capacity} Anak</td>
        <td>${esc(r.floor || '-')}</td>
        <td>
          <button class="btn btn-secondary" style="min-height:30px; padding:3px 8px; font-size:0.75rem;" onclick="app.openEditRoomModal('${esc(r.id)}')">
            Edit
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderAdminStudents() {
    const tbody = document.getElementById('table-admin-students-body');
    const filterSelect = document.getElementById('admin-filter-student-room');
    if (!tbody) return;

    if (filterSelect && filterSelect.options.length <= 1) {
      this.populateRoomSelector('admin-filter-student-room', true);
    }

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const roomId = filterSelect ? filterSelect.value : 'all';
    const students = window.store.getStudents(roomId === 'all' ? null : roomId);

    tbody.innerHTML = students.map(s => {
      const room = window.store.getRoomById(s.roomId);
      return `
        <tr>
          <td style="font-family:var(--font-mono); font-size:0.8rem;">${esc(s.nis)}</td>
          <td>
            <strong style="cursor:pointer; color:var(--primary);" onclick="app.viewStudentAttendanceHistory('${esc(s.id)}')">
              ${esc(s.name)}
            </strong>
          </td>
          <td>${esc(room ? room.name.split(' - ')[0] : s.roomId)}</td>
          <td>${esc(s.class)}</td>
          <td style="font-family:var(--font-mono); font-size:0.8rem;">${esc(s.parentContact || '-')}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-primary" style="min-height:30px; padding:3px 8px; font-size:0.75rem;" onclick="app.viewStudentAttendanceHistory('${esc(s.id)}')">
                📜 Cek Absen
              </button>
              <button class="btn btn-secondary" style="min-height:30px; padding:3px 8px; font-size:0.75rem;" onclick="app.openEditStudentModal('${esc(s.id)}')">
                Edit
              </button>
              <button class="btn btn-danger" style="min-height:30px; padding:3px 8px; font-size:0.75rem;" onclick="app.deleteStudentPrompt('${esc(s.id)}')">
                Hapus
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- STUDENT ATTENDANCE AUDIT & HISTORY VIEWER (OWASP Audit & User Request) ---
  viewStudentAttendanceHistory(studentId) {
    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const data = window.store.getStudentDailyHistory(studentId);
    if (!data || !data.student) {
      this.showToast('Data santri tidak ditemukan!', 'error');
      return;
    }

    const { student, summary, history } = data;
    const room = window.store.getRoomById(student.roomId);

    const nameEl = document.getElementById('m-history-student-name');
    const metaEl = document.getElementById('m-history-student-meta');
    if (nameEl) nameEl.textContent = `Riwayat Harian: ${student.name}`;
    if (metaEl) metaEl.textContent = `NIS: ${student.nis} | Kamar: ${room ? room.name : student.roomId} | Kelas: ${student.class} | Kontak Wali: ${student.parentContact || '-'}`;

    const tEl = document.getElementById('m-stat-total');
    const hEl = document.getElementById('m-stat-hadir');
    const oEl = document.getElementById('m-stat-others');
    const rEl = document.getElementById('m-stat-rate');

    if (tEl) tEl.textContent = summary.total;
    if (hEl) hEl.textContent = summary.hadir;
    if (oEl) oEl.textContent = (summary.izin + summary.sakit + summary.pulang);
    if (rEl) rEl.textContent = `${summary.rate}%`;

    const tbody = document.getElementById('m-table-student-history-body');
    if (tbody) {
      if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">Belum ada riwayat absensi tercatat untuk santri ini.</td></tr>`;
      } else {
        tbody.innerHTML = history.map(h => {
          let badgeClass = 'badge-hadir';
          if (h.status === 'izin') badgeClass = 'badge-izin';
          if (h.status === 'sakit') badgeClass = 'badge-sakit';
          if (h.status === 'pulang') badgeClass = 'badge-pulang';

          return `
            <tr>
              <td><strong style="font-family:var(--font-mono);">${esc(h.date)}</strong></td>
              <td><span class="badge badge-primary">${esc(h.sessionName || h.sessionId.toUpperCase())}</span></td>
              <td><span class="badge ${badgeClass}">${esc(h.status.toUpperCase())}</span></td>
              <td>
                <div style="font-weight:700; color:var(--text-main);">${esc(h.recordedByName || 'Petugas')}</div>
                <small style="color:var(--text-muted); font-family:var(--font-mono);">@${esc(h.recordedByUsername || '-')}</small>
              </td>
              <td style="font-size:0.75rem; font-family:var(--font-mono); color:var(--text-muted);">${esc(h.recordedAt || '-')}</td>
              <td style="font-size:0.85rem;">${h.note ? esc(h.note) : '<span style="color:var(--text-muted);">-</span>'}</td>
            </tr>
          `;
        }).join('');
      }
    }

    this.openModal('modal-student-history');
  }

  viewSessionAttendanceDetails(logId) {
    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const log = window.store.getAttendanceLogs().find(l => l.id === logId);
    if (!log) {
      this.showToast('Log absensi tidak ditemukan!', 'error');
      return;
    }

    this.activeDetailLogId = logId;

    const titleEl = document.getElementById('m-session-title');
    const subEl = document.getElementById('m-session-subtitle');
    if (titleEl) titleEl.textContent = `${log.sessionName || log.sessionId.toUpperCase()} - ${log.roomName}`;
    if (subEl) subEl.textContent = `Tanggal: ${log.date} | Kamar: ${log.roomName}`;

    // Detailed Author & Session Banner
    const authorCard = document.getElementById('m-session-author-card');
    if (authorCard) {
      const items = log.items || [];
      const initials = (log.recordedByName || 'PJ')
        .split(' ')
        .filter(p => !p.startsWith('Ust') && !p.startsWith('H.') && p.length > 0)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('') || (log.recordedByName || 'PJ').slice(0, 2).toUpperCase();

      authorCard.innerHTML = `
        <div class="session-author-banner">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
            <div class="author-pill-container">
              <div class="author-avatar-sm" style="width:38px; height:38px; font-size:0.85rem;">${esc(initials)}</div>
              <div>
                <strong style="color:var(--text-main); font-size:0.95rem; display:block;">${esc(log.recordedByName)}</strong>
                <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                  <span style="font-family:var(--font-mono); font-size:0.78rem; color:var(--text-muted);">@${esc(log.recordedByUsername)}</span>
                  <span class="badge ${log.recordedByUsername === 'admin' ? 'badge-primary' : 'badge-secondary'}" style="font-size:0.7rem;">
                    ${log.recordedByUsername === 'admin' ? 'Admin Pusat' : 'Petugas PJ Kamar'}
                  </span>
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <span class="badge badge-primary" style="font-size:0.78rem;">Sesi ${esc((log.sessionName || log.sessionId).toUpperCase())}</span>
              <div style="font-size:0.75rem; font-family:var(--font-mono); color:var(--text-muted); margin-top:3px;">
                🕒 ${esc(log.recordedAt)}
              </div>
            </div>
          </div>

          <div style="padding-top:8px; border-top:1px solid var(--border-subtle); display:flex; flex-wrap:wrap; gap:12px; font-size:0.8rem; color:var(--text-secondary);">
            <div><strong>Total Santri:</strong> ${items.length} Anak</div>
            <div><strong>Kamar:</strong> ${esc(log.roomName)}</div>
          </div>
        </div>
      `;
    }

    const tbody = document.getElementById('m-table-session-detail-body');
    if (tbody) {
      tbody.innerHTML = (log.items || []).map((item, idx) => {
        let badgeClass = 'badge-hadir';
        if (item.status === 'izin') badgeClass = 'badge-izin';
        if (item.status === 'sakit') badgeClass = 'badge-sakit';
        if (item.status === 'pulang') badgeClass = 'badge-pulang';

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <strong>${esc(item.studentName)}</strong>
              <div style="font-size:0.72rem; color:var(--text-muted); font-family:var(--font-mono);">NIS: ${esc(item.nis || '-')} | Kelas: ${esc(item.class || '-')}</div>
            </td>
            <td><span class="badge ${badgeClass}">${esc((item.status || 'HADIR').toUpperCase())}</span></td>
            <td style="font-size:0.82rem;">${item.note ? esc(item.note) : '<span style="color:var(--text-muted);">-</span>'}</td>
          </tr>
        `;
      }).join('');
    }

    const btnEditAdmin = document.getElementById('btn-edit-session-admin');
    if (btnEditAdmin) {
      const isAdmin = this.currentUser && this.currentUser.role === 'admin';
      btnEditAdmin.style.display = isAdmin ? 'inline-flex' : 'none';
    }

    this.openModal('modal-session-detail');
  }

  editPastSessionByAdmin() {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.showToast('Hanya Administrator yang memiliki akses untuk mengubah absensi tanggal lampau!', 'error');
      return;
    }
    const log = window.store.getAttendanceLogs().find(l => l.id === this.activeDetailLogId);
    if (!log) return;

    this.closeModal('modal-session-detail');
    this.switchView('view-absen');

    const selectRoom = document.getElementById('select-absen-room');
    const selectSession = document.getElementById('select-absen-session');
    const dateInput = document.getElementById('input-absen-date');

    if (selectRoom) selectRoom.value = log.roomId;
    if (selectSession) selectSession.value = log.sessionId;
    if (dateInput) dateInput.value = log.date;

    this.loadStudentListForAttendance();
    this.showToast(`Mode Edit Admin: Absensi ${log.roomName} (${log.date}) dimuat.`, 'info');
  }

  renderAdminCriteria() {
    const tbody = document.getElementById('table-admin-criteria-body');
    if (!tbody) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const criteria = window.store.getCriteria();
    tbody.innerHTML = criteria.map(c => `
      <tr>
        <td style="font-family:var(--font-mono); font-weight:700;">${esc(c.id.toUpperCase())}</td>
        <td><strong>${esc(c.label)}</strong></td>
        <td>
          <span class="badge" style="background-color:${esc(c.bgColor)}; color:${esc(c.color)}; border:1px solid ${esc(c.borderColor)};">
            ${esc(c.label)}
          </span>
        </td>
        <td style="font-size:0.85rem; color:var(--text-secondary);">${esc(c.desc)}</td>
        <td>
          <button class="btn btn-secondary" style="min-height:30px; padding:3px 8px; font-size:0.75rem;" onclick="app.openEditCriterionModal('${esc(c.id)}')">
            Ubah
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderAdminSessions() {
    const tbody = document.getElementById('table-admin-sessions-body');
    if (!tbody) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const sessions = window.store.getSessions();
    tbody.innerHTML = sessions.map(s => `
      <tr>
        <td style="font-family:var(--font-mono); font-weight:700;">#${s.order}</td>
        <td style="font-family:var(--font-mono); font-weight:600;">${esc(s.id)}</td>
        <td><strong>${esc(s.label)}</strong></td>
        <td style="font-family:var(--font-mono);">${esc(s.timeRange)}</td>
        <td><span class="badge ${s.active !== false ? 'badge-hadir' : 'badge-sakit'}">${s.active !== false ? '✅ Aktif' : '🚫 Non-Aktif'}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary" style="min-height:30px; padding:3px 8px; font-size:0.75rem;" onclick="app.openEditSessionModal('${esc(s.id)}')">
              Ubah
            </button>
            <button class="btn btn-danger" style="min-height:30px; padding:3px 8px; font-size:0.75rem;" onclick="app.deleteSessionPrompt('${esc(s.id)}')">
              Hapus
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderAdminUsers() {
    const tbody = document.getElementById('table-admin-users-body');
    if (!tbody) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const users = window.store.getUsers();
    tbody.innerHTML = users.map(u => {
      const room = u.roomId ? window.store.getRoomById(u.roomId) : null;
      const pwd = u.plainPassword || u.password || (u.username === 'admin' ? 'admin123' : `${u.username}123`);
      const isInactive = u.status === 'inactive';
      return `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700;">@${esc(u.username)}</td>
          <td><strong>${esc(u.name)}</strong></td>
          <td>
            <span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-hadir'}">
              ${u.role === 'admin' ? 'Administrator' : 'Bapak Kamar'}
            </span>
          </td>
          <td>${esc(room ? room.name.split(' - ')[0] : 'Semua Kamar')}</td>
          <td>
            <div class="password-cell" style="display:flex; align-items:center; gap:5px;">
              <span class="password-text" id="pwd-val-${esc(u.username)}" data-plain="${esc(pwd)}" style="font-family:var(--font-mono); font-size:0.85rem; font-weight:600;">••••••</span>
              <button type="button" class="btn-icon-xs" title="Lihat/Sembunyikan Kata Sandi" onclick="app.toggleShowUserPassword('${esc(u.username)}')">👁️</button>
              <button type="button" class="btn-icon-xs" title="Salin Kata Sandi" onclick="app.copyUserPassword('${esc(u.username)}')">📋</button>
              <button type="button" class="btn btn-secondary" style="min-height:24px; padding:1px 6px; font-size:0.7rem; margin-left:2px;" title="Ganti Kata Sandi Akun" onclick="app.promptResetUserPassword('${esc(u.username)}')">Ganti</button>
            </div>
          </td>
          <td>
            <span class="badge ${isInactive ? 'badge-sakit' : 'badge-hadir'}">
              ${isInactive ? '🚫 Non-Aktif' : '✅ Aktif'}
            </span>
          </td>
          <td style="font-family:var(--font-mono); font-size:0.8rem;">${esc(u.phone || '-')}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary" style="min-height:30px; padding:3px 8px; font-size:0.75rem;" onclick="app.openEditUserModal('${esc(u.username)}')">
                Edit / Akses
              </button>
              ${u.username !== 'admin' ? `
              <button class="btn btn-danger" style="min-height:30px; padding:3px 8px; font-size:0.75rem;" onclick="app.deleteUserPrompt('${esc(u.username)}')">
                Hapus
              </button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  deleteUserPrompt(username) {
    if (this.currentUser && this.currentUser.username.toLowerCase() === username.toLowerCase()) {
      this.showToast('Tidak dapat menghapus akun Anda sendiri saat sedang login.', 'error');
      return;
    }
    const user = window.store.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return;
    if (confirm(`Yakin ingin menghapus akun pengguna: @${user.username} (${user.name})?`)) {
      window.store.deleteUser(username);
      this.showToast(`Akun @${username} berhasil dihapus.`, 'info');
      this.renderAdminUsers();
      this.renderAdminRooms();
    }
  }

  async promptResetUserPassword(username) {
    const user = window.store.getUser(username);
    if (!user) return;
    const currentPass = user.plainPassword || user.password || (user.username === 'admin' ? 'admin123' : `${user.username}123`);
    const newPass = prompt(`Ganti kata sandi untuk @${user.username} (${user.name}):\n\nKata sandi saat ini: ${currentPass}\n\nMasukkan kata sandi baru (minimal 6 karakter):`, currentPass);
    if (newPass === null) return;
    const cleanPass = newPass.trim();
    if (cleanPass.length < 6) {
      this.showToast('Kata sandi baru minimal 6 karakter!', 'error');
      return;
    }
    user.plainPassword = cleanPass;
    user.password = cleanPass;
    if (window.SecurityUtils) {
      user.passwordHash = await window.SecurityUtils.hashPassword(cleanPass);
    }
    await window.store.saveUser(user);
    this.showToast(`Kata sandi @${user.username} berhasil diubah menjadi: ${cleanPass}`, 'success');
    this.renderAdminUsers();
  }

  toggleShowUserPassword(username) {
    const el = document.getElementById(`pwd-val-${username}`);
    if (!el) return;
    const plain = el.getAttribute('data-plain') || '';
    if (el.textContent === '••••••') {
      el.textContent = plain;
      el.style.color = 'var(--primary-color, #1e40af)';
    } else {
      el.textContent = '••••••';
      el.style.color = '';
    }
  }

  copyUserPassword(username) {
    const el = document.getElementById(`pwd-val-${username}`);
    const plain = el ? el.getAttribute('data-plain') : '';
    if (!plain) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(plain).then(() => {
        this.showToast(`Kata sandi @${username} disalin: ${plain}`, 'success');
      }).catch(() => {
        this.showToast(`Kata sandi @${username}: ${plain}`, 'info');
      });
    } else {
      this.showToast(`Kata sandi @${username}: ${plain}`, 'info');
    }
  }

  // --- MODAL CONTROLLERS ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  openEditRoomModal(roomId) {
    const room = window.store.getRoomById(roomId);
    if (!room) return;

    this.populateUserSelectForRoom('modal-room-pj');

    document.getElementById('modal-room-id').value = room.id;
    document.getElementById('modal-room-name').value = room.name;
    document.getElementById('modal-room-pj').value = room.pjId;
    document.getElementById('modal-room-capacity').value = room.capacity || 10;
    document.getElementById('modal-room-floor').value = room.floor || '';

    document.getElementById('modal-room-title').textContent = 'Edit Data Kamar';
    this.openModal('modal-room');
  }

  openAddRoomModal() {
    this.populateUserSelectForRoom('modal-room-pj');

    const nextNum = window.store.getRooms().length + 1;
    document.getElementById('modal-room-id').value = `kamar-${nextNum}`;
    document.getElementById('modal-room-name').value = `Kamar ${nextNum} - Baru`;
    document.getElementById('modal-room-capacity').value = 10;
    document.getElementById('modal-room-floor').value = 'Lantai 1';

    document.getElementById('modal-room-title').textContent = 'Tambah Kamar Asrama';
    this.openModal('modal-room');
  }

  populateUserSelectForRoom(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const users = window.store.getUsers().filter(u => u.role === 'bapak_kamar');
    sel.innerHTML = users.map(u => `<option value="${esc(u.username)}">${esc(u.name)} (@${esc(u.username)})</option>`).join('');
  }

  openAddStudentModal() {
    this.populateRoomSelector('modal-student-room');

    document.getElementById('modal-student-id').value = `std-${Date.now()}`;
    document.getElementById('modal-student-nis').value = '';
    document.getElementById('modal-student-name').value = '';
    document.getElementById('modal-student-class').value = '10-A';
    document.getElementById('modal-student-parent').value = '';

    document.getElementById('modal-student-title').textContent = 'Tambah Santri Baru';
    this.openModal('modal-student');
  }

  openEditStudentModal(studentId) {
    const std = window.store.getStudentById(studentId);
    if (!std) return;

    this.populateRoomSelector('modal-student-room');

    document.getElementById('modal-student-id').value = std.id;
    document.getElementById('modal-student-nis').value = std.nis;
    document.getElementById('modal-student-name').value = std.name;
    document.getElementById('modal-student-room').value = std.roomId;
    document.getElementById('modal-student-class').value = std.class;
    document.getElementById('modal-student-parent').value = std.parentContact || '';

    document.getElementById('modal-student-title').textContent = 'Edit Data Santri';
    this.openModal('modal-student');
  }

  deleteStudentPrompt(studentId) {
    const std = window.store.getStudentById(studentId);
    if (!std) return;
    if (confirm(`Yakin ingin menghapus santri: ${std.name}?`)) {
      window.store.deleteStudent(studentId);
      this.showToast('Data santri berhasil dihapus.', 'info');
      this.renderAdminStudents();
      this.renderDashboard();
      if (this.currentView === 'view-absen') {
        this.loadStudentListForAttendance();
      }
      if (this.currentView === 'view-rekap') {
        this.renderRekapView();
      }
    }
  }

  openAddCriterionModal() {
    document.getElementById('modal-criterion-id').value = '';
    document.getElementById('modal-criterion-id').readOnly = false;
    document.getElementById('modal-criterion-label').value = '';
    document.getElementById('modal-criterion-color').value = '#059669';
    document.getElementById('modal-criterion-desc').value = '';
    document.getElementById('modal-criterion-title').textContent = 'Tambah Kriteria Status Baru';
    this.openModal('modal-criterion');
  }

  openEditCriterionModal(criterionId) {
    const crit = window.store.getCriteria().find(c => c.id === criterionId);
    if (!crit) return;

    document.getElementById('modal-criterion-id').value = crit.id;
    document.getElementById('modal-criterion-id').readOnly = true;
    document.getElementById('modal-criterion-label').value = crit.label;
    document.getElementById('modal-criterion-color').value = crit.color;
    document.getElementById('modal-criterion-desc').value = crit.desc;
    document.getElementById('modal-criterion-title').textContent = 'Edit Kriteria Status Kehadiran';

    this.openModal('modal-criterion');
  }

  deleteCriterionPrompt(criterionId) {
    const crit = window.store.getCriteria().find(c => c.id === criterionId);
    if (!crit) return;
    if (['hadir', 'izin', 'sakit', 'pulang'].includes(criterionId)) {
      this.showToast('Kriteria bawaan sistem tidak boleh dihapus.', 'warning');
      return;
    }
    if (confirm(`Hapus kriteria status: ${crit.label}?`)) {
      window.store.deleteCriterion(criterionId);
      this.showToast('Kriteria berhasil dihapus.', 'info');
      this.renderAdminCriteria();
    }
  }

  openAddSessionModal() {
    const sessions = window.store.getSessions();
    const nextOrder = sessions.length + 1;
    document.getElementById('modal-session-id').value = '';
    document.getElementById('modal-session-id').readOnly = false;
    document.getElementById('modal-session-label').value = '';
    document.getElementById('modal-session-timerange').value = '18:00 - 19:30';
    document.getElementById('modal-session-order').value = nextOrder;
    document.getElementById('modal-session-title').textContent = 'Tambah Sesi Waktu Absensi';
    this.openModal('modal-session');
  }

  openEditSessionModal(sessionId) {
    const sess = window.store.getSessions().find(s => s.id === sessionId);
    if (!sess) return;

    document.getElementById('modal-session-id').value = sess.id;
    document.getElementById('modal-session-id').readOnly = true;
    document.getElementById('modal-session-label').value = sess.label;
    document.getElementById('modal-session-timerange').value = sess.timeRange;
    document.getElementById('modal-session-order').value = sess.order || 1;
    document.getElementById('modal-session-title').textContent = 'Edit Pengaturan Sesi Absen';

    this.openModal('modal-session');
  }

  deleteSessionPrompt(sessionId) {
    const sess = window.store.getSessions().find(s => s.id === sessionId);
    if (!sess) return;
    if (['pagi', 'siang', 'sore', 'malam'].includes(sessionId)) {
      this.showToast('4 sesi utama harian tidak boleh dihapus.', 'warning');
      return;
    }
    if (confirm(`Hapus sesi waktu: ${sess.label}?`)) {
      window.store.deleteSession(sessionId);
      this.showToast('Sesi absensi berhasil dihapus.', 'info');
      this.renderAdminSessions();
      this.renderDashboard();
    }
  }

  openAddUserModal() {
    this.populateRoomSelector('modal-user-room', true);

    document.getElementById('modal-user-username').value = '';
    document.getElementById('modal-user-username').readOnly = false;
    const pwdInput = document.getElementById('modal-user-password');
    if (pwdInput) {
      pwdInput.value = '123456';
      pwdInput.type = 'password';
      pwdInput.placeholder = 'Kata sandi akun (min. 6 karakter)';
      pwdInput.required = true;
    }
    document.getElementById('modal-user-fullname').value = '';
    document.getElementById('modal-user-role').value = 'bapak_kamar';
    document.getElementById('modal-user-status').value = 'active';
    document.getElementById('modal-user-room').value = '';
    document.getElementById('modal-user-phone').value = '';

    document.getElementById('modal-user-title').textContent = 'Tambah Akun Pengguna / PJ';
    this.openModal('modal-user');
  }

  openEditUserModal(username) {
    const u = window.store.getUser(username);
    if (!u) return;

    this.populateRoomSelector('modal-user-room', true);

    document.getElementById('modal-user-username').value = u.username;
    document.getElementById('modal-user-username').readOnly = true;
    const currentPass = u.plainPassword || u.password || (u.username === 'admin' ? 'admin123' : `${u.username}123`);
    const pwdInput = document.getElementById('modal-user-password');
    if (pwdInput) {
      pwdInput.value = currentPass;
      pwdInput.type = 'password';
      pwdInput.placeholder = 'Ubah kata sandi akun di sini';
      pwdInput.required = true;
    }
    document.getElementById('modal-user-fullname').value = u.name;
    document.getElementById('modal-user-role').value = u.role;
    document.getElementById('modal-user-status').value = u.status || 'active';
    document.getElementById('modal-user-room').value = u.roomId || '';
    document.getElementById('modal-user-phone').value = u.phone || '';

    document.getElementById('modal-user-title').textContent = `Edit & Izin Akses Akun: @${u.username}`;
    this.openModal('modal-user');
  }

  // --- SELF PROFILE & PASSWORD CONTROLLER (Every user and admin) ---
  openSelfProfileModal() {
    if (!this.currentUser) return;
    const user = window.store.getUser(this.currentUser.username);
    if (!user) return;

    const initials = user.name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();

    const avatarEl = document.getElementById('self-profile-avatar');
    const userEl = document.getElementById('self-profile-username-display');
    const roleBadgeEl = document.getElementById('self-profile-role-badge');
    const nameInput = document.getElementById('self-profile-fullname');
    const phoneInput = document.getElementById('self-profile-phone');
    const newPass = document.getElementById('self-profile-new-password');
    const confPass = document.getElementById('self-profile-confirm-password');

    if (avatarEl) avatarEl.textContent = initials;
    if (userEl) userEl.textContent = `@${user.username}`;
    if (roleBadgeEl) {
      roleBadgeEl.textContent = user.role === 'admin' ? 'Administrator Pusat' : 'Bapak Kamar (PJ Kamar)';
      roleBadgeEl.className = `badge ${user.role === 'admin' ? 'badge-primary' : 'badge-hadir'}`;
    }
    if (nameInput) nameInput.value = user.name;
    if (phoneInput) phoneInput.value = user.phone || '';
    if (newPass) newPass.value = '';
    if (confPass) confPass.value = '';

    this.openModal('modal-profile');
  }

  // --- BACKUP & RESTORE DATABASE JSON (SECURE) ---
  exportDatabaseJSON() {
    const sanitizedData = window.store.getSanitizedExport();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sanitizedData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `backup_absensi_asrama_${Date.now()}.json`);
    dlAnchorElem.click();
    this.showToast('Backup database JSON berhasil diunduh (kredensial terlindungi)!', 'success');
  }

  importDatabaseJSON() {
    const fileInput = document.getElementById('input-restore-file');
    if (!fileInput || !fileInput.files.length) {
      this.showToast('Pilih file JSON backup terlebih dahulu!', 'error');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawParsed = JSON.parse(e.target.result);
        const parsed = window.SecurityUtils ? window.SecurityUtils.sanitizeObject(rawParsed) : rawParsed;
        if (parsed && Array.isArray(parsed.rooms) && Array.isArray(parsed.students)) {
          window.store.data = parsed;
          window.store.save();
          this.showToast('Database berhasil dipulihkan secara aman!', 'success');
          this.closeModal('modal-backup');
          this.renderDashboard();
          this.renderAdminView();
        } else {
          this.showToast('Format file backup JSON tidak valid atau struktur rusak!', 'error');
        }
      } catch (err) {
        this.showToast('Gagal memproses file JSON!', 'error');
      }
    };
    reader.readAsText(file);
  }

  resetAllDatabase() {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh database asrama ke data bawaan? Semua absensi baru akan terhapus.')) {
      window.store.resetToDefaults();
      this.showToast('Database telah direset ke data bawaan.', 'info');
      this.closeModal('modal-backup');
      this.renderDashboard();
      this.renderAdminView();
    }
  }

  // --- HELPER POPULATORS & EVENT SETUP ---
  populateRoomSelector(selectId, includeAllOption = false) {
    const sel = document.getElementById(selectId);
    if (!sel) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;
    const rooms = window.store.getRooms();
    const currentVal = sel.value;

    let html = '';
    if (includeAllOption) {
      html += '<option value="all">Semua Kamar Asrama</option>';
    }

    html += rooms.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
    sel.innerHTML = html;

    if (currentVal && Array.from(sel.options).some(o => o.value === currentVal)) {
      sel.value = currentVal;
    }
  }

  setupDatePickers() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const absenDate = document.getElementById('input-absen-date');
    if (absenDate) absenDate.value = dateStr;

    const monthSelect = document.getElementById('rekap-select-month');
    if (monthSelect) monthSelect.value = String(today.getMonth() + 1);
    const yearSelect = document.getElementById('rekap-select-year');
    if (yearSelect) yearSelect.value = String(today.getFullYear());
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSpan = document.createElement('span');
    iconSpan.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    const msgDiv = document.createElement('div');
    msgDiv.style.flex = '1';
    // Defense-in-depth: use textContent so message strings can never execute arbitrary HTML
    msgDiv.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(msgDiv);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3200);
  }

  setupEventListeners() {
    // Navigation Brand Link
    const brand = document.getElementById('btn-brand-home');
    if (brand) {
      brand.addEventListener('click', () => this.switchView(this.currentUser ? 'view-dashboard' : 'view-login'));
    }

    // Global listener when Supabase finishes background sync
    window.addEventListener('supabase-data-synced', () => {
      this.onCloudSyncComplete();
    });

    // Desktop Nav Items
    const dDash = document.getElementById('nav-desk-dashboard');
    const dAbsen = document.getElementById('nav-desk-absen');
    const dRekap = document.getElementById('nav-desk-rekap');
    const dAdmin = document.getElementById('nav-desk-admin');

    if (dDash) dDash.addEventListener('click', () => this.switchView('view-dashboard'));
    if (dAbsen) dAbsen.addEventListener('click', () => this.switchView('view-absen'));
    if (dRekap) dRekap.addEventListener('click', () => this.switchView('view-rekap'));
    if (dAdmin) dAdmin.addEventListener('click', () => this.switchView('view-admin'));

    // Mobile Bottom Nav Items
    const bHome = document.getElementById('btn-nav-home');
    const bAbsen = document.getElementById('btn-nav-absen');
    const bRekap = document.getElementById('btn-nav-rekap');
    const bAdmin = document.getElementById('btn-nav-admin');

    if (bHome) bHome.addEventListener('click', () => this.switchView('view-dashboard'));
    if (bAbsen) bAbsen.addEventListener('click', () => this.switchView('view-absen'));
    if (bRekap) bRekap.addEventListener('click', () => this.switchView('view-rekap'));
    if (bAdmin) {
      bAdmin.addEventListener('click', () => {
        if (!this.currentUser) this.switchView('view-login');
        else if (this.currentUser.role === 'admin') this.switchView('view-admin');
        else this.showToast(`Login sebagai: ${this.currentUser.name} (Bapak Kamar)`, 'info');
      });
    }

    // Dashboard Quick Actions
    const qStart = document.getElementById('btn-quick-start-absen');
    const qRekap = document.getElementById('btn-quick-view-rekap');
    if (qStart) qStart.addEventListener('click', () => this.switchView('view-absen'));
    if (qRekap) qRekap.addEventListener('click', () => this.switchView('view-rekap'));

    // Auth Tabs
    const tabLogin = document.getElementById('tab-auth-login');
    const tabReg = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');

    if (tabLogin && tabReg && formLogin && formReg) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
        formLogin.style.display = 'flex';
        formReg.style.display = 'none';
      });
      tabReg.addEventListener('click', () => {
        tabReg.classList.add('active');
        tabLogin.classList.remove('active');
        formReg.style.display = 'flex';
        formLogin.style.display = 'none';
        this.populateRoomSelector('reg-room');
      });
    }

    // Login Form Submit (Async)
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value.trim();
        const p = document.getElementById('login-password').value;
        await this.login(u, p);
      });
    }

    // Register Form Submit (Async)
    if (formReg) {
      formReg.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
          name: document.getElementById('reg-fullname').value.trim(),
          username: document.getElementById('reg-username').value.trim().toLowerCase(),
          password: document.getElementById('reg-password').value,
          role: document.getElementById('reg-role').value,
          roomId: document.getElementById('reg-room').value,
          phone: document.getElementById('reg-phone').value.trim()
        };
        await this.register(userData);
      });
    }

    // Self Profile & Password Form Submit (Every user & admin)
    const formProfile = document.getElementById('form-self-profile');
    if (formProfile) {
      formProfile.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!this.currentUser) return;

        const user = window.store.getUser(this.currentUser.username);
        if (!user) return;

        const newName = document.getElementById('self-profile-fullname').value.trim();
        const newPhone = document.getElementById('self-profile-phone').value.trim();
        const newPass = document.getElementById('self-profile-new-password').value;
        const confPass = document.getElementById('self-profile-confirm-password').value;

        if (window.SecurityUtils) {
          const vName = window.SecurityUtils.validateInput(newName, 'text', 80);
          if (!vName.valid) {
            this.showToast(`Nama: ${vName.message}`, 'error');
            return;
          }
        }

        user.name = newName;
        user.phone = newPhone;

        if (newPass) {
          if (newPass.length < 6) {
            this.showToast('Kata sandi baru minimal 6 karakter!', 'error');
            return;
          }
          if (newPass !== confPass) {
            this.showToast('Konfirmasi kata sandi tidak cocok!', 'error');
            return;
          }
          // Secure password hashing with Web Crypto API SHA-256 + Salt
          user.passwordHash = await window.SecurityUtils.hashPassword(newPass);
          delete user.password;
          delete user.plainPassword;
          delete user.salt;
        }

        await window.store.saveUser(user);

        // Update active session in memory and localStorage
        const { password: p, passwordHash: ph, ...safeSessionUser } = user;
        this.currentUser = safeSessionUser;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeSessionUser));

        this.showToast('Profil & kata sandi berhasil diperbarui!', 'success');
        this.playAudioFeedback('success');
        this.closeModal('modal-profile');
        this.renderActiveUser();
        this.renderDashboard();
      });
    }

    // Attendance Input Changes
    const selAbsenRoom = document.getElementById('select-absen-room');
    const selAbsenSess = document.getElementById('select-absen-session');
    const inpAbsenDate = document.getElementById('input-absen-date');

    if (selAbsenRoom) selAbsenRoom.addEventListener('change', () => this.loadStudentListForAttendance());
    if (selAbsenSess) selAbsenSess.addEventListener('change', () => this.loadStudentListForAttendance());
    if (inpAbsenDate) inpAbsenDate.addEventListener('change', () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const isPJ = this.currentUser && this.currentUser.role !== 'admin';
      if (isPJ && inpAbsenDate.value !== todayStr) {
        inpAbsenDate.value = todayStr;
        this.showToast('PJ hanya dapat menginput absensi untuk hari yang sedang berjalan.', 'warning');
      }
      this.loadStudentListForAttendance();
    });

    // Dynamic Student Search Input
    const inputSearchStudent = document.getElementById('input-search-student-add');
    if (inputSearchStudent) {
      inputSearchStudent.addEventListener('input', (e) => {
        this.studentPickerQuery = e.target.value;
        this.populateStudentAddPicker();
      });
      inputSearchStudent.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addStudentToCurrentSession();
        }
      });
    }

    // Room Filter Chips for Student Picker
    const chipsContainer = document.getElementById('chips-filter-student-room');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.room-filter-chip');
        if (!chip) return;
        chipsContainer.querySelectorAll('.room-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.studentPickerRoomFilter = chip.getAttribute('data-room') || 'all';
        this.populateStudentAddPicker();
      });
    }

    // Dynamic Student Add & Load Defaults Buttons
    const btnAddStudentToSession = document.getElementById('btn-add-student-to-session');
    if (btnAddStudentToSession) btnAddStudentToSession.addEventListener('click', () => this.addStudentToCurrentSession());

    const btnLoadRoomDefaults = document.getElementById('btn-load-room-defaults');
    if (btnLoadRoomDefaults) btnLoadRoomDefaults.addEventListener('click', () => this.loadRoomDefaultStudents());

    // Bulk Hadir Button
    const btnBulk = document.getElementById('btn-bulk-hadir');
    if (btnBulk) btnBulk.addEventListener('click', () => this.bulkMarkAllHadir());

    // Save Attendance Buttons (Mobile bottom & Desktop top)
    const btnSaveTop = document.getElementById('btn-save-attendance-top');
    const btnSaveBottom = document.getElementById('btn-save-attendance-bottom');
    if (btnSaveTop) btnSaveTop.addEventListener('click', () => this.saveAttendance());
    if (btnSaveBottom) btnSaveBottom.addEventListener('click', () => this.saveAttendance());

    // Rekap Tabs
    const tabRekapPj = document.getElementById('tab-rekap-pj');
    const tabRekapStd = document.getElementById('tab-rekap-students');
    const tabRekapLog = document.getElementById('tab-rekap-logs');

    const subPj = document.getElementById('subpanel-rekap-pj');
    const subStd = document.getElementById('subpanel-rekap-students');
    const subLog = document.getElementById('subpanel-rekap-logs');

    const setRekapTab = (activeTab, activeSub) => {
      [tabRekapPj, tabRekapStd, tabRekapLog].forEach(t => t && t.classList.remove('active'));
      [subPj, subStd, subLog].forEach(s => s && (s.style.display = 'none'));
      if (activeTab) activeTab.classList.add('active');
      if (activeSub) activeSub.style.display = 'block';
    };

    if (tabRekapPj) tabRekapPj.addEventListener('click', () => setRekapTab(tabRekapPj, subPj));
    if (tabRekapStd) tabRekapStd.addEventListener('click', () => setRekapTab(tabRekapStd, subStd));
    if (tabRekapLog) tabRekapLog.addEventListener('click', () => setRekapTab(tabRekapLog, subLog));

    // Rekap Filter Changes
    const rMonth = document.getElementById('rekap-select-month');
    const rYear = document.getElementById('rekap-select-year');
    const rRoom = document.getElementById('rekap-select-room');
    const rFilterPerc = document.getElementById('rekap-filter-percentage');
    const rSortPerc = document.getElementById('rekap-sort-percentage');

    if (rMonth) rMonth.addEventListener('change', () => this.renderRekapView());
    if (rYear) rYear.addEventListener('change', () => this.renderRekapView());
    if (rRoom) rRoom.addEventListener('change', () => this.renderRekapView());
    if (rFilterPerc) rFilterPerc.addEventListener('change', () => this.renderRekapView());
    if (rSortPerc) rSortPerc.addEventListener('change', () => this.renderRekapView());

    // Rekap Logs Specific Filters & Real-Time Search
    const rLogSearch = document.getElementById('rekap-log-search');
    const rLogFilterPj = document.getElementById('rekap-log-filter-pj');
    const rLogFilterSess = document.getElementById('rekap-log-filter-session');

    const updateLogTable = () => {
      const year = parseInt(document.getElementById('rekap-select-year')?.value) || new Date().getFullYear();
      const month = parseInt(document.getElementById('rekap-select-month')?.value) || (new Date().getMonth() + 1);
      const roomId = document.getElementById('rekap-select-room')?.value || 'all';
      this.renderRekapLogsTable(year, month, roomId);
    };

    if (rLogSearch) rLogSearch.addEventListener('input', updateLogTable);
    if (rLogFilterPj) rLogFilterPj.addEventListener('change', updateLogTable);
    if (rLogFilterSess) rLogFilterSess.addEventListener('change', updateLogTable);

    // Rekap Export & Print
    const btnPrint = document.getElementById('btn-print-rekap');
    const btnCsv = document.getElementById('btn-export-csv');
    if (btnPrint) btnPrint.addEventListener('click', () => this.printReport());
    if (btnCsv) btnCsv.addEventListener('click', () => this.exportCSV());

    // Admin Tabs
    const tabAdminRooms = document.getElementById('tab-admin-rooms');
    const tabAdminStudents = document.getElementById('tab-admin-students');
    const tabAdminCriteria = document.getElementById('tab-admin-criteria');
    const tabAdminSessions = document.getElementById('tab-admin-sessions');
    const tabAdminUsers = document.getElementById('tab-admin-users');
    const tabAdminPjMon = document.getElementById('tab-admin-pj-monitoring');

    const panelRooms = document.getElementById('admin-panel-rooms');
    const panelStudents = document.getElementById('admin-panel-students');
    const panelCriteria = document.getElementById('admin-panel-criteria');
    const panelSessions = document.getElementById('admin-panel-sessions');
    const panelUsers = document.getElementById('admin-panel-users');
    const panelPjMon = document.getElementById('admin-panel-pj-monitoring');

    const allAdminTabs = [tabAdminRooms, tabAdminStudents, tabAdminCriteria, tabAdminSessions, tabAdminUsers, tabAdminPjMon];
    const allAdminPanels = [panelRooms, panelStudents, panelCriteria, panelSessions, panelUsers, panelPjMon];

    const setAdminTab = (activeTab, activePanel) => {
      allAdminTabs.forEach(t => t && t.classList.remove('active'));
      allAdminPanels.forEach(p => p && (p.style.display = 'none'));
      if (activeTab) activeTab.classList.add('active');
      if (activePanel) activePanel.style.display = 'block';
    };

    if (tabAdminRooms) tabAdminRooms.addEventListener('click', () => setAdminTab(tabAdminRooms, panelRooms));
    if (tabAdminStudents) tabAdminStudents.addEventListener('click', () => setAdminTab(tabAdminStudents, panelStudents));
    if (tabAdminCriteria) tabAdminCriteria.addEventListener('click', () => setAdminTab(tabAdminCriteria, panelCriteria));
    if (tabAdminSessions) tabAdminSessions.addEventListener('click', () => setAdminTab(tabAdminSessions, panelSessions));
    if (tabAdminUsers) tabAdminUsers.addEventListener('click', () => setAdminTab(tabAdminUsers, panelUsers));
    if (tabAdminPjMon) tabAdminPjMon.addEventListener('click', () => {
      setAdminTab(tabAdminPjMon, panelPjMon);
      this.renderAdminPjMonitoring();
    });

    // Admin PJ Monitoring Filters & Controls
    const adminPjMonth = document.getElementById('admin-pj-month');
    const adminPjYear = document.getElementById('admin-pj-year');
    const adminPjSort = document.getElementById('admin-pj-sort');
    const adminPjFilterBadge = document.getElementById('admin-pj-filter-badge');
    const btnExportPj = document.getElementById('btn-admin-export-pj-recap');

    const refreshPjMon = () => this.renderAdminPjMonitoring();
    if (adminPjMonth) adminPjMonth.addEventListener('change', refreshPjMon);
    if (adminPjYear) adminPjYear.addEventListener('change', refreshPjMon);
    if (adminPjSort) adminPjSort.addEventListener('change', refreshPjMon);
    if (adminPjFilterBadge) adminPjFilterBadge.addEventListener('change', refreshPjMon);
    if (btnExportPj) btnExportPj.addEventListener('click', () => this.exportPjRecapCSV());

    // Admin Student Filter
    const fStdRoom = document.getElementById('admin-filter-student-room');
    if (fStdRoom) fStdRoom.addEventListener('change', () => this.renderAdminStudents());

    // Admin Modal Buttons
    const btnAddRoom = document.getElementById('btn-add-room');
    const btnAddStudent = document.getElementById('btn-add-student');
    const btnAddCriterion = document.getElementById('btn-add-criterion');
    const btnAddSession = document.getElementById('btn-add-session');
    const btnAddUser = document.getElementById('btn-add-user');
    const btnAdminBackup = document.getElementById('btn-admin-backup');
    const btnToggleUserPwd = document.getElementById('btn-toggle-modal-user-pwd');

    const btnCleanMock = document.getElementById('btn-clean-mock-students');
    if (btnCleanMock) {
      btnCleanMock.addEventListener('click', async () => {
        if (confirm('Bersihkan seluruh santri contoh bawaan dan log absensi pengujian? Data santri asli yang telah Anda buat tidak akan terhapus.')) {
          this.playHaptic(40);
          window.store.cleanLegacyMockData();
          if (window.SupabaseSync) {
            const mockIds = [];
            for (let r = 1; r <= 6; r++) {
              for (let s = 1; s <= 6; s++) {
                mockIds.push(`std-${r}0${s}`);
              }
            }
            for (const id of mockIds) {
              await window.SupabaseSync.deleteStudent(id);
            }
          }
          this.showToast('Data santri contoh dan pengujian berhasil dibersihkan!', 'success');
          this.renderAdminStudents();
          this.renderDashboard();
          if (this.currentView === 'view-absen') this.loadStudentListForAttendance();
          if (this.currentView === 'view-rekap') this.renderRekapView();
        }
      });
    }

    if (btnAddRoom) btnAddRoom.addEventListener('click', () => this.openAddRoomModal());
    if (btnAddStudent) btnAddStudent.addEventListener('click', () => this.openAddStudentModal());
    if (btnAddCriterion) btnAddCriterion.addEventListener('click', () => this.openAddCriterionModal());
    if (btnAddSession) btnAddSession.addEventListener('click', () => this.openAddSessionModal());
    if (btnAddUser) btnAddUser.addEventListener('click', () => this.openAddUserModal());
    if (btnAdminBackup) btnAdminBackup.addEventListener('click', () => this.openModal('modal-backup'));

    if (btnToggleUserPwd) {
      btnToggleUserPwd.addEventListener('click', () => {
        const inp = document.getElementById('modal-user-password');
        if (inp) {
          inp.type = inp.type === 'password' ? 'text' : 'password';
        }
      });
    }

    // Modal Form Submissions
    const fMRoom = document.getElementById('form-modal-room');
    if (fMRoom) {
      fMRoom.addEventListener('submit', (e) => {
        e.preventDefault();
        const pjUsername = document.getElementById('modal-room-pj').value;
        const pjUser = window.store.getUser(pjUsername);
        const room = {
          id: document.getElementById('modal-room-id').value,
          name: document.getElementById('modal-room-name').value.trim(),
          pjId: pjUsername,
          pjName: pjUser ? pjUser.name : pjUsername,
          capacity: parseInt(document.getElementById('modal-room-capacity').value) || 10,
          floor: document.getElementById('modal-room-floor').value.trim()
        };
        window.store.saveRoom(room);
        this.closeModal('modal-room');
        this.showToast('Data kamar berhasil diperbarui!', 'success');
        this.renderAdminRooms();
        this.renderDashboard();
      });
    }

    const fMStudent = document.getElementById('form-modal-student');
    if (fMStudent) {
      fMStudent.addEventListener('submit', (e) => {
        e.preventDefault();
        const std = {
          id: document.getElementById('modal-student-id').value,
          nis: document.getElementById('modal-student-nis').value.trim(),
          name: document.getElementById('modal-student-name').value.trim(),
          roomId: document.getElementById('modal-student-room').value,
          class: document.getElementById('modal-student-class').value.trim(),
          parentContact: document.getElementById('modal-student-parent').value.trim()
        };
        window.store.saveStudent(std);
        this.closeModal('modal-student');
        this.showToast('Data santri berhasil disimpan!', 'success');
        this.renderAdminStudents();
        this.renderDashboard();
        if (this.currentView === 'view-absen') {
          this.loadStudentListForAttendance();
        }
      });
    }

    const fMCrit = document.getElementById('form-modal-criterion');
    if (fMCrit) {
      fMCrit.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('modal-criterion-id').value.trim().toLowerCase();
        const color = document.getElementById('modal-criterion-color').value;
        const crit = {
          id: id,
          label: document.getElementById('modal-criterion-label').value.trim(),
          color: color,
          bgColor: color + '22',
          borderColor: color + '66',
          desc: document.getElementById('modal-criterion-desc').value.trim()
        };
        window.store.saveCriterion(crit);
        this.closeModal('modal-criterion');
        this.showToast('Kriteria status berhasil disimpan!', 'success');
        this.renderAdminCriteria();
      });
    }

    const fMSess = document.getElementById('form-modal-session');
    if (fMSess) {
      fMSess.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('modal-session-id').value.trim().toLowerCase();
        const label = document.getElementById('modal-session-label').value.trim();
        const timeRange = document.getElementById('modal-session-timerange').value.trim();
        const order = parseInt(document.getElementById('modal-session-order').value) || 1;
        const existing = window.store.getSessions().find(s => s.id === id);
        const sess = {
          id: id,
          name: label.split(' ')[0] || id,
          label: label,
          timeRange: timeRange,
          order: order,
          active: existing ? existing.active : true
        };
        window.store.saveSession(sess);
        this.closeModal('modal-session');
        this.showToast('Sesi absensi berhasil disimpan!', 'success');
        this.renderAdminSessions();
        this.renderDashboard();
      });
    }

    const fMUser = document.getElementById('form-modal-user');
    if (fMUser) {
      fMUser.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('modal-user-username').value.trim().toLowerCase();
        const existing = window.store.getUser(username);
        const pass = document.getElementById('modal-user-password').value.trim();
        const status = document.getElementById('modal-user-status').value;

        const user = {
          username: username,
          name: document.getElementById('modal-user-fullname').value.trim(),
          role: document.getElementById('modal-user-role').value,
          status: status,
          roomId: document.getElementById('modal-user-room').value,
          phone: document.getElementById('modal-user-phone').value.trim()
        };

        if (pass) {
          if (pass.length < 6) {
            this.showToast('Kata sandi minimal 6 karakter!', 'error');
            return;
          }
          user.plainPassword = pass;
          user.password = pass;
        } else if (existing) {
          user.plainPassword = existing.plainPassword || existing.password;
          user.password = existing.plainPassword || existing.password;
        } else {
          user.plainPassword = '123456';
          user.password = '123456';
        }

        await window.store.saveUser(user);
        this.closeModal('modal-user');
        this.showToast('Akun pengguna & kata sandi berhasil disimpan!', 'success');
        this.renderAdminUsers();
      });
    }
  }

  // --- ADMIN: PJ KAMAR MONITORING PANEL ---
  renderAdminPjMonitoring() {
    const tableBody = document.getElementById('table-admin-pj-body');
    const summaryRow = document.getElementById('admin-pj-summary-row');
    if (!tableBody) return;

    const esc = str => window.SecurityUtils ? window.SecurityUtils.escapeHTML(str) : str;

    // Read filter values (default to current month/year)
    const today = new Date();
    const monthEl = document.getElementById('admin-pj-month');
    const yearEl = document.getElementById('admin-pj-year');
    const sortEl = document.getElementById('admin-pj-sort');
    const filterBadgeEl = document.getElementById('admin-pj-filter-badge');

    if (monthEl && !monthEl.dataset.initialized) {
      monthEl.value = String(today.getMonth() + 1);
      monthEl.dataset.initialized = '1';
    }
    if (yearEl && !yearEl.dataset.initialized) {
      yearEl.value = String(today.getFullYear());
      yearEl.dataset.initialized = '1';
    }

    const year = parseInt(yearEl?.value) || today.getFullYear();
    const month = parseInt(monthEl?.value) || (today.getMonth() + 1);
    const sortMode = sortEl?.value || 'rate-asc';
    const filterBadge = filterBadgeEl?.value || 'all';

    let recapList = window.store.getBapakKamarRecap(year, month);

    // Apply badge/category filter
    if (filterBadge !== 'all') {
      recapList = recapList.filter(item => {
        if (filterBadge === 'teladan') return item.rate >= 90;
        if (filterBadge === 'baik') return item.rate >= 75 && item.rate < 90;
        if (filterBadge === 'cukup') return item.rate >= 50 && item.rate < 75;
        if (filterBadge === 'evaluasi') return item.rate < 50;
        return true;
      });
    }

    // Apply sorting
    if (sortMode === 'rate-asc') {
      recapList.sort((a, b) => a.rate - b.rate || a.pjName.localeCompare(b.pjName));
    } else if (sortMode === 'rate-desc') {
      recapList.sort((a, b) => b.rate - a.rate || a.pjName.localeCompare(b.pjName));
    } else if (sortMode === 'name') {
      recapList.sort((a, b) => a.pjName.localeCompare(b.pjName));
    } else if (sortMode === 'sessions') {
      recapList.sort((a, b) => b.totalFilledSessions - a.totalFilledSessions || a.pjName.localeCompare(b.pjName));
    }

    // Store filtered list for CSV export
    this._lastPjRecapData = recapList;
    this._lastPjRecapPeriod = { year, month };

    // Summary Stats
    const allData = window.store.getBapakKamarRecap(year, month);
    const totalPj = allData.length;
    const avgRate = totalPj > 0 ? Math.round(allData.reduce((s, i) => s + i.rate, 0) / totalPj) : 0;
    const teladanCount = allData.filter(i => i.rate >= 90).length;
    const evaluasiCount = allData.filter(i => i.rate < 50).length;

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    if (summaryRow) {
      summaryRow.innerHTML = `
        <div style="padding:12px 14px; border-radius:10px; background:var(--bg-secondary); border:1px solid var(--border-color);">
          <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Periode</div>
          <div style="font-size:1rem; font-weight:700; color:var(--text-primary);">${monthNames[month - 1]} ${year}</div>
        </div>
        <div style="padding:12px 14px; border-radius:10px; background:var(--bg-secondary); border:1px solid var(--border-color);">
          <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Total PJ Aktif</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--primary);">${totalPj}</div>
        </div>
        <div style="padding:12px 14px; border-radius:10px; background:var(--bg-secondary); border:1px solid var(--border-color);">
          <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Rata-rata Disiplin</div>
          <div style="font-size:1.3rem; font-weight:800; color:${avgRate >= 75 ? 'var(--hadir-color)' : avgRate >= 50 ? 'var(--izin-color)' : 'var(--sakit-color)'};">${avgRate}%</div>
        </div>
        <div style="padding:12px 14px; border-radius:10px; background:var(--bg-secondary); border:1px solid var(--border-color);">
          <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">🌟 Teladan</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--hadir-color);">${teladanCount}</div>
        </div>
        <div style="padding:12px 14px; border-radius:10px; background:var(--bg-secondary); border:1px solid var(--border-color);">
          <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">❗ Evaluasi</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--sakit-color);">${evaluasiCount}</div>
        </div>
      `;
    }

    // Table Rows
    if (recapList.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:24px; color:var(--text-muted);">Tidak ada data PJ Kamar yang sesuai filter.</td></tr>`;
      return;
    }

    tableBody.innerHTML = recapList.map((item, idx) => {
      const progressColor = item.rate >= 90 ? 'var(--hadir-color)' : item.rate >= 75 ? 'var(--primary)' : item.rate >= 50 ? 'var(--izin-color)' : 'var(--sakit-color)';
      const statusBadge = item.status === 'active'
        ? '<span class="badge badge-success" style="font-size:0.7rem;">Aktif</span>'
        : '<span class="badge badge-danger" style="font-size:0.7rem;">Nonaktif</span>';

      return `
        <tr>
          <td style="text-align:center; font-weight:600; color:var(--text-muted);">${idx + 1}</td>
          <td>
            <strong>${esc(item.pjName)}</strong>
            <div style="font-size:0.73rem; color:var(--text-muted); font-family:var(--font-mono);">@${esc(item.pjUsername)}</div>
          </td>
          <td><strong>${esc(item.roomName.split(' - ')[0])}</strong></td>
          <td style="text-align:center;">
            <span style="font-size:1.1rem; font-weight:800; color:var(--primary);">${item.totalFilledSessions}</span>
            <span style="font-size:0.72rem; color:var(--text-muted);"> kali</span>
          </td>
          <td style="text-align:center; color:var(--text-muted);">${item.targetSessions}</td>
          <td>
            <div style="font-weight:800; font-size:1.05rem; font-family:var(--font-mono); color:${progressColor};">${item.rate}%</div>
            <div class="progress-bar-bg" style="width:72px; margin-top:3px;">
              <div class="progress-bar-fill" style="width:${item.rate}%; background-color:${progressColor};"></div>
            </div>
          </td>
          <td style="text-align:center; font-family:var(--font-mono);">${item.bySession.pagi || 0}</td>
          <td style="text-align:center; font-family:var(--font-mono);">${item.bySession.siang || 0}</td>
          <td style="text-align:center; font-family:var(--font-mono);">${item.bySession.sore || 0}</td>
          <td style="text-align:center; font-family:var(--font-mono);">${item.bySession.malam || 0}</td>
          <td><span class="badge badge-${esc(item.badgeColor)}">${esc(item.badge)}</span></td>
          <td style="text-align:center;">${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  exportPjRecapCSV() {
    const data = this._lastPjRecapData;
    const period = this._lastPjRecapPeriod;
    if (!data || data.length === 0) {
      this.showToast('Tidak ada data untuk diekspor.', 'warning');
      return;
    }

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const periodLabel = period ? `${monthNames[period.month - 1]}_${period.year}` : 'data';

    const headers = ['No', 'Nama PJ', 'Username', 'Kamar', 'Sesi Diisi', 'Target', 'Disiplin (%)', 'Pagi', 'Siang', 'Sore', 'Malam', 'Kategori', 'Status Akun'];
    const rows = data.map((item, idx) => [
      idx + 1,
      `"${item.pjName}"`,
      item.pjUsername,
      `"${item.roomName}"`,
      item.totalFilledSessions,
      item.targetSessions,
      item.rate,
      item.bySession.pagi || 0,
      item.bySession.siang || 0,
      item.bySession.sore || 0,
      item.bySession.malam || 0,
      `"${item.badge}"`,
      item.status || 'active'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Keaktifan_PJ_${periodLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('File CSV berhasil diunduh!', 'success');
  }
}

// Instantiate global app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AbsensiApp();
});
