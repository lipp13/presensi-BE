-- ==============================================================================
-- DATABASE SCHEMA: APLIKASI PRESENSI ONLINE SISWA PKL
-- SMK Taruna Bhakti di Direktorat Bina Teknik Sumber Daya Air
-- PostgreSQL / Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABEL PROFILES (Pengguna Aplikasi terhubung ke auth.users Supabase)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    nisn VARCHAR(50),
    school VARCHAR(255) DEFAULT 'SMK Taruna Bhakti',
    major VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index unik untuk NISN siswa (NISN hanya unik untuk siswa, admin bisa NULL tanpa konflik)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nisn_unique ON public.profiles(nisn) WHERE nisn IS NOT NULL;

-- ==============================================================================
-- 3. TABEL LOCATIONS (Titik Lokasi Kantor / Balai SDA yang Diizinkan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Data Default Lokasi Kantor Direktorat Bina Teknik SDA
INSERT INTO public.locations (name, latitude, longitude, radius_meters, is_active)
SELECT 'Direktorat Bina Teknik Sumber Daya Air', -6.899380, 107.618610, 100, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.locations WHERE name = 'Direktorat Bina Teknik Sumber Daya Air'
);

-- ==============================================================================
-- 4. TABEL ATTENDANCE (Perekaman Kehadiran Siswa PKL)
-- Model: 1 baris per siswa per hari (Mendukung Check-in Masuk & Check-out Pulang)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Data Check-in (Masuk)
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    check_in_latitude NUMERIC(10, 7) NOT NULL,
    check_in_longitude NUMERIC(10, 7) NOT NULL,
    check_in_accuracy NUMERIC(8, 2) NOT NULL,
    check_in_distance NUMERIC(8, 2) NOT NULL,
    check_in_photo_path TEXT NOT NULL,

    -- Data Check-out (Pulang)
    check_out_time TIMESTAMPTZ,
    check_out_latitude NUMERIC(10, 7),
    check_out_longitude NUMERIC(10, 7),
    check_out_accuracy NUMERIC(8, 2),
    check_out_distance NUMERIC(8, 2),
    check_out_photo_path TEXT,

    -- Status Presensi
    status VARCHAR(50) NOT NULL DEFAULT 'CHECKED_IN' CHECK (status IN ('CHECKED_IN', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Garansi Anti-Duplikasi: 1 siswa hanya memiliki 1 baris absensi per tanggal
    CONSTRAINT unique_user_per_day UNIQUE (user_id, attendance_date)
);

-- Indexing untuk percepat query riwayat dan query kehadiran hari ini
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, attendance_date);

-- ==============================================================================
-- 5. FUNCTION & TRIGGER: Auto Update updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_locations_updated_at ON public.locations;
CREATE TRIGGER tr_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_attendance_updated_at ON public.attendance;
CREATE TRIGGER tr_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 6. FUNCTION & TRIGGER: Auto Sync Supabase Auth ke Tabel Profiles
-- Saat Admin membuat User di Supabase Auth, otomatis masuk ke public.profiles
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, nisn, school, major, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'nisn',
        COALESCE(NEW.raw_user_meta_data->>'school', 'SMK Taruna Bhakti'),
        NEW.raw_user_meta_data->>'major',
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        nisn = EXCLUDED.nisn,
        school = EXCLUDED.school,
        major = EXCLUDED.major,
        role = EXCLUDED.role,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policy Profiles:
-- 1. User dapat melihat profil miliknya sendiri
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- 2. Admin dapat melihat seluruh profil
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy Locations:
-- Siapapun yang authenticated dapat melihat daftar lokasi kantor aktif
CREATE POLICY "Authenticated users can read active locations"
    ON public.locations FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Policy Attendance:
-- 1. User dapat melihat riwayat absensi miliknya sendiri
CREATE POLICY "Users can view own attendance"
    ON public.attendance FOR SELECT
    USING (auth.uid() = user_id);

-- 2. User dapat insert check-in miliknya sendiri
CREATE POLICY "Users can insert own check-in"
    ON public.attendance FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. User dapat update check-out miliknya sendiri
CREATE POLICY "Users can update own check-out"
    ON public.attendance FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. Admin dapat melihat seluruh riwayat absensi semua siswa
CREATE POLICY "Admins can view all attendance"
    ON public.attendance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ==============================================================================
-- 8. SUPABASE STORAGE BUCKET: attendance-photos
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy Storage: Authenticated user dapat upload foto presensi
CREATE POLICY "Authenticated users can upload attendance photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'attendance-photos');

-- Policy Storage: Siapapun (atau authenticated) dapat melihat foto
CREATE POLICY "Anyone can view attendance photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'attendance-photos');
