# Konfigurasi Environment

Folder ini berisi file konfigurasi untuk berbagai environment:

## File Konfigurasi

- `pengembangan.env` - Konfigurasi untuk development
- `produksi.env` - Konfigurasi untuk production

## Cara Penggunaan

1. Copy file konfigurasi yang sesuai ke folder aplikasi-server sebagai `.env`
2. Isi nilai-nilai yang diperlukan sesuai dengan environment Anda

### Untuk Development:
```bash
cp konfigurasi/pengembangan.env aplikasi-server/.env
```

### Untuk Production:
```bash
cp konfigurasi/produksi.env aplikasi-server/.env
```

## Variabel Environment

- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Port untuk server backend
- `CLIENT_PORT`: Port untuk client frontend (development only)
- `DB_PATH`: Path ke file database SQLite
- `JIRA_*`: Konfigurasi untuk integrasi JIRA
- `SUPABASE_*`: Konfigurasi untuk Supabase (opsional)
- `GROQ_API_KEY`: API key untuk GROQ AI service