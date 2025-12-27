# 🚀 SpecWeave Supabase Migration Scripts

Scripts untuk memindahkan data dari project Supabase lama ke project baru.

## 📋 Prerequisites

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Untuk Windows:**
```bash
pip install python-magic-bin
```

### 2. Dapatkan Service Role Keys

1. **Project Lama**: https://supabase.com/dashboard/project/xuttuadlaxgmtusgdxsp/settings/api
2. **Project Baru**: https://supabase.com/dashboard/project/nthylrvtkaqqixznrtaj/settings/api

⚠️ **PENTING**: Gunakan **Service Role Key**, bukan Anon Key!

## 🛠️ Langkah Migrasi

### Step 1: Setup Schema di Project Baru

1. Buka Supabase Dashboard project baru
2. Pergi ke **SQL Editor**
3. Jalankan file `../basis-data/schema.sql`

### Step 2: Migrasi Data

```bash
python migrate_data.py
```

Script ini akan memigrasikan:
- ✅ User profiles
- ✅ Custom templates (system templates sudah ada)
- ✅ Scenarios
- ✅ JIRA connections
- ✅ Evaluation metrics
- ✅ Performance logs

### Step 3: Migrasi Storage (Opsional)

```bash
python migrate_storage.py
```

Script ini akan memigrasikan:
- ✅ Storage buckets
- ✅ Files dan assets
- ✅ MIME type detection

### Step 4: Update Environment Variables

```bash
python update_env.py
```

Script ini akan mengupdate:
- ✅ `aplikasi-klien/.env`
- ✅ `aplikasi-klien/.env.example`
- ✅ `konfigurasi/pengembangan.env`
- ✅ `aplikasi-klien/diagnose-google-oauth.html`
- ✅ `aplikasi-klien/test-google-oauth.js`

## 📊 Monitoring Progress

Semua script memberikan output real-time dengan:
- ⏰ Timestamp setiap operasi
- 📊 Progress counter
- ✅ Status berhasil/gagal
- 📋 Ringkasan di akhir

## 🔍 Verifikasi Migrasi

### 1. Cek Data Count

```sql
-- Jalankan di SQL Editor project baru
SELECT 
  'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 
  'scenarios' as table_name, COUNT(*) as count FROM scenarios
UNION ALL
SELECT 
  'templates' as table_name, COUNT(*) as count FROM templates
UNION ALL
SELECT 
  'jira_connections' as table_name, COUNT(*) as count FROM jira_connections;
```

### 2. Test Aplikasi

```bash
cd ../aplikasi-klien
npm run dev
```

### 3. Test Authentication

1. Buka http://localhost:3000
2. Test login dengan email/password
3. Test Google OAuth (setelah konfigurasi)

## 🚨 Troubleshooting

### Error: "relation does not exist"
```bash
# Pastikan schema sudah dijalankan
# Cek di Supabase Dashboard > Database > Tables
```

### Error: "RLS policy violation"
```bash
# Pastikan RLS policies sudah dibuat
# Cek di Supabase Dashboard > Authentication > Policies
```

### Error: "duplicate key value"
```bash
# Hapus data existing atau gunakan UPSERT
# Script sudah handle ini secara otomatis
```

### Error: "python-magic not found"
```bash
# Install dependencies
pip install python-magic

# Untuk Windows
pip install python-magic-bin
```

## 📝 Manual Steps

### 1. Google OAuth Setup

1. **Google Cloud Console**:
   - Update Authorized redirect URIs: `https://nthylrvtkaqqixznrtaj.supabase.co/auth/v1/callback`

2. **Supabase Dashboard**:
   - Pergi ke Authentication > Providers
   - Enable Google provider
   - Masukkan Client ID dan Secret
   - Set Site URL: `http://localhost:3000`
   - Add Redirect URL: `http://localhost:3000/auth/callback`

### 2. RLS Policies untuk Storage

Jika ada storage buckets, setup RLS policies:

```sql
-- Example untuk bucket 'avatars'
CREATE POLICY "Users can view own avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 🎯 Post-Migration Checklist

- [ ] ✅ Schema berhasil dibuat
- [ ] ✅ Data berhasil dimigrasikan
- [ ] ✅ Storage berhasil dimigrasikan (jika ada)
- [ ] ✅ Environment variables diupdate
- [ ] ✅ Google OAuth dikonfigurasi
- [ ] ✅ Aplikasi berjalan normal
- [ ] ✅ Authentication berfungsi
- [ ] ✅ Semua fitur ditest
- [ ] ✅ Backup project lama
- [ ] ✅ Update production deployment

## 📞 Support

Jika mengalami masalah:

1. Cek logs script untuk error details
2. Verifikasi Service Role Keys
3. Pastikan network connection stabil
4. Cek Supabase Dashboard untuk status project

## 🔒 Security Notes

- ⚠️ **Service Role Keys** memiliki akses penuh ke database
- 🔐 Jangan commit keys ke version control
- 🗑️ Hapus keys dari terminal history setelah selesai
- 💾 Backup project lama sebelum menghapus