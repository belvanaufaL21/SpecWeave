# Quick Fix: Profile Creation Issue

## Problem
User login berhasil tapi tidak ada profile di database.

## Quick Solution (5 menit)

### 1. Buka Supabase SQL Editor
Dashboard → SQL Editor → New Query

### 2. Jalankan Query Ini (Copy-Paste)

```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'user',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, name, email, avatar_url, role, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)),
  au.email,
  COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture'),
  'user',
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

### 3. Verify (Optional)

```sql
SELECT COUNT(*) as users_without_profile
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

Hasilnya harus `0`.

### 4. Test Login
- Clear browser cache
- Login ulang
- Seharusnya berhasil masuk ke aplikasi

## Done! ✅

User baru akan otomatis punya profile.
User lama sudah dibuatkan profile.

## Jika Masih Error

Cek console browser untuk error message, lalu:
1. Refresh halaman
2. Clear localStorage: `localStorage.clear()`
3. Login ulang

Atau hubungi developer dengan screenshot error.
