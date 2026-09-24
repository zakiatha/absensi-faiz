/**
 * E-ABSENSI ASRAMA - DATA & STORAGE MODULE
 * Standardized data models, seed data, and persistent localStorage repository.
 */

const STORAGE_KEY = 'absensi_asrama_data_v1';
const CURRENT_USER_KEY = 'absensi_asrama_current_user_v1';
const THEME_KEY = 'absensi_asrama_theme_v1';

// Seed Initial Data
const DEFAULT_ROOMS = [
  { id: 'kamar-1', name: 'Kamar 1 - Abu Bakar Ash-Shiddiq', pjId: 'faiz', pjName: 'Ustadz Faiz Ar-Rasyid', capacity: 10, floor: 'Lantai 1' },
  { id: 'kamar-2', name: 'Kamar 2 - Umar bin Khattab', pjId: 'zaki', pjName: 'Ustadz Zaki Athallah', capacity: 10, floor: 'Lantai 1' },
  { id: 'kamar-3', name: 'Kamar 3 - Utsman bin Affan', pjId: 'ridwan', pjName: 'Ustadz Ridwan Kamil', capacity: 10, floor: 'Lantai 1' },
  { id: 'kamar-4', name: 'Kamar 4 - Ali bin Abi Thalib', pjId: 'hanif', pjName: 'Ustadz Hanif Al-Banjari', capacity: 10, floor: 'Lantai 2' },
  { id: 'kamar-5', name: 'Kamar 5 - Thalhah bin Ubaidillah', pjId: 'ilham', pjName: 'Ustadz Ilham Nugraha', capacity: 10, floor: 'Lantai 2' },
  { id: 'kamar-6', name: 'Kamar 6 - Zubair bin Awwam', pjId: 'danang', pjName: 'Ustadz Danang Prasetyo', capacity: 10, floor: 'Lantai 2' }
];

const DEFAULT_USERS = [
  { username: 'admin', password: 'admin123', plainPassword: 'admin123', name: 'Ust. H. Abdurrahman (Admin Pusat)', role: 'admin', phone: '081234567890', roomId: '', status: 'active' },
  { username: 'faiz', password: 'faiz123', plainPassword: 'faiz123', name: 'Ustadz Faiz Ar-Rasyid', role: 'bapak_kamar', phone: '081298765431', roomId: 'kamar-1', status: 'active' },
  { username: 'zaki', password: 'zaki123', plainPassword: 'zaki123', name: 'Ustadz Zaki Athallah', role: 'bapak_kamar', phone: '081298765432', roomId: 'kamar-2', status: 'active' },
  { username: 'ridwan', password: 'ridwan123', plainPassword: 'ridwan123', name: 'Ustadz Ridwan Kamil', role: 'bapak_kamar', phone: '081298765433', roomId: 'kamar-3', status: 'active' },
  { username: 'hanif', password: 'hanif123', plainPassword: 'hanif123', name: 'Ustadz Hanif Al-Banjari', role: 'bapak_kamar', phone: '081298765434', roomId: 'kamar-4', status: 'active' },
  { username: 'ilham', password: 'ilham123', plainPassword: 'ilham123', name: 'Ustadz Ilham Nugraha', role: 'bapak_kamar', phone: '081298765435', roomId: 'kamar-5', status: 'active' },
  { username: 'danang', password: 'danang123', plainPassword: 'danang123', name: 'Ustadz Danang Prasetyo', role: 'bapak_kamar', phone: '081298765436', roomId: 'kamar-6', status: 'active' }
];

const DEFAULT_SESSIONS = [
  { id: 'pagi', name: 'Pagi', label: '🌅 Absen Pagi (Shubuh & Halaqah)', timeRange: '05:00 - 06:30', order: 1, active: true },
  { id: 'siang', name: 'Siang', label: '☀️ Absen Siang (Dzuhur & Istirahat)', timeRange: '12:30 - 14:00', order: 2, active: true },
  { id: 'sore', name: 'Sore', label: '🌇 Absen Sore (Ashar & Mandiri)', timeRange: '16:00 - 17:30', order: 3, active: true },
  { id: 'malam', name: 'Malam', label: '🌙 Absen Malam (Isya & Jam Tidur)', timeRange: '20:30 - 22:00', order: 4, active: true }
];

const DEFAULT_CRITERIA = [
  { id: 'hadir', label: 'Hadir', color: '#10b981', bgColor: '#ecfdf5', borderColor: '#a7f3d0', desc: 'Berada di kamar mengikuti kegiatan asrama' },
  { id: 'izin', label: 'Izin', color: '#f59e0b', bgColor: '#fffbeb', borderColor: '#fde68a', desc: 'Ada izin resmi dari pengasuh / walisantri' },
  { id: 'sakit', label: 'Sakit', color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fecaca', desc: 'Sedang dirawat / istirahat di UKS / Kamar' },
  { id: 'pulang', label: 'Pulang', color: '#6366f1', bgColor: '#eef2ff', borderColor: '#c7d2fe', desc: 'Pulang ke rumah walisantri secara legal' }
];

const DEFAULT_STUDENTS = [
  // Kamar 1
  { id: 'std-101', nis: '20260101', name: 'Muhammad Al-Fatih', roomId: 'kamar-1', class: '10-A', parentContact: '08130000101' },
  { id: 'std-102', nis: '20260102', name: 'Ahmad Dahlan Al-Kautsar', roomId: 'kamar-1', class: '10-A', parentContact: '08130000102' },
  { id: 'std-103', nis: '20260103', name: 'Bilal bin Rabah Pratama', roomId: 'kamar-1', class: '10-B', parentContact: '08130000103' },
  { id: 'std-104', nis: '20260104', name: 'Salman Al-Farisi Ilham', roomId: 'kamar-1', class: '10-B', parentContact: '08130000104' },
  { id: 'std-105', nis: '20260105', name: 'Zaid bin Tsabit Firdaus', roomId: 'kamar-1', class: '11-A', parentContact: '08130000105' },
  { id: 'std-106', nis: '20260106', name: 'Usamah bin Zaid Munir', roomId: 'kamar-1', class: '11-B', parentContact: '08130000106' },

  // Kamar 2
  { id: 'std-201', nis: '20260201', name: 'Khalid bin Walid Saifullah', roomId: 'kamar-2', class: '10-A', parentContact: '08130000201' },
  { id: 'std-202', nis: '20260202', name: 'Thariq bin Ziyad Rahman', roomId: 'kamar-2', class: '10-B', parentContact: '08130000202' },
  { id: 'std-203', nis: '20260203', name: 'Hamzah bin Abdul Muthalib', roomId: 'kamar-2', class: '11-A', parentContact: '08130000203' },
  { id: 'std-204', nis: '20260204', name: 'Saad bin Abi Waqqas Zuhri', roomId: 'kamar-2', class: '11-B', parentContact: '08130000204' },
  { id: 'std-205', nis: '20260205', name: 'Ammar bin Yasir Rasyid', roomId: 'kamar-2', class: '12-A', parentContact: '08130000205' },
  { id: 'std-206', nis: '20260206', name: 'Muadz bin Jabal Anshari', roomId: 'kamar-2', class: '12-B', parentContact: '08130000206' },

  // Kamar 3
  { id: 'std-301', nis: '20260301', name: 'Abdullah bin Masud Hafizh', roomId: 'kamar-3', class: '10-A', parentContact: '08130000301' },
  { id: 'std-302', nis: '20260302', name: 'Abu Dzar Al-Ghifari Shadiq', roomId: 'kamar-3', class: '10-B', parentContact: '08130000302' },
  { id: 'std-303', nis: '20260303', name: 'Hudzaifah bin Al-Yaman Amin', roomId: 'kamar-3', class: '11-A', parentContact: '08130000303' },
  { id: 'std-304', nis: '20260304', name: 'Jafar bin Abi Thalib Thayar', roomId: 'kamar-3', class: '11-B', parentContact: '08130000304' },
  { id: 'std-305', nis: '20260305', name: 'Shuhaib Ar-Rumi Sinan', roomId: 'kamar-3', class: '12-A', parentContact: '08130000305' },
  { id: 'std-306', nis: '20260306', name: 'Miqdad bin Amr Aswad', roomId: 'kamar-3', class: '12-B', parentContact: '08130000306' },

  // Kamar 4
  { id: 'std-401', nis: '20260401', name: 'Hasan bin Ali Murtadha', roomId: 'kamar-4', class: '10-A', parentContact: '08130000401' },
  { id: 'std-402', nis: '20260402', name: 'Husain bin Ali Mujahid', roomId: 'kamar-4', class: '10-B', parentContact: '08130000402' },
  { id: 'std-403', nis: '20260403', name: 'Abbas bin Abdul Muthalib', roomId: 'kamar-4', class: '11-A', parentContact: '08130000403' },
  { id: 'std-404', nis: '20260404', name: 'Abdullah bin Abbas Faqih', roomId: 'kamar-4', class: '11-B', parentContact: '08130000404' },
  { id: 'std-405', nis: '20260405', name: 'Jabir bin Abdillah Sulami', roomId: 'kamar-4', class: '12-A', parentContact: '08130000405' },
  { id: 'std-406', nis: '20260406', name: 'Anas bin Malik Khadim', roomId: 'kamar-4', class: '12-B', parentContact: '08130000406' },

  // Kamar 5
  { id: 'std-501', nis: '20260501', name: 'Said bin Zaid Qurasyi', roomId: 'kamar-5', class: '10-A', parentContact: '08130000501' },
  { id: 'std-502', nis: '20260502', name: 'Abu Ubaidah Amir Jarrah', roomId: 'kamar-5', class: '10-B', parentContact: '08130000502' },
  { id: 'std-503', nis: '20260503', name: 'Abdurrahman bin Auf Tajir', roomId: 'kamar-5', class: '11-A', parentContact: '08130000503' },
  { id: 'std-504', nis: '20260504', name: 'Zubair Al-Awwam Hawari', roomId: 'kamar-5', class: '11-B', parentContact: '08130000504' },
  { id: 'std-505', nis: '20260505', name: 'Ubay bin Kaab Anshari', roomId: 'kamar-5', class: '12-A', parentContact: '08130000505' },
  { id: 'std-506', nis: '20260506', name: 'Tamim Ad-Dari Rahib', roomId: 'kamar-5', class: '12-B', parentContact: '08130000506' },

  // Kamar 6
  { id: 'std-601', nis: '20260601', name: 'Khabbab bin Al-Arat Tamimi', roomId: 'kamar-6', class: '10-A', parentContact: '08130000601' },
  { id: 'std-602', nis: '20260602', name: 'Bilal Al-Habasyi Muadzin', roomId: 'kamar-6', class: '10-B', parentContact: '08130000602' },
  { id: 'std-603', nis: '20260603', name: 'Imran bin Hushain Khuzaah', roomId: 'kamar-6', class: '11-A', parentContact: '08130000603' },
  { id: 'std-604', nis: '20260604', name: 'Hakim bin Hizam Asadi', roomId: 'kamar-6', class: '11-B', parentContact: '08130000604' },
  { id: 'std-605', nis: '20260605', name: 'Rafi bin Khadij Ausiy', roomId: 'kamar-6', class: '12-A', parentContact: '08130000605' },
  { id: 'std-606', nis: '20260606', name: 'Abu Hurairah Ad-Dausi', roomId: 'kamar-6', class: '12-B', parentContact: '08130000606' }
];

// Helper to generate seed attendance records for the current month so charts & recaps look realistic
function generateSeedAttendanceLogs() {
  const logs = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();

  const sessions = ['pagi', 'siang', 'sore', 'malam'];
  const rooms = DEFAULT_ROOMS;

  // Generate logs for past days up to today
  // Let's generate for the past 14 days or days of this month
  const startDay = Math.max(1, currentDay - 7);

  for (let day = startDay; day <= currentDay; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // For each room
    rooms.forEach(room => {
      const roomStudents = DEFAULT_STUDENTS.filter(s => s.roomId === room.id);
      
      // Determine which sessions were taken (Faiz / Kamar 1 has very high attendance, some rooms miss 1 session)
      sessions.forEach(sess => {
        // If it's today and session is later than now, don't generate all
        if (day === currentDay && sess === 'malam') return;

        // Skip occasionally to simulate real life attendance diligence
        const randomFactor = Math.random();
        if (room.id === 'kamar-1' && randomFactor > 0.98) return; // Faiz is 98% diligent
        if (room.id !== 'kamar-1' && randomFactor > 0.88) return; // Others ~88%

        const items = roomStudents.map(std => {
          let status = 'hadir';
          let note = '';
          const r = Math.random();
          if (r > 0.94) {
            status = 'izin';
            note = 'Izin keperluan keluarga';
          } else if (r > 0.90) {
            status = 'sakit';
            note = 'Demam istirahat di UKS';
          } else if (r > 0.88) {
            status = 'pulang';
            note = 'Pulang akhir pekan';
          }

          return {
            studentId: std.id,
            studentName: std.name,
            status: status,
            note: note
          };
        });

        const timeRecord = sess === 'pagi' ? '05:45' : sess === 'siang' ? '13:05' : sess === 'sore' ? '16:40' : '21:15';

        logs.push({
          id: `att-${room.id}-${dateStr}-${sess}`,
          date: dateStr,
          sessionId: sess,
          sessionName: sess.toUpperCase(),
          roomId: room.id,
          roomName: room.name,
          recordedByUsername: room.pjId,
          recordedByName: room.pjName,
          recordedAt: `${dateStr} ${timeRecord}:22`,
          items: items,
          summary: {
            hadir: items.filter(i => i.status === 'hadir').length,
            izin: items.filter(i => i.status === 'izin').length,
            sakit: items.filter(i => i.status === 'sakit').length,
            pulang: items.filter(i => i.status === 'pulang').length,
            total: items.length
          }
        });
      });
    });
  }

  return logs;
}

// Data Store Manager
class DataStore {
  constructor() {
    this.init();
  }

  init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.data = {
        version: '1.0.0',
        rooms: DEFAULT_ROOMS,
        users: DEFAULT_USERS,
        sessions: DEFAULT_SESSIONS,
        criteria: DEFAULT_CRITERIA,
        students: DEFAULT_STUDENTS,
        attendanceLogs: generateSeedAttendanceLogs()
      };
      this.save();
    } else {
      try {
        this.data = JSON.parse(raw);
        // Ensure all required collections exist
        if (!this.data.rooms) this.data.rooms = DEFAULT_ROOMS;
        if (!this.data.users) this.data.users = DEFAULT_USERS;
        if (!this.data.sessions) this.data.sessions = DEFAULT_SESSIONS;
        if (!this.data.criteria) this.data.criteria = DEFAULT_CRITERIA;
        if (!this.data.students) this.data.students = DEFAULT_STUDENTS;
        if (!this.data.attendanceLogs) this.data.attendanceLogs = [];
      } catch (e) {
        console.error('Error parsing stored data, resetting to default', e);
        this.resetToDefaults();
      }
    }
    // Proactively migrate plaintext credentials to salted SHA-256 hashes
    this.hashInitialPasswordsIfNeeded();

    // Asynchronously connect & sync with Supabase Cloud
    setTimeout(() => this.syncWithSupabase(), 400);
  }

  async syncWithSupabase() {
    if (window.SupabaseSync) {
      try {
        const connected = await window.SupabaseSync.checkConnection();
        if (connected) {
          const res = await window.SupabaseSync.pullAllFromSupabase(this);
          if (res && res.success) {
            window.dispatchEvent(new CustomEvent('supabase-data-synced', { detail: res }));
            if (window.app && typeof window.app.onCloudSyncComplete === 'function') {
              window.app.onCloudSyncComplete(res);
            }
          }
        }
      } catch (e) {
        console.warn('[DataStore] Supabase sync skipped:', e);
      }
    }
  }

  async hashInitialPasswordsIfNeeded() {
    let modified = false;
    const defaultPassMap = {
      admin: 'admin123',
      faiz: 'faiz123',
      zaki: 'zaki123',
      ridwan: 'ridwan123',
      hanif: 'hanif123',
      ilham: 'ilham123',
      danang: 'danang123'
    };

    for (const u of (this.data.users || [])) {
      if (!u.plainPassword) {
        u.plainPassword = u.password || defaultPassMap[u.username.toLowerCase()] || '123456';
        modified = true;
      }
      if (!u.status) {
        u.status = 'active';
        modified = true;
      }
      if (window.SecurityUtils && (!u.passwordHash || u.password)) {
        u.passwordHash = await window.SecurityUtils.hashPassword(u.plainPassword);
        delete u.password;
        modified = true;
      }
    }
    if (modified) this.save();
  }

  async verifyPassword(enteredPassword, user) {
    if (!user || !enteredPassword) return false;
    if (user.status === 'inactive') {
      return false;
    }
    if (!window.SecurityUtils) {
      return user.plainPassword === enteredPassword || user.password === enteredPassword || user.passwordHash === enteredPassword;
    }
    const hashed = await window.SecurityUtils.hashPassword(enteredPassword);
    if (user.passwordHash) {
      return user.passwordHash === hashed;
    }
    if (user.plainPassword && user.plainPassword === enteredPassword) {
      user.passwordHash = hashed;
      this.save();
      return true;
    }
    if (user.password && user.password === enteredPassword) {
      user.passwordHash = hashed;
      user.plainPassword = enteredPassword;
      delete user.password;
      this.save();
      return true;
    }
    return false;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Storage full or error saving data', e);
    }
  }

  getSanitizedExport() {
    const cloned = JSON.parse(JSON.stringify(this.data));
    if (cloned.users) {
      cloned.users = cloned.users.map(u => {
        const { password, passwordHash, ...safeUser } = u;
        return safeUser;
      });
    }
    return cloned;
  }

  resetToDefaults() {
    this.data = {
      version: '1.0.0',
      rooms: DEFAULT_ROOMS,
      users: DEFAULT_USERS,
      sessions: DEFAULT_SESSIONS,
      criteria: DEFAULT_CRITERIA,
      students: DEFAULT_STUDENTS,
      attendanceLogs: generateSeedAttendanceLogs()
    };
    this.save();
    this.hashInitialPasswordsIfNeeded();
  }

  // --- ROOMS CRUD ---
  getRooms() {
    return this.data.rooms || [];
  }

  getRoomById(id) {
    return this.getRooms().find(r => r.id === id);
  }

  saveRoom(room) {
    const index = this.data.rooms.findIndex(r => r.id === room.id);
    if (index >= 0) {
      this.data.rooms[index] = { ...this.data.rooms[index], ...room };
    } else {
      this.data.rooms.push(room);
    }
    this.save();
    window.SupabaseSync?.upsertRoom(room);
  }

  deleteRoom(id) {
    this.data.rooms = this.data.rooms.filter(r => r.id !== id);
    // Also detach or handle students in this room
    this.data.students = this.data.students.filter(s => s.roomId !== id);
    this.save();
    window.SupabaseSync?.deleteRoom(id);
  }

  // --- USERS / BAPAK KAMAR CRUD ---
  getUsers() {
    return this.data.users || [];
  }

  getUser(username) {
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  async saveUser(user) {
    const cleanUser = { ...user };
    cleanUser.status = user.status || 'active';
    if (user.password || user.plainPassword) {
      const rawPass = user.password || user.plainPassword;
      cleanUser.plainPassword = rawPass;
      if (window.SecurityUtils) {
        cleanUser.passwordHash = await window.SecurityUtils.hashPassword(rawPass);
      }
      delete cleanUser.password;
    }
    const index = this.data.users.findIndex(u => u.username.toLowerCase() === cleanUser.username.toLowerCase());
    if (index >= 0) {
      this.data.users[index] = { ...this.data.users[index], ...cleanUser };
    } else {
      this.data.users.push(cleanUser);
    }
    this.save();
    window.SupabaseSync?.upsertUser(cleanUser);
  }

  deleteUser(username) {
    const target = username.toLowerCase();
    this.data.users = this.data.users.filter(u => u.username.toLowerCase() !== target);
    this.data.rooms.forEach(r => {
      if (r.pjId && r.pjId.toLowerCase() === target) {
        r.pjId = '';
        r.pjName = 'Belum Ditugaskan';
      }
    });
    this.save();
    window.SupabaseSync?.deleteUser(target);
  }

  // --- SESSIONS CRUD ---
  getSessions() {
    return (this.data.sessions || []).sort((a, b) => a.order - b.order);
  }

  saveSession(session) {
    const index = this.data.sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      this.data.sessions[index] = { ...this.data.sessions[index], ...session };
    } else {
      this.data.sessions.push(session);
    }
    this.save();
    window.SupabaseSync?.upsertSession(session);
  }

  deleteSession(id) {
    this.data.sessions = this.data.sessions.filter(s => s.id !== id);
    this.save();
    window.SupabaseSync?.deleteSession(id);
  }

  // --- CRITERIA CRUD ---
  getCriteria() {
    return this.data.criteria || DEFAULT_CRITERIA;
  }

  saveCriterion(criterion) {
    const index = this.data.criteria.findIndex(c => c.id === criterion.id);
    if (index >= 0) {
      this.data.criteria[index] = { ...this.data.criteria[index], ...criterion };
    } else {
      this.data.criteria.push(criterion);
    }
    this.save();
    window.SupabaseSync?.upsertCriterion(criterion);
  }

  deleteCriterion(id) {
    this.data.criteria = (this.data.criteria || []).filter(c => c.id !== id);
    this.save();
    window.SupabaseSync?.deleteCriterion(id);
  }

  // --- STUDENTS CRUD ---
  getStudents(roomId = null) {
    let list = this.data.students || [];
    if (roomId && roomId !== 'all') {
      list = list.filter(s => s.roomId === roomId);
    }
    return list;
  }

  getStudentById(id) {
    return (this.data.students || []).find(s => s.id === id);
  }

  saveStudent(student) {
    const index = this.data.students.findIndex(s => s.id === student.id);
    if (index >= 0) {
      this.data.students[index] = { ...this.data.students[index], ...student };
    } else {
      this.data.students.push(student);
    }
    this.save();
    window.SupabaseSync?.upsertStudent(student);
  }

  deleteStudent(id) {
    this.data.students = this.data.students.filter(s => s.id !== id);
    this.save();
    window.SupabaseSync?.deleteStudent(id);
  }

  // --- ATTENDANCE LOGS CRUD & RECAP ---
  getAttendanceLogs() {
    return this.data.attendanceLogs || [];
  }

  getAttendanceLog(date, sessionId, roomId) {
    return this.getAttendanceLogs().find(
      l => l.date === date && l.sessionId === sessionId && l.roomId === roomId
    );
  }

  saveAttendanceLog(record) {
    const existingIndex = this.data.attendanceLogs.findIndex(
      l => l.date === record.date && l.sessionId === record.sessionId && l.roomId === record.roomId
    );

    if (existingIndex >= 0) {
      this.data.attendanceLogs[existingIndex] = { ...this.data.attendanceLogs[existingIndex], ...record };
    } else {
      this.data.attendanceLogs.unshift(record);
    }
    this.save();
    window.SupabaseSync?.upsertAttendanceLog(record);
    return record;
  }

  deleteAttendanceLog(id) {
    this.data.attendanceLogs = this.data.attendanceLogs.filter(l => l.id !== id);
    this.save();
    window.SupabaseSync?.deleteAttendanceLog(id);
  }

  // Monthly Recap calculation for Bapak Kamar Activity
  // Strictly attributes attendance sessions to the person who actually recorded them
  getBapakKamarRecap(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthlyLogs = this.getAttendanceLogs().filter(l => l.date.startsWith(prefix));

    const daysInMonth = new Date(year, month, 0).getDate();
    const activeSessionsCount = this.getSessions().filter(s => s.active).length || 4;
    const targetSessions = daysInMonth * activeSessionsCount;

    // Get all registered bapak kamar users
    const allUsers = this.getUsers().filter(u => u.role === 'bapak_kamar');

    // Also collect any other recordedBy usernames that exist in this month's logs
    const recorderMap = new Map();
    allUsers.forEach(u => {
      recorderMap.set(u.username.toLowerCase(), {
        username: u.username,
        name: u.name,
        assignedRoomId: u.roomId,
        status: u.status || 'active'
      });
    });

    monthlyLogs.forEach(l => {
      const uKey = (l.recordedByUsername || '').toLowerCase();
      if (uKey && !recorderMap.has(uKey)) {
        recorderMap.set(uKey, {
          username: l.recordedByUsername,
          name: l.recordedByName || l.recordedByUsername,
          assignedRoomId: l.roomId,
          status: 'active'
        });
      }
    });

    const recapList = Array.from(recorderMap.values()).map(pj => {
      // Find logs actually submitted by this specific PJ
      const pjLogs = monthlyLogs.filter(l => 
        (l.recordedByUsername && l.recordedByUsername.toLowerCase() === pj.username.toLowerCase()) ||
        (l.recordedByName && l.recordedByName === pj.name)
      );
      const totalFilledSessions = pjLogs.length;

      // Collect rooms actually handled by this PJ in the logs
      const roomsHandled = Array.from(new Set(pjLogs.map(l => {
        if (l.roomName) return l.roomName.split(' - ')[0];
        const rObj = this.getRoomById(l.roomId);
        return rObj ? rObj.name.split(' - ')[0] : l.roomId;
      }))).filter(Boolean);

      let roomDisplay = roomsHandled.join(', ');
      if (!roomDisplay) {
        const assigned = pj.assignedRoomId ? this.getRoomById(pj.assignedRoomId) : null;
        roomDisplay = assigned ? assigned.name.split(' - ')[0] : '-';
      }

      // Group by session
      const bySession = { pagi: 0, siang: 0, sore: 0, malam: 0 };
      pjLogs.forEach(l => {
        if (bySession[l.sessionId] !== undefined) {
          bySession[l.sessionId]++;
        } else {
          bySession[l.sessionId] = (bySession[l.sessionId] || 0) + 1;
        }
      });

      // Calculate attendance diligence %
      const rate = targetSessions > 0 ? Math.round((totalFilledSessions / targetSessions) * 100) : 0;
      
      let badge = 'Sangat Rajin';
      let badgeColor = 'success';
      if (rate >= 90) {
        badge = 'Teladan 🌟';
        badgeColor = 'success';
      } else if (rate >= 75) {
        badge = 'Baik 👍';
        badgeColor = 'primary';
      } else if (rate >= 50) {
        badge = 'Cukup ⚠️';
        badgeColor = 'warning';
      } else {
        badge = 'Perlu Evaluasi ❗';
        badgeColor = 'danger';
      }

      return {
        roomId: pj.assignedRoomId || '',
        roomName: roomDisplay,
        pjUsername: pj.username,
        pjName: pj.name,
        status: pj.status,
        totalFilledSessions,
        targetSessions,
        rate,
        bySession,
        badge,
        badgeColor
      };
    });

    // Sort by most active sessions first
    return recapList.sort((a, b) => b.totalFilledSessions - a.totalFilledSessions);
  }

  // Monthly Recap calculation for Student Attendance
  getStudentMonthlyRecap(year, month, roomId = null) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthlyLogs = this.getAttendanceLogs().filter(l => {
      const matchMonth = l.date.startsWith(prefix);
      return roomId && roomId !== 'all' ? matchMonth && l.roomId === roomId : matchMonth;
    });

    let students = this.getStudents();
    if (roomId && roomId !== 'all') {
      students = students.filter(s => s.roomId === roomId);
    }

    const studentStats = students.map(std => {
      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let pulang = 0;
      let totalRecorded = 0;

      monthlyLogs.forEach(log => {
        const item = log.items.find(i => i.studentId === std.id);
        if (item) {
          totalRecorded++;
          if (item.status === 'hadir') hadir++;
          else if (item.status === 'izin') izin++;
          else if (item.status === 'sakit') sakit++;
          else if (item.status === 'pulang') pulang++;
        }
      });

      const attendancePercentage = totalRecorded > 0 ? Math.round((hadir / totalRecorded) * 100) : 0;
      const room = this.getRoomById(std.roomId);

      return {
        studentId: std.id,
        nis: std.nis,
        name: std.name,
        roomId: std.roomId,
        roomName: room ? room.name : 'Unknown Room',
        class: std.class,
        hadir,
        izin,
        sakit,
        pulang,
        totalRecorded,
        attendancePercentage
      };
    });

    return studentStats;
  }

  // Get complete chronological day-by-day attendance history for a specific student (Audit Trail)
  getStudentDailyHistory(studentId, year = null, month = null) {
    const student = this.getStudentById(studentId);
    if (!student) return { student: null, summary: {}, history: [] };

    let logs = [...this.getAttendanceLogs()];

    if (year && month) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      logs = logs.filter(l => l.date.startsWith(prefix));
    }

    // Sort chronologically descending (newest first)
    logs.sort((a, b) => (b.date + ' ' + (b.recordedAt || '')).localeCompare(a.date + ' ' + (a.recordedAt || '')));

    const history = [];
    logs.forEach(log => {
      const item = (log.items || []).find(i => i.studentId === studentId);
      if (item) {
        history.push({
          logId: log.id,
          date: log.date,
          sessionId: log.sessionId,
          sessionName: log.sessionName,
          status: item.status,
          note: item.note || '',
          recordedByName: log.recordedByName,
          recordedByUsername: log.recordedByUsername,
          recordedAt: log.recordedAt,
          roomName: log.roomName
        });
      }
    });

    const summary = {
      total: history.length,
      hadir: history.filter(h => h.status === 'hadir').length,
      izin: history.filter(h => h.status === 'izin').length,
      sakit: history.filter(h => h.status === 'sakit').length,
      pulang: history.filter(h => h.status === 'pulang').length
    };
    summary.rate = summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0;

    return {
      student,
      summary,
      history
    };
  }
}

// Export singleton instance
window.store = new DataStore();
