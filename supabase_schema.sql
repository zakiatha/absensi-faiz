-- ==============================================================================
-- SISTEM E-ABSENSI ASRAMA PUTRA - SUPABASE DATABASE SCHEMA & INITIAL SEED
-- ==============================================================================
-- Proyek: E-Absensi Asrama Putra (Pondok Pesantren)
-- Versi: 1.1.0
-- Supabase Project Ref: ipsbmrarkncnwwyqmyqp
-- Endpoint REST: https://ipsbmrarkncnwwyqmyqp.supabase.co/rest/v1
-- ==============================================================================
-- PETUNJUK:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Buka menu "SQL Editor" di bilah kiri.
-- 3. Buat New Query, paste seluruh isi skrip ini, lalu klik "Run".
-- ==============================================================================

-- 1. TABEL KAMAR (rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pj_id TEXT DEFAULT '',
  pj_name TEXT DEFAULT '',
  capacity INTEGER DEFAULT 10,
  floor TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABEL PENGGUNA & BAPAK KAMAR (users)
CREATE TABLE IF NOT EXISTS public.users (
  username TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'bapak_kamar')),
  phone TEXT DEFAULT '',
  room_id TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Pastikan kolom plaintext password dihapus jika tabel sudah ada sebelumnya
ALTER TABLE public.users DROP COLUMN IF EXISTS plain_password;

-- 3. TABEL SESI ABSENSI (sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  time_range TEXT NOT NULL,
  order_num INTEGER DEFAULT 1 NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABEL KRITERIA KEHADIRAN (criteria)
CREATE TABLE IF NOT EXISTS public.criteria (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  bg_color TEXT DEFAULT '',
  border_color TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABEL DATA SANTRI (students)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  nis TEXT DEFAULT '',
  name TEXT NOT NULL,
  room_id TEXT DEFAULT '',
  class TEXT DEFAULT '',
  parent_contact TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. TABEL LOG REKAP ABSENSI HARIAN (attendance_logs)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  session_id TEXT NOT NULL,
  session_name TEXT DEFAULT '',
  room_id TEXT NOT NULL,
  room_name TEXT DEFAULT '',
  recorded_by_username TEXT DEFAULT '',
  recorded_by_name TEXT DEFAULT '',
  recorded_by_role TEXT DEFAULT '',
  recorded_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT unique_attendance_session UNIQUE (date, session_id, room_id)
);

-- ==============================================================================
-- INDEXING UNTUK OPTIMASI PERFORMA QUERY CEPAT
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_room_id ON public.students(room_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_room_date ON public.attendance_logs(room_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_pj ON public.attendance_logs(recorded_by_username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ==============================================================================
-- KEAMANAN: ROW LEVEL SECURITY (RLS) & POLICIES (ANON PUBLIC ACCESS)
-- ==============================================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Drop policies lama jika sudah ada agar bisa re-run tanpa error
DROP POLICY IF EXISTS "Allow anon all on rooms" ON public.rooms;
CREATE POLICY "Allow anon all on rooms" ON public.rooms FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on users" ON public.users;
CREATE POLICY "Allow anon all on users" ON public.users FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on sessions" ON public.sessions;
CREATE POLICY "Allow anon all on sessions" ON public.sessions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on criteria" ON public.criteria;
CREATE POLICY "Allow anon all on criteria" ON public.criteria FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on students" ON public.students;
CREATE POLICY "Allow anon all on students" ON public.students FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on attendance_logs" ON public.attendance_logs;
CREATE POLICY "Allow anon all on attendance_logs" ON public.attendance_logs FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==============================================================================
-- PROTEKSI DATABASE TINGKAT TINGGI (TRIGGER & INTEGRITY CONSTRAINTS)
-- ==============================================================================

-- 1. Trigger: Melindungi akun admin utama dari penghapusan disengaja atau tidak
CREATE OR REPLACE FUNCTION public.protect_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  IF LOWER(OLD.username) = 'admin' THEN
    RAISE EXCEPTION 'Keamanan Database: Akun admin utama tidak boleh dihapus!';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_admin ON public.users;
CREATE TRIGGER trg_protect_admin
BEFORE DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_user();

-- 2. Fungsi Verifikasi Kredensial Server-Side (RPC)
-- Memvalidasi autentikasi langsung di dalam database engine
CREATE OR REPLACE FUNCTION public.verify_user_credentials(p_username TEXT, p_password_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT username, name, role, phone, room_id, status
  INTO v_user
  FROM public.users
  WHERE LOWER(username) = LOWER(p_username)
    AND password_hash = p_password_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Username atau kata sandi tidak cocok.');
  END IF;

  IF v_user.status = 'inactive' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Akun dinonaktifkan oleh Administrator.');
  END IF;

  RETURN jsonb_build_object('valid', true, 'user', row_to_json(v_user));
END;
$$;

-- Berikan izin akses RPC ke anon role
GRANT EXECUTE ON FUNCTION public.verify_user_credentials(TEXT, TEXT) TO anon;

-- ==============================================================================
-- DATA SEED AWAL (DEFAULT ROOMS, USERS, SESSIONS, CRITERIA, STUDENTS)
-- ==============================================================================

-- 1. Seed Rooms
INSERT INTO public.rooms (id, name, pj_id, pj_name, capacity, floor) VALUES
  ('kamar-1', 'Kamar 1 - Abu Bakar Ash-Shiddiq', 'faiz', 'Ustadz Faiz Ar-Rasyid', 10, 'Lantai 1'),
  ('kamar-2', 'Kamar 2 - Umar bin Khattab', 'zaki', 'Ustadz Zaki Athallah', 10, 'Lantai 1'),
  ('kamar-3', 'Kamar 3 - Utsman bin Affan', 'ridwan', 'Ustadz Ridwan Kamil', 10, 'Lantai 1'),
  ('kamar-4', 'Kamar 4 - Ali bin Abi Thalib', 'hanif', 'Ustadz Hanif Al-Banjari', 10, 'Lantai 2'),
  ('kamar-5', 'Kamar 5 - Thalhah bin Ubaidillah', 'ilham', 'Ustadz Ilham Nugraha', 10, 'Lantai 2'),
  ('kamar-6', 'Kamar 6 - Zubair bin Awwam', 'danang', 'Ustadz Danang Prasetyo', 10, 'Lantai 2')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  pj_id = EXCLUDED.pj_id,
  pj_name = EXCLUDED.pj_name,
  capacity = EXCLUDED.capacity,
  floor = EXCLUDED.floor;

-- 2. Seed Users (Password menggunakan SHA-256 + Salt: asrama_pesantren_secure_salt_2026)
INSERT INTO public.users (username, name, role, phone, room_id, status, password_hash) VALUES
  ('admin', 'Ust. H. Abdurrahman (Admin Pusat)', 'admin', '081234567890', '', 'active', '70f239dfe9cff3f7fc89d60f742a46b7c1004ef423987117f963a77dfea4d1da'),
  ('faiz', 'Ustadz Faiz Ar-Rasyid', 'bapak_kamar', '081298765431', 'kamar-1', 'active', 'b2b7306e1fea9a2237ce9e626be243e5a121f8f3839ea4f105f766f0c2e78c99'),
  ('zaki', 'Ustadz Zaki Athallah', 'bapak_kamar', '081298765432', 'kamar-2', 'active', '1a485aad06363145632cc00bfc8bb757330e7b9668fcb8d66404ec909ec90240'),
  ('ridwan', 'Ustadz Ridwan Kamil', 'bapak_kamar', '081298765433', 'kamar-3', 'active', '327f958862d48a055c36bfe89e2af82fd0c03cd4d7806fb22f7b2d73197793bc'),
  ('hanif', 'Ustadz Hanif Al-Banjari', 'bapak_kamar', '081298765434', 'kamar-4', 'active', 'f973e802240ab5b4ba14510cfda0354355f89818280170e7425b9f638d401c24'),
  ('ilham', 'Ustadz Ilham Nugraha', 'bapak_kamar', '081298765435', 'kamar-5', 'active', '550496275fa0c9334eec87edf70f1923d3370c673b81200091ae1228bbd83beb'),
  ('danang', 'Ustadz Danang Prasetyo', 'bapak_kamar', '081298765436', 'kamar-6', 'active', 'e28a6c780980683323884e30ed01febb4b53084227809e3aadcddf2858307b37')
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  room_id = EXCLUDED.room_id,
  status = EXCLUDED.status,
  password_hash = EXCLUDED.password_hash;

-- 3. Seed Sessions
INSERT INTO public.sessions (id, name, label, time_range, order_num, active) VALUES
  ('pagi', 'Pagi', '🌅 Absen Pagi (Shubuh & Halaqah)', '05:00 - 06:30', 1, true),
  ('siang', 'Siang', '☀️ Absen Siang (Dzuhur & Istirahat)', '12:30 - 14:00', 2, true),
  ('sore', 'Sore', '🌇 Absen Sore (Ashar & Mandiri)', '16:00 - 17:30', 3, true),
  ('malam', 'Malam', '🌙 Absen Malam (Isya & Jam Tidur)', '20:30 - 22:00', 4, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  label = EXCLUDED.label,
  time_range = EXCLUDED.time_range,
  order_num = EXCLUDED.order_num,
  active = EXCLUDED.active;

-- 4. Seed Criteria
INSERT INTO public.criteria (id, label, color, bg_color, border_color, description) VALUES
  ('hadir', 'Hadir', '#10b981', '#ecfdf5', '#a7f3d0', 'Berada di kamar mengikuti kegiatan asrama'),
  ('izin', 'Izin', '#f59e0b', '#fffbeb', '#fde68a', 'Ada izin resmi dari pengasuh / walisantri'),
  ('sakit', 'Sakit', '#ef4444', '#fef2f2', '#fecaca', 'Sedang dirawat / istirahat di UKS / Kamar'),
  ('pulang', 'Pulang', '#6366f1', '#eef2ff', '#c7d2fe', 'Pulang ke rumah walisantri secara legal')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  color = EXCLUDED.color,
  bg_color = EXCLUDED.bg_color,
  border_color = EXCLUDED.border_color,
  description = EXCLUDED.description;

-- 5. Seed Students (36 Santri terdistribusi di 6 kamar)
INSERT INTO public.students (id, nis, name, room_id, class, parent_contact) VALUES
  -- Kamar 1
  ('std-101', '20260101', 'Muhammad Al-Fatih', 'kamar-1', '10-A', '08130000101'),
  ('std-102', '20260102', 'Ahmad Dahlan Al-Kautsar', 'kamar-1', '10-A', '08130000102'),
  ('std-103', '20260103', 'Bilal bin Rabah Pratama', 'kamar-1', '10-B', '08130000103'),
  ('std-104', '20260104', 'Salman Al-Farisi Ilham', 'kamar-1', '10-B', '08130000104'),
  ('std-105', '20260105', 'Zaid bin Tsabit Firdaus', 'kamar-1', '11-A', '08130000105'),
  ('std-106', '20260106', 'Usamah bin Zaid Munir', 'kamar-1', '11-B', '08130000106'),

  -- Kamar 2
  ('std-201', '20260201', 'Khalid bin Walid Saifullah', 'kamar-2', '10-A', '08130000201'),
  ('std-202', '20260202', 'Thariq bin Ziyad Rahman', 'kamar-2', '10-B', '08130000202'),
  ('std-203', '20260203', 'Hamzah bin Abdul Muthalib', 'kamar-2', '11-A', '08130000203'),
  ('std-204', '20260204', 'Saad bin Abi Waqqas Zuhri', 'kamar-2', '11-B', '08130000204'),
  ('std-205', '20260205', 'Ammar bin Yasir Rasyid', 'kamar-2', '12-A', '08130000205'),
  ('std-206', '20260206', 'Muadz bin Jabal Anshari', 'kamar-2', '12-B', '08130000206'),

  -- Kamar 3
  ('std-301', '20260301', 'Abdullah bin Masud Hafizh', 'kamar-3', '10-A', '08130000301'),
  ('std-302', '20260302', 'Abu Dzar Al-Ghifari Shadiq', 'kamar-3', '10-B', '08130000302'),
  ('std-303', '20260303', 'Hudzaifah bin Al-Yaman Amin', 'kamar-3', '11-A', '08130000303'),
  ('std-304', '20260304', 'Jafar bin Abi Thalib Thayar', 'kamar-3', '11-B', '08130000304'),
  ('std-305', '20260305', 'Shuhaib Ar-Rumi Sinan', 'kamar-3', '12-A', '08130000305'),
  ('std-306', '20260306', 'Miqdad bin Amr Aswad', 'kamar-3', '12-B', '08130000306'),

  -- Kamar 4
  ('std-401', '20260401', 'Hasan bin Ali Murtadha', 'kamar-4', '10-A', '08130000401'),
  ('std-402', '20260402', 'Husain bin Ali Mujahid', 'kamar-4', '10-B', '08130000402'),
  ('std-403', '20260403', 'Abbas bin Abdul Muthalib', 'kamar-4', '11-A', '08130000403'),
  ('std-404', '20260404', 'Abdullah bin Abbas Faqih', 'kamar-4', '11-B', '08130000404'),
  ('std-405', '20260405', 'Jabir bin Abdillah Sulami', 'kamar-4', '12-A', '08130000405'),
  ('std-406', '20260406', 'Anas bin Malik Khadim', 'kamar-4', '12-B', '08130000406'),

  -- Kamar 5
  ('std-501', '20260501', 'Said bin Zaid Qurasyi', 'kamar-5', '10-A', '08130000501'),
  ('std-502', '20260502', 'Abu Ubaidah Amir Jarrah', 'kamar-5', '10-B', '08130000502'),
  ('std-503', '20260503', 'Abdurrahman bin Auf Tajir', 'kamar-5', '11-A', '08130000503'),
  ('std-504', '20260504', 'Zubair Al-Awwam Hawari', 'kamar-5', '11-B', '08130000504'),
  ('std-505', '20260505', 'Ubay bin Kaab Anshari', 'kamar-5', '12-A', '08130000505'),
  ('std-506', '20260506', 'Tamim Ad-Dari Rahib', 'kamar-5', '12-B', '08130000506'),

  -- Kamar 6
  ('std-601', '20260601', 'Khabbab bin Al-Arat Tamimi', 'kamar-6', '10-A', '08130000601'),
  ('std-602', '20260602', 'Bilal Al-Habasyi Muadzin', 'kamar-6', '10-B', '08130000602'),
  ('std-603', '20260603', 'Imran bin Hushain Khuzaah', 'kamar-6', '11-A', '08130000603'),
  ('std-604', '20260604', 'Hakim bin Hizam Asadi', 'kamar-6', '11-B', '08130000604'),
  ('std-605', '20260605', 'Rafi bin Khadij Ausiy', 'kamar-6', '12-A', '08130000605'),
  ('std-606', '20260606', 'Abu Hurairah Ad-Dausi', 'kamar-6', '12-B', '08130000606')
ON CONFLICT (id) DO UPDATE SET
  nis = EXCLUDED.nis,
  name = EXCLUDED.name,
  room_id = EXCLUDED.room_id,
  class = EXCLUDED.class,
  parent_contact = EXCLUDED.parent_contact;

-- ==============================================================================
-- KONFIRMASI STATUS INSTALASI SCHEMA
-- ==============================================================================
SELECT 
  'SUCCESS' AS status,
  (SELECT COUNT(*) FROM public.rooms) AS total_rooms,
  (SELECT COUNT(*) FROM public.users) AS total_users,
  (SELECT COUNT(*) FROM public.students) AS total_students,
  (SELECT COUNT(*) FROM public.sessions) AS total_sessions,
  (SELECT COUNT(*) FROM public.criteria) AS total_criteria;
