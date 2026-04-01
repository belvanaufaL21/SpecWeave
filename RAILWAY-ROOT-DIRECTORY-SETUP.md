# Railway Root Directory Setup - PENTING!

## ⚠️ CRITICAL: Set Root Directory

Railway perlu tahu bahwa backend SpecWeave ada di folder `aplikasi-server`, bukan di root project.

## Cara Setting di Railway Dashboard

### Step 1: Buka Service Settings
1. Login ke Railway Dashboard
2. Pilih project SpecWeave
3. Klik service yang sedang running
4. Go to **Settings** tab

### Step 2: Set Root Directory
1. Scroll ke section **"Source"**
2. Cari **"Add Root Directory"** (seperti di screenshot)
3. Klik "Add Root Directory"
4. Input: `aplikasi-server`
5. Save/Apply changes

### Step 3: Redeploy
Railway akan otomatis trigger redeploy dengan root directory yang benar.

## Verifikasi

Setelah deploy, cek logs. Anda harus melihat:

```
✅ SpecWeave Server running on port 5003
🌐 Environment: production
📡 API available at http://localhost:5003/api
```

## Troubleshooting

### Jika masih error "Cannot find module"
- Pastikan Root Directory sudah di-set ke `aplikasi-server`
- Cek di Settings → Source → Root Directory

### Jika build gagal
- Pastikan `package.json` ada di `aplikasi-server/package.json`
- Cek build logs untuk error spesifik

## File Structure

Railway akan melihat struktur seperti ini setelah Root Directory di-set:

```
aplikasi-server/          ← Root Directory (Railway starts here)
├── package.json          ← Railway akan baca ini
├── index.js              ← Entry point
├── config/
├── controllers/
└── ...
```

Tanpa Root Directory, Railway akan cari `package.json` di root project (salah!):

```
/                         ← Railway starts here (WRONG!)
├── package.json          ← Ini monorepo package.json
├── aplikasi-server/      ← Backend ada di sini
└── aplikasi-klien/
```

## Alternative: Railway CLI

Jika prefer CLI:

```bash
railway link
railway up --service <your-service-id> --root aplikasi-server
```

Tapi cara via Dashboard lebih mudah dan visual.
