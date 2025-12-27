# 🚀 Panduan Migrasi Supabase SpecWeave

## Informasi Project

### Project Lama (Source)
- **URL**: `https://xuttuadlaxgmtusgdxsp.supabase.co`
- **Project ID**: `xuttuadlaxgmtusgdxsp`

### Project Baru (Destination)  
- **URL**: `https://nthylrvtkaqqixznrtaj.supabase.co`
- **Project ID**: `nthylrvtkaqqixznrtaj`

## 📋 Checklist Migrasi

### Fase 1: Persiapan
- [ ] Backup data project lama
- [ ] Dapatkan Service Role Key dari kedua project
- [ ] Setup schema di project baru
- [ ] Konfigurasi Authentication providers

### Fase 2: Migrasi Schema
- [ ] Migrasi database schema
- [ ] Setup RLS policies
- [ ] Migrasi functions dan triggers
- [ ] Insert system templates

### Fase 3: Migrasi Data
- [ ] Migrasi user profiles
- [ ] Migrasi scenarios
- [ ] Migrasi templates (custom)
- [ ] Migrasi JIRA connections
- [ ] Migrasi evaluation metrics

### Fase 4: Migrasi Storage
- [ ] Migrasi storage buckets
- [ ] Migrasi files dan assets

### Fase 5: Update Aplikasi
- [ ] Update environment variables
- [ ] Update konfigurasi OAuth
- [ ] Test semua fitur
- [ ] Deploy ke production

## 🛠️ Langkah-langkah Migrasi

### 1. Persiapan Environment

Pertama, dapatkan Service Role Key dari kedua project:

1. **Project Lama**: https://supabase.com/dashboard/project/xuttuadlaxgmtusgdxsp/settings/api
2. **Project Baru**: https://supabase.com/dashboard/project/nthylrvtkaqqixznrtaj/settings/api

### 2. Backup Data Project Lama

```bash
# Install Supabase CLI jika belum ada
npm install -g supabase

# Login ke Supabase
supabase login

# Backup database
pg_dump "postgresql://postgres:[PASSWORD]@db.xuttuadlaxgmtusgdxsp.supabase.co:5432/postgres" > backup_old_project.sql
```

### 3. Setup Schema di Project Baru

Jalankan script schema yang sudah ada:

```sql
-- Jalankan file basis-data/schema.sql di project baru
-- Melalui Supabase Dashboard > SQL Editor
```

### 4. Konfigurasi Authentication

Di project baru, setup:
- **Site URL**: `http://localhost:3000` (development)
- **Redirect URLs**: `http://localhost:3000/auth/callback`
- **Google OAuth**: Transfer konfigurasi dari project lama

### 5. Migrasi Data

Gunakan script Python berikut untuk migrasi data:

```python
#!/usr/bin/env python3
# migration_script.py

import os
import json
from supabase import create_client

# Konfigurasi project lama
OLD_SUPABASE_URL = "https://xuttuadlaxgmtusgdxsp.supabase.co"
OLD_SERVICE_KEY = "YOUR_OLD_SERVICE_KEY_HERE"

# Konfigurasi project baru
NEW_SUPABASE_URL = "https://nthylrvtkaqqixznrtaj.supabase.co"
NEW_SERVICE_KEY = "YOUR_NEW_SERVICE_KEY_HERE"

def migrate_data():
    # Buat client untuk kedua project
    old_client = create_client(OLD_SUPABASE_URL, OLD_SERVICE_KEY)
    new_client = create_client(NEW_SUPABASE_URL, NEW_SERVICE_KEY)
    
    print("🚀 Memulai migrasi data...")
    
    # 1. Migrasi profiles
    print("📊 Migrasi user profiles...")
    profiles = old_client.table('profiles').select('*').execute()
    if profiles.data:
        new_client.table('profiles').insert(profiles.data).execute()
        print(f"✅ {len(profiles.data)} profiles berhasil dimigrasikan")
    
    # 2. Migrasi templates (custom only, system templates sudah ada)
    print("📝 Migrasi custom templates...")
    templates = old_client.table('templates').select('*').eq('is_system', False).execute()
    if templates.data:
        new_client.table('templates').insert(templates.data).execute()
        print(f"✅ {len(templates.data)} custom templates berhasil dimigrasikan")
    
    # 3. Migrasi scenarios
    print("🎭 Migrasi scenarios...")
    scenarios = old_client.table('scenarios').select('*').execute()
    if scenarios.data:
        # Batch insert untuk data besar
        batch_size = 100
        for i in range(0, len(scenarios.data), batch_size):
            batch = scenarios.data[i:i+batch_size]
            new_client.table('scenarios').insert(batch).execute()
        print(f"✅ {len(scenarios.data)} scenarios berhasil dimigrasikan")
    
    # 4. Migrasi JIRA connections
    print("🔗 Migrasi JIRA connections...")
    jira_connections = old_client.table('jira_connections').select('*').execute()
    if jira_connections.data:
        new_client.table('jira_connections').insert(jira_connections.data).execute()
        print(f"✅ {len(jira_connections.data)} JIRA connections berhasil dimigrasikan")
    
    # 5. Migrasi evaluation metrics
    print("📈 Migrasi evaluation metrics...")
    metrics = old_client.table('evaluation_metrics').select('*').execute()
    if metrics.data:
        batch_size = 100
        for i in range(0, len(metrics.data), batch_size):
            batch = metrics.data[i:i+batch_size]
            new_client.table('evaluation_metrics').insert(batch).execute()
        print(f"✅ {len(metrics.data)} evaluation metrics berhasil dimigrasikan")
    
    # 6. Migrasi performance logs
    print("⚡ Migrasi performance logs...")
    logs = old_client.table('performance_logs').select('*').execute()
    if logs.data:
        batch_size = 100
        for i in range(0, len(logs.data), batch_size):
            batch = logs.data[i:i+batch_size]
            new_client.table('performance_logs').insert(batch).execute()
        print(f"✅ {len(logs.data)} performance logs berhasil dimigrasikan")
    
    print("🎉 Migrasi data selesai!")

if __name__ == "__main__":
    migrate_data()
```

### 6. Migrasi Storage (Jika Ada)

```python
#!/usr/bin/env python3
# storage_migration.py

import os
import magic
from supabase import create_client

# Konfigurasi (sama seperti di atas)
OLD_SUPABASE_URL = "https://xuttuadlaxgmtusgdxsp.supabase.co"
OLD_SERVICE_KEY = "YOUR_OLD_SERVICE_KEY_HERE"
NEW_SUPABASE_URL = "https://nthylrvtkaqqixznrtaj.supabase.co"
NEW_SERVICE_KEY = "YOUR_NEW_SERVICE_KEY_HERE"

def migrate_storage():
    old_client = create_client(OLD_SUPABASE_URL, OLD_SERVICE_KEY)
    new_client = create_client(NEW_SUPABASE_URL, NEW_SERVICE_KEY)
    
    print("📁 Memulai migrasi storage...")
    
    # List semua buckets
    buckets = old_client.storage.list_buckets()
    
    for bucket in buckets:
        print(f"📦 Migrasi bucket: {bucket.name}")
        
        # Buat bucket di project baru
        try:
            new_client.storage.create_bucket(
                bucket.name, 
                options={"public": bucket.public}
            )
        except Exception as e:
            print(f"⚠️ Bucket {bucket.name} mungkin sudah ada: {e}")
        
        # Migrasi files dalam bucket
        migrate_bucket_files(old_client, new_client, bucket.name)
    
    print("✅ Migrasi storage selesai!")

def migrate_bucket_files(old_client, new_client, bucket_name, path=""):
    try:
        objects = old_client.storage.from_(bucket_name).list(path=path)
        
        for obj in objects:
            if obj.get('metadata') is None:  # Directory
                subdirectory = os.path.join(path, obj['name'])
                migrate_bucket_files(old_client, new_client, bucket_name, subdirectory)
            else:  # File
                file_path = f"{path}/{obj['name']}" if path else obj['name']
                print(f"📄 Migrasi file: {file_path}")
                
                # Download file
                file_data = old_client.storage.from_(bucket_name).download(file_path)
                
                # Upload ke project baru
                new_client.storage.from_(bucket_name).upload(
                    file_path, 
                    file_data,
                    file_options={"x-upsert": "true"}
                )
                
    except Exception as e:
        print(f"❌ Error migrasi bucket {bucket_name}: {e}")

if __name__ == "__main__":
    migrate_storage()
```

### 7. Update Environment Variables

Update file `.env` dengan konfigurasi project baru:

```env
# Supabase Configuration - PROJECT BARU
VITE_SUPABASE_URL=https://nthylrvtkaqqixznrtaj.supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY_PROJECT_BARU]

# API Configuration (tetap sama)
VITE_API_URL=http://localhost:5003/api

# JIRA Integration Configuration (tetap sama)
VITE_JIRA_CALLBACK_URL=http://localhost:3000/jira/callback
VITE_ENABLE_JIRA_INTEGRATION=true
VITE_JIRA_OAUTH_ENABLED=true
```

## 🧪 Testing Migrasi

### 1. Test Database Connection

```javascript
// test-migration.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nthylrvtkaqqixznrtaj.supabase.co',
  '[ANON_KEY_BARU]'
);

async function testMigration() {
  console.log('🧪 Testing migrasi...');
  
  // Test 1: Cek profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('count');
  
  console.log('👥 Profiles:', profiles, profileError);
  
  // Test 2: Cek scenarios
  const { data: scenarios, error: scenarioError } = await supabase
    .from('scenarios')
    .select('count');
  
  console.log('🎭 Scenarios:', scenarios, scenarioError);
  
  // Test 3: Cek templates
  const { data: templates, error: templateError } = await supabase
    .from('templates')
    .select('count');
  
  console.log('📝 Templates:', templates, templateError);
}

testMigration();
```

### 2. Test Authentication

1. Jalankan aplikasi: `npm run dev`
2. Test login dengan email/password
3. Test Google OAuth
4. Verifikasi profile creation

## 🚨 Troubleshooting

### Error: "relation does not exist"
- Pastikan schema sudah dijalankan di project baru
- Cek apakah semua tables sudah dibuat

### Error: "RLS policy violation"
- Pastikan RLS policies sudah dikonfigurasi
- Cek apakah user memiliki permission yang tepat

### Error: "duplicate key value"
- Mungkin ada data yang sudah ada di project baru
- Gunakan UPSERT atau hapus data existing

### Google OAuth tidak bekerja
- Update redirect URLs di Google Cloud Console
- Update Site URL di Supabase Dashboard
- Pastikan Client ID/Secret sudah dikonfigurasi

## 📞 Support

Jika mengalami masalah:
1. Cek logs di Supabase Dashboard
2. Periksa browser console untuk errors
3. Verifikasi environment variables
4. Test koneksi database

## 🎯 Post-Migration Checklist

- [ ] Semua data berhasil dimigrasikan
- [ ] Authentication berfungsi normal
- [ ] Google OAuth bekerja
- [ ] Aplikasi berjalan tanpa error
- [ ] Performance normal
- [ ] Backup project lama (jangan hapus dulu)
- [ ] Update DNS/domain jika perlu
- [ ] Informasikan tim tentang perubahan