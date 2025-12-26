# Skrip Utilitas

Folder ini berisi berbagai script utilitas untuk setup dan maintenance aplikasi.

## File Script

### Database
- `setup-database.js` - Script untuk setup database awal
- `migrate_references.js` - Migration script untuk tabel references
- `migrate_references_direct.js` - Direct migration script

### Python Scripts
- `enhanced_meteor_evaluator.py` - Enhanced METEOR evaluator
- `meteor_evaluator.py` - Basic METEOR evaluator
- `requirements.txt` - Python dependencies
- `meteor_env/` - Python virtual environment

### JavaScript Utilities
- `insert_default_templates.js` - Insert default templates ke database

## Cara Penggunaan

### Setup Database
```bash
node skrip-utilitas/setup-database.js
```

### Migration References
```bash
node skrip-utilitas/migrate_references.js
```

### Python METEOR Evaluator
```bash
cd skrip-utilitas
pip install -r requirements.txt
python enhanced_meteor_evaluator.py
```

## Catatan

- Pastikan database path sudah benar di konfigurasi
- Untuk Python scripts, pastikan Python 3.x sudah terinstall
- Virtual environment direkomendasikan untuk Python dependencies