# Basis Data

Folder ini berisi semua file yang berkaitan dengan database.

## Struktur File

### Database Files
- `specweave.db` - File database SQLite utama

### Schema Files
- `schema.sql` - Schema database utama
- `schema_fixed.sql` - Schema database yang sudah diperbaiki
- `add_references_table.sql` - Script untuk menambah tabel references

### Data Files
- `insert_templates.sql` - Script untuk insert template data

### Migrations
- `migrations/` - Folder untuk migration files

## Database Schema

Database menggunakan SQLite dengan tabel-tabel utama:
- Users
- Chats
- Messages
- Templates
- References
- JIRA integrations
- METEOR test results

## Backup dan Restore

### Backup
```bash
cp basis-data/specweave.db basis-data/backup/specweave_backup_$(date +%Y%m%d).db
```

### Restore
```bash
cp basis-data/backup/specweave_backup_YYYYMMDD.db basis-data/specweave.db
```

## Migration

Untuk menjalankan migration:
```bash
node skrip-utilitas/migrate_references.js
```