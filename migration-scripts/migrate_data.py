#!/usr/bin/env python3
"""
SpecWeave Supabase Data Migration Script
Migrates all data from old project to new project
"""

import os
import json
import time
from datetime import datetime
from supabase import create_client

# Konfigurasi project lama
OLD_SUPABASE_URL = "https://xuttuadlaxgmtusgdxsp.supabase.co"
OLD_SERVICE_KEY = input("Masukkan Service Role Key project LAMA: ").strip()

# Konfigurasi project baru
NEW_SUPABASE_URL = "https://nthylrvtkaqqixznrtaj.supabase.co"
NEW_SERVICE_KEY = input("Masukkan Service Role Key project BARU: ").strip()

def log_message(message, level="INFO"):
    """Log message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def migrate_table(old_client, new_client, table_name, batch_size=100, filters=None):
    """Migrate data from one table to another"""
    try:
        log_message(f"Memulai migrasi tabel: {table_name}")
        
        # Query data dari project lama
        query = old_client.table(table_name).select('*')
        
        # Apply filters if provided
        if filters:
            for filter_config in filters:
                query = query.eq(filter_config['column'], filter_config['value'])
        
        response = query.execute()
        
        if not response.data:
            log_message(f"Tidak ada data di tabel {table_name}")
            return 0
        
        total_records = len(response.data)
        log_message(f"Ditemukan {total_records} records di tabel {table_name}")
        
        # Batch insert untuk data besar
        migrated_count = 0
        for i in range(0, total_records, batch_size):
            batch = response.data[i:i+batch_size]
            
            try:
                new_client.table(table_name).insert(batch).execute()
                migrated_count += len(batch)
                log_message(f"Batch {i//batch_size + 1}: {len(batch)} records berhasil dimigrasikan")
                
                # Small delay to avoid rate limiting
                time.sleep(0.1)
                
            except Exception as e:
                log_message(f"Error pada batch {i//batch_size + 1}: {str(e)}", "ERROR")
                
                # Try individual inserts for failed batch
                for record in batch:
                    try:
                        new_client.table(table_name).insert([record]).execute()
                        migrated_count += 1
                    except Exception as individual_error:
                        log_message(f"Failed to migrate record {record.get('id', 'unknown')}: {str(individual_error)}", "ERROR")
        
        log_message(f"✅ Tabel {table_name}: {migrated_count}/{total_records} records berhasil dimigrasikan")
        return migrated_count
        
    except Exception as e:
        log_message(f"❌ Error migrasi tabel {table_name}: {str(e)}", "ERROR")
        return 0

def verify_migration(old_client, new_client, table_name):
    """Verify migration by comparing record counts"""
    try:
        old_count = len(old_client.table(table_name).select('id').execute().data)
        new_count = len(new_client.table(table_name).select('id').execute().data)
        
        log_message(f"Verifikasi {table_name}: Lama={old_count}, Baru={new_count}")
        
        if old_count == new_count:
            log_message(f"✅ {table_name}: Migrasi lengkap", "SUCCESS")
            return True
        else:
            log_message(f"⚠️ {table_name}: Migrasi tidak lengkap ({new_count}/{old_count})", "WARNING")
            return False
            
    except Exception as e:
        log_message(f"❌ Error verifikasi {table_name}: {str(e)}", "ERROR")
        return False

def main():
    """Main migration function"""
    log_message("🚀 Memulai migrasi data SpecWeave")
    
    # Validasi input
    if not OLD_SERVICE_KEY or not NEW_SERVICE_KEY:
        log_message("❌ Service Role Key tidak boleh kosong!", "ERROR")
        return
    
    try:
        # Buat client untuk kedua project
        log_message("🔗 Menghubungkan ke project lama...")
        old_client = create_client(OLD_SUPABASE_URL, OLD_SERVICE_KEY)
        
        log_message("🔗 Menghubungkan ke project baru...")
        new_client = create_client(NEW_SUPABASE_URL, NEW_SERVICE_KEY)
        
        # Test koneksi
        log_message("🧪 Testing koneksi...")
        old_client.table('profiles').select('count').execute()
        new_client.table('profiles').select('count').execute()
        log_message("✅ Koneksi berhasil!")
        
        # Migration plan
        migration_plan = [
            {
                'table': 'profiles',
                'description': 'User profiles',
                'batch_size': 50
            },
            {
                'table': 'templates',
                'description': 'Custom templates only',
                'batch_size': 100,
                'filters': [{'column': 'is_system', 'value': False}]
            },
            {
                'table': 'scenarios',
                'description': 'User scenarios',
                'batch_size': 50
            },
            {
                'table': 'jira_connections',
                'description': 'JIRA connections',
                'batch_size': 100
            },
            {
                'table': 'evaluation_metrics',
                'description': 'Evaluation metrics',
                'batch_size': 200
            },
            {
                'table': 'performance_logs',
                'description': 'Performance logs',
                'batch_size': 500
            }
        ]
        
        # Execute migration
        total_migrated = 0
        successful_tables = []
        
        for plan in migration_plan:
            log_message(f"\n📊 Migrasi {plan['description']}...")
            
            migrated_count = migrate_table(
                old_client, 
                new_client, 
                plan['table'],
                plan.get('batch_size', 100),
                plan.get('filters')
            )
            
            if migrated_count > 0:
                successful_tables.append(plan['table'])
                total_migrated += migrated_count
            
            # Delay between tables
            time.sleep(1)
        
        # Verification
        log_message("\n🔍 Verifikasi migrasi...")
        verification_results = {}
        
        for table in successful_tables:
            verification_results[table] = verify_migration(old_client, new_client, table)
        
        # Summary
        log_message("\n📋 RINGKASAN MIGRASI")
        log_message("=" * 50)
        log_message(f"Total records dimigrasikan: {total_migrated}")
        log_message(f"Tabel berhasil: {len(successful_tables)}")
        
        for table, success in verification_results.items():
            status = "✅ BERHASIL" if success else "⚠️ PERLU DICEK"
            log_message(f"{table}: {status}")
        
        if all(verification_results.values()):
            log_message("\n🎉 MIGRASI SELESAI! Semua data berhasil dimigrasikan.")
        else:
            log_message("\n⚠️ MIGRASI SELESAI dengan beberapa masalah. Silakan cek log di atas.")
        
        log_message("\n📝 Langkah selanjutnya:")
        log_message("1. Update environment variables aplikasi")
        log_message("2. Test aplikasi dengan project baru")
        log_message("3. Konfigurasi Google OAuth di project baru")
        log_message("4. Backup project lama sebelum menghapus")
        
    except Exception as e:
        log_message(f"❌ Error fatal: {str(e)}", "ERROR")
        log_message("Pastikan Service Role Key benar dan project dapat diakses")

if __name__ == "__main__":
    main()