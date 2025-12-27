#!/usr/bin/env python3
"""
SpecWeave Supabase Storage Migration Script
Migrates all storage buckets and files from old project to new project
"""

import os
import tempfile
import magic
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

def migrate_bucket_files(old_client, new_client, bucket_name, path="", temp_dir=None):
    """Recursively migrate files in a bucket"""
    try:
        objects = old_client.storage.from_(bucket_name).list(path=path)
        
        if not objects:
            log_message(f"Tidak ada objek di path: {path}")
            return 0
        
        migrated_count = 0
        
        for obj in objects:
            obj_name = obj.get('name', '')
            
            if obj.get('metadata') is None:  # Directory
                subdirectory = os.path.join(path, obj_name).replace('\\', '/')
                log_message(f"📁 Memproses direktori: {subdirectory}")
                migrated_count += migrate_bucket_files(old_client, new_client, bucket_name, subdirectory, temp_dir)
            else:  # File
                file_path = f"{path}/{obj_name}" if path else obj_name
                file_path = file_path.replace('\\', '/')
                
                try:
                    log_message(f"📄 Migrasi file: {file_path}")
                    
                    # Download file dari project lama
                    file_data = old_client.storage.from_(bucket_name).download(file_path)
                    
                    if not file_data:
                        log_message(f"⚠️ File kosong atau tidak dapat didownload: {file_path}", "WARNING")
                        continue
                    
                    # Simpan sementara untuk deteksi MIME type
                    temp_file_path = None
                    mime_type = 'application/octet-stream'  # default
                    
                    try:
                        with tempfile.NamedTemporaryFile(delete=False, dir=temp_dir) as temp_file:
                            temp_file.write(file_data)
                            temp_file_path = temp_file.name
                        
                        # Deteksi MIME type
                        mime_type = magic.from_file(temp_file_path, mime=True)
                        
                    except Exception as mime_error:
                        log_message(f"⚠️ Tidak dapat mendeteksi MIME type untuk {file_path}: {mime_error}", "WARNING")
                    
                    # Upload ke project baru
                    upload_options = {
                        "content-type": mime_type,
                        "x-upsert": "true"
                    }
                    
                    new_client.storage.from_(bucket_name).upload(
                        file_path, 
                        file_data,
                        file_options=upload_options
                    )
                    
                    migrated_count += 1
                    log_message(f"✅ File berhasil dimigrasikan: {file_path}")
                    
                    # Cleanup temp file
                    if temp_file_path and os.path.exists(temp_file_path):
                        os.unlink(temp_file_path)
                        
                except Exception as file_error:
                    log_message(f"❌ Error migrasi file {file_path}: {str(file_error)}", "ERROR")
        
        return migrated_count
        
    except Exception as e:
        log_message(f"❌ Error memproses path {path}: {str(e)}", "ERROR")
        return 0

def migrate_storage():
    """Main storage migration function"""
    log_message("📁 Memulai migrasi storage...")
    
    # Validasi input
    if not OLD_SERVICE_KEY or not NEW_SERVICE_KEY:
        log_message("❌ Service Role Key tidak boleh kosong!", "ERROR")
        return
    
    try:
        # Buat client untuk kedua project
        old_client = create_client(OLD_SUPABASE_URL, OLD_SERVICE_KEY)
        new_client = create_client(NEW_SUPABASE_URL, NEW_SERVICE_KEY)
        
        # Buat temporary directory untuk file processing
        with tempfile.TemporaryDirectory() as temp_dir:
            log_message(f"📂 Menggunakan temp directory: {temp_dir}")
            
            # List semua buckets dari project lama
            log_message("🔍 Mengambil daftar buckets...")
            buckets = old_client.storage.list_buckets()
            
            if not buckets:
                log_message("ℹ️ Tidak ada storage buckets ditemukan")
                return
            
            log_message(f"📦 Ditemukan {len(buckets)} buckets")
            
            total_files_migrated = 0
            successful_buckets = []
            
            for bucket in buckets:
                bucket_name = bucket.name
                log_message(f"\n📦 Memproses bucket: {bucket_name}")
                log_message(f"   Public: {bucket.public}")
                
                try:
                    # Buat bucket di project baru
                    log_message(f"🔨 Membuat bucket {bucket_name} di project baru...")
                    
                    new_client.storage.create_bucket(
                        bucket_name, 
                        options={"public": bucket.public}
                    )
                    log_message(f"✅ Bucket {bucket_name} berhasil dibuat")
                    
                except Exception as bucket_error:
                    if "already exists" in str(bucket_error).lower():
                        log_message(f"ℹ️ Bucket {bucket_name} sudah ada, melanjutkan migrasi files...")
                    else:
                        log_message(f"❌ Error membuat bucket {bucket_name}: {str(bucket_error)}", "ERROR")
                        continue
                
                # Migrasi files dalam bucket
                try:
                    files_migrated = migrate_bucket_files(old_client, new_client, bucket_name, "", temp_dir)
                    total_files_migrated += files_migrated
                    successful_buckets.append(bucket_name)
                    
                    log_message(f"✅ Bucket {bucket_name}: {files_migrated} files berhasil dimigrasikan")
                    
                except Exception as migration_error:
                    log_message(f"❌ Error migrasi bucket {bucket_name}: {str(migration_error)}", "ERROR")
        
        # Summary
        log_message("\n📋 RINGKASAN MIGRASI STORAGE")
        log_message("=" * 50)
        log_message(f"Total buckets diproses: {len(buckets)}")
        log_message(f"Buckets berhasil: {len(successful_buckets)}")
        log_message(f"Total files dimigrasikan: {total_files_migrated}")
        
        if successful_buckets:
            log_message("\n✅ Buckets berhasil dimigrasikan:")
            for bucket in successful_buckets:
                log_message(f"  - {bucket}")
        
        if total_files_migrated > 0:
            log_message("\n🎉 MIGRASI STORAGE SELESAI!")
            log_message("\n⚠️ PENTING: Jangan lupa setup RLS policies untuk storage buckets di project baru")
        else:
            log_message("\nℹ️ Tidak ada files yang dimigrasikan (mungkin storage kosong)")
        
    except Exception as e:
        log_message(f"❌ Error fatal migrasi storage: {str(e)}", "ERROR")

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import magic
        log_message("✅ python-magic tersedia")
        return True
    except ImportError:
        log_message("❌ python-magic tidak tersedia", "ERROR")
        log_message("Install dengan: pip install python-magic", "INFO")
        log_message("Untuk Windows, install juga: pip install python-magic-bin", "INFO")
        return False

if __name__ == "__main__":
    log_message("🔍 Memeriksa dependencies...")
    
    if check_dependencies():
        migrate_storage()
    else:
        log_message("❌ Dependencies tidak lengkap. Install terlebih dahulu.", "ERROR")