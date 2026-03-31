# Skrip Utilitas

Folder ini berisi script utilitas untuk menjalankan aplikasi dengan mudah.

## File Script

### Development Scripts
- `jalankan-klien.bat` - Menjalankan aplikasi client (frontend)
- `jalankan-server.bat` - Menjalankan aplikasi server (backend)

### Database Setup
- `insert_default_templates.js` - Insert default templates ke database (untuk initial setup)

## Cara Penggunaan

### Menjalankan Aplikasi

**Client (Frontend):**
```bash
# Windows
skrip-utilitas\jalankan-klien.bat

# Manual
cd aplikasi-klien
npm run dev
```

**Server (Backend):**
```bash
# Windows
skrip-utilitas\jalankan-server.bat

# Manual
cd aplikasi-server
npm run dev:clean
```

### Insert Default Templates (One-time setup)
```bash
node skrip-utilitas/insert_default_templates.js
```

## Catatan

- Pastikan sudah menjalankan `npm install` di folder `aplikasi-klien` dan `aplikasi-server`
- Pastikan file `.env` sudah dikonfigurasi dengan benar di masing-masing folder
- Python dependencies untuk METEOR/Sentence-BERT ada di `aplikasi-server/src/python/`
