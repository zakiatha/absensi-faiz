/**
 * E-ABSENSI ASRAMA - SUPABASE INTEGRATION MODULE
 * High-performance, zero-dependency REST client for Supabase PostgREST.
 * Implements offline-first fallback, automatic background sync, and connection monitoring.
 */

const SUPABASE_CONFIG = {
  url: 'https://ipsbmrarkncnwwyqmyqp.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwc2JtcmFya25jbnd3eXFteXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDEzMDUsImV4cCI6MjEwNTgxNzMwNX0.kQSOTU5SNSewSTV6ikLN1RCdPXuIHgSUFEtD0YMvlD8',
  tables: {
    rooms: 'rooms',
    users: 'users',
    sessions: 'sessions',
    criteria: 'criteria',
    students: 'students',
    attendanceLogs: 'attendance_logs'
  }
};

class SupabaseService {
  constructor() {
    this.url = SUPABASE_CONFIG.url;
    this.anonKey = SUPABASE_CONFIG.anonKey;
    this.status = 'checking'; // 'checking' | 'connected' | 'offline' | 'syncing' | 'error'
    this.lastSyncTime = null;
    this.statusListeners = [];
    this.syncQueue = [];
    this.isProcessingQueue = false;

    // Default headers for PostgREST
    this.headers = {
      'apikey': this.anonKey,
      'Authorization': `Bearer ${this.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation,resolution=merge-duplicates'
    };
  }

  // Subscribe to connection status changes
  onStatusChange(fn) {
    if (typeof fn === 'function') {
      this.statusListeners.push(fn);
      fn(this.status, this.lastSyncTime);
    }
  }

  setStatus(status) {
    this.status = status;
    this.statusListeners.forEach(fn => fn(this.status, this.lastSyncTime));
  }

  // Pure fetch with timeout protection
  async request(endpoint, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const method = (options.method || 'GET').toUpperCase();
    const baseHeaders = {
      'apikey': this.anonKey,
      'Authorization': `Bearer ${this.anonKey}`,
      'Content-Type': 'application/json'
    };

    if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
      baseHeaders['Prefer'] = 'return=representation,resolution=merge-duplicates';
    }

    const mergedHeaders = {
      ...baseHeaders,
      ...(options.headers || {})
    };

    const fullUrl = `${this.url}/rest/v1/${endpoint}`;

    try {
      const res = await fetch(fullUrl, {
        ...options,
        headers: mergedHeaders,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let errBody = '';
        try {
          errBody = await res.text();
        } catch (_) {}
        const error = new Error(`Supabase HTTP ${res.status}: ${errBody}`);
        error.status = res.status;
        throw error;
      }

      // Check if response has content
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
      return null;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // Check if Supabase project and tables are reachable
  async checkConnection() {
    try {
      this.setStatus('checking');
      // Test querying the rooms table
      await this.request('rooms?select=id&limit=1', { method: 'GET' }, 5000);
      this.setStatus('connected');
      return true;
    } catch (err) {
      if (err.status === 404) {
        console.warn('[Supabase] Connected to project, but tables are not yet created in SQL Editor.');
        this.setStatus('offline');
      } else {
        console.warn('[Supabase] Connection failed or offline:', err.message);
        this.setStatus('offline');
      }
      return false;
    }
  }

  // Convert JS object models to Postgres snake_case rows
  roomToRow(r) {
    return {
      id: r.id,
      name: r.name,
      pj_id: r.pjId || '',
      pj_name: r.pjName || '',
      capacity: Number(r.capacity) || 10,
      floor: r.floor || '',
      updated_at: new Date().toISOString()
    };
  }

  rowToRoom(row) {
    return {
      id: row.id,
      name: row.name,
      pjId: row.pj_id || row.pjId || '',
      pjName: row.pj_name || row.pjName || '',
      capacity: Number(row.capacity) || 10,
      floor: row.floor || ''
    };
  }

  userToRow(u) {
    return {
      username: u.username,
      name: u.name,
      role: u.role,
      phone: u.phone || '',
      room_id: u.roomId || '',
      status: u.status || 'active',
      password_hash: u.passwordHash || '',
      plain_password: u.plainPassword || u.password || '',
      updated_at: new Date().toISOString()
    };
  }

  rowToUser(row) {
    return {
      username: row.username,
      name: row.name,
      role: row.role,
      phone: row.phone || '',
      roomId: row.room_id || row.roomId || '',
      status: row.status || 'active',
      passwordHash: row.password_hash || row.passwordHash || '',
      plainPassword: row.plain_password || row.plainPassword || ''
    };
  }

  studentToRow(s) {
    return {
      id: s.id,
      nis: s.nis || '',
      name: s.name,
      room_id: s.roomId || '',
      class: s.class || '',
      parent_contact: s.parentContact || '',
      updated_at: new Date().toISOString()
    };
  }

  rowToStudent(row) {
    return {
      id: row.id,
      nis: row.nis || '',
      name: row.name,
      roomId: row.room_id || row.roomId || '',
      class: row.class || '',
      parentContact: row.parent_contact || row.parentContact || ''
    };
  }

  sessionToRow(s) {
    return {
      id: s.id,
      name: s.name,
      label: s.label,
      time_range: s.timeRange,
      order_num: Number(s.order) || 1,
      active: s.active !== false
    };
  }

  rowToSession(row) {
    return {
      id: row.id,
      name: row.name,
      label: row.label,
      timeRange: row.time_range || row.timeRange,
      order: Number(row.order_num !== undefined ? row.order_num : row.order) || 1,
      active: row.active !== false
    };
  }

  criterionToRow(c) {
    return {
      id: c.id,
      label: c.label,
      color: c.color,
      bg_color: c.bgColor || '',
      border_color: c.borderColor || '',
      description: c.desc || ''
    };
  }

  rowToCriterion(row) {
    return {
      id: row.id,
      label: row.label,
      color: row.color,
      bgColor: row.bg_color || row.bgColor || '',
      borderColor: row.border_color || row.borderColor || '',
      desc: row.description || row.desc || ''
    };
  }

  logToRow(l) {
    return {
      id: l.id,
      date: l.date,
      session_id: l.sessionId,
      session_name: l.sessionName || '',
      room_id: l.roomId,
      room_name: l.roomName || '',
      recorded_by_username: l.recordedByUsername || '',
      recorded_by_name: l.recordedByName || '',
      recorded_by_role: l.recordedByRole || '',
      recorded_at: l.recordedAt ? new Date(l.recordedAt).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: l.items || [],
      summary: l.summary || {}
    };
  }

  rowToLog(row) {
    return {
      id: row.id,
      date: row.date,
      sessionId: row.session_id || row.sessionId,
      sessionName: row.session_name || row.sessionName || '',
      roomId: row.room_id || row.roomId,
      roomName: row.room_name || row.roomName || '',
      recordedByUsername: row.recorded_by_username || row.recordedByUsername || '',
      recordedByName: row.recorded_by_name || row.recordedByName || '',
      recordedByRole: row.recorded_by_role || row.recordedByRole || '',
      recordedAt: row.recorded_at || row.recordedAt || '',
      items: row.items || [],
      summary: row.summary || {}
    };
  }

  // --- FULL SYNC: Pull latest data from Supabase ---
  async pullAllFromSupabase(store) {
    try {
      this.setStatus('syncing');

      // Fetch all tables concurrently
      const [roomsRows, usersRows, sessionsRows, criteriaRows, studentsRows, logsRows] = await Promise.all([
        this.request('rooms?select=*', { method: 'GET' }),
        this.request('users?select=*', { method: 'GET' }),
        this.request('sessions?select=*&order=order_num.asc', { method: 'GET' }),
        this.request('criteria?select=*', { method: 'GET' }),
        this.request('students?select=*', { method: 'GET' }),
        this.request('attendance_logs?select=*&order=date.desc', { method: 'GET' })
      ]);

      let hasData = false;

      if (Array.isArray(roomsRows) && roomsRows.length > 0) {
        store.data.rooms = roomsRows.map(r => this.rowToRoom(r));
        hasData = true;
      }
      if (Array.isArray(usersRows) && usersRows.length > 0) {
        store.data.users = usersRows.map(u => {
          const converted = this.rowToUser(u);
          const localUser = store.getUser(u.username);
          if (!converted.plainPassword && localUser && localUser.plainPassword) {
            converted.plainPassword = localUser.plainPassword;
          }
          return converted;
        });
        hasData = true;
      }
      if (Array.isArray(sessionsRows) && sessionsRows.length > 0) {
        store.data.sessions = sessionsRows.map(s => this.rowToSession(s));
        hasData = true;
      }
      if (Array.isArray(criteriaRows) && criteriaRows.length > 0) {
        store.data.criteria = criteriaRows.map(c => this.rowToCriterion(c));
        hasData = true;
      }
      if (Array.isArray(studentsRows)) {
        store.data.students = studentsRows.map(s => this.rowToStudent(s));
        hasData = true;
      }
      if (Array.isArray(logsRows)) {
        store.data.attendanceLogs = logsRows.map(l => this.rowToLog(l));
        hasData = true;
      }

      if (hasData) {
        store.save(); // Save to local storage cache
        this.lastSyncTime = new Date();
        this.setStatus('connected');
        console.log('[Supabase] Berhasil sinkronisasi data dari cloud.');
        return { success: true, count: roomsRows.length };
      } else {
        // Cloud tables are empty: push initial local data to Supabase
        console.log('[Supabase] Tabel cloud kosong, melakukan inisialisasi upload data lokal...');
        await this.pushAllToSupabase(store);
        this.lastSyncTime = new Date();
        this.setStatus('connected');
        return { success: true, initialized: true };
      }
    } catch (err) {
      console.warn('[Supabase] Gagal pull data:', err.message);
      this.setStatus('offline');
      return { success: false, error: err.message };
    }
  }

  // --- FULL SYNC: Push all local data to Supabase ---
  async pushAllToSupabase(store) {
    try {
      this.setStatus('syncing');

      const rooms = (store.getRooms() || []).map(r => this.roomToRow(r));
      const users = (store.getUsers() || []).map(u => this.userToRow(u));
      const sessions = (store.getSessions() || []).map(s => this.sessionToRow(s));
      const criteria = (store.getCriteria() || []).map(c => this.criterionToRow(c));
      const students = (store.getStudents() || []).map(s => this.studentToRow(s));
      const logs = (store.getAttendanceLogs() || []).map(l => this.logToRow(l));

      if (rooms.length > 0) {
        await this.request('rooms', { method: 'POST', body: JSON.stringify(rooms) });
      }
      if (users.length > 0) {
        try {
          await this.request('users', { method: 'POST', body: JSON.stringify(users) });
        } catch (errUser) {
          if (errUser.message && (errUser.message.includes('plain_password') || errUser.message.includes('PGRST204'))) {
            const fallbackUsers = users.map(u => {
              const { plain_password, ...rest } = u;
              return rest;
            });
            await this.request('users', { method: 'POST', body: JSON.stringify(fallbackUsers) });
          } else {
            throw errUser;
          }
        }
      }
      if (sessions.length > 0) {
        await this.request('sessions', { method: 'POST', body: JSON.stringify(sessions) });
      }
      if (criteria.length > 0) {
        await this.request('criteria', { method: 'POST', body: JSON.stringify(criteria) });
      }
      if (students.length > 0) {
        await this.request('students', { method: 'POST', body: JSON.stringify(students) });
      }
      if (logs.length > 0) {
        await this.request('attendance_logs', { method: 'POST', body: JSON.stringify(logs) });
      }

      this.lastSyncTime = new Date();
      this.setStatus('connected');
      console.log('[Supabase] Berhasil upload seluruh data lokal ke cloud.');
      return { success: true };
    } catch (err) {
      console.error('[Supabase] Gagal push data:', err);
      this.setStatus('offline');
      return { success: false, error: err.message };
    }
  }

  // --- INDIVIDUAL ENTITY UPSERT & DELETE METHODS ---
  async upsertRoom(room) {
    try {
      const row = this.roomToRow(room);
      await this.request('rooms', { method: 'POST', body: JSON.stringify([row]) });
    } catch (e) {
      console.warn('[Supabase] Sync room background failed:', e.message);
    }
  }

  async deleteRoom(id) {
    try {
      await this.request(`rooms?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[Supabase] Delete room background failed:', e.message);
    }
  }

  async upsertUser(user) {
    try {
      const row = this.userToRow(user);
      await this.request('users', { method: 'POST', body: JSON.stringify([row]) });
    } catch (e) {
      if (e.message && (e.message.includes('plain_password') || e.message.includes('PGRST204') || e.status === 400)) {
        try {
          const fallbackRow = { ...this.userToRow(user) };
          delete fallbackRow.plain_password;
          await this.request('users', { method: 'POST', body: JSON.stringify([fallbackRow]) });
          return;
        } catch (_) {}
      }
      console.warn('[Supabase] Sync user background failed:', e.message);
    }
  }

  async deleteUser(username) {
    try {
      await this.request(`users?username=eq.${encodeURIComponent(username)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[Supabase] Delete user background failed:', e.message);
    }
  }

  async upsertStudent(student) {
    try {
      const row = this.studentToRow(student);
      await this.request('students', { method: 'POST', body: JSON.stringify([row]) });
    } catch (e) {
      console.warn('[Supabase] Sync student background failed:', e.message);
    }
  }

  async deleteStudent(id) {
    try {
      await this.request(`students?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[Supabase] Delete student background failed:', e.message);
    }
  }

  async upsertAttendanceLog(log) {
    try {
      const row = this.logToRow(log);
      await this.request('attendance_logs', { method: 'POST', body: JSON.stringify([row]) });
    } catch (e) {
      console.warn('[Supabase] Sync attendance log background failed:', e.message);
    }
  }

  async deleteAttendanceLog(id) {
    try {
      await this.request(`attendance_logs?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[Supabase] Delete attendance log background failed:', e.message);
    }
  }

  async upsertSession(session) {
    try {
      const row = this.sessionToRow(session);
      await this.request('sessions', { method: 'POST', body: JSON.stringify([row]) });
    } catch (e) {
      console.warn('[Supabase] Sync session background failed:', e.message);
    }
  }

  async deleteSession(id) {
    try {
      await this.request(`sessions?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[Supabase] Delete session background failed:', e.message);
    }
  }

  async upsertCriterion(criterion) {
    try {
      const row = this.criterionToRow(criterion);
      await this.request('criteria', { method: 'POST', body: JSON.stringify([row]) });
    } catch (e) {
      console.warn('[Supabase] Sync criterion background failed:', e.message);
    }
  }

  async deleteCriterion(id) {
    try {
      await this.request(`criteria?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[Supabase] Delete criterion background failed:', e.message);
    }
  }
}

// Global Singleton Instance
window.SupabaseSync = new SupabaseService();
