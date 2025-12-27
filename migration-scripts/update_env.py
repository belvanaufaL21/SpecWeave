#!/usr/bin/env python3
"""
Update environment variables for new Supabase project
"""

import os
import re
from datetime import datetime

def log_message(message, level="INFO"):
    """Log message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def backup_env_file(file_path):
    """Create backup of existing .env file"""
    if os.path.exists(file_path):
        backup_path = f"{file_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        with open(file_path, 'r') as original:
            with open(backup_path, 'w') as backup:
                backup.write(original.read())
        log_message(f"✅ Backup dibuat: {backup_path}")
        return backup_path
    return None

def update_env_file(file_path, new_url, new_anon_key):
    """Update .env file with new Supabase configuration"""
    
    if not os.path.exists(file_path):
        log_message(f"❌ File tidak ditemukan: {file_path}", "ERROR")
        return False
    
    # Backup existing file
    backup_path = backup_env_file(file_path)
    
    try:
        # Read existing content
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Update Supabase URL
        content = re.sub(
            r'VITE_SUPABASE_URL=.*',
            f'VITE_SUPABASE_URL={new_url}',
            content
        )
        
        # Update Supabase Anon Key
        content = re.sub(
            r'VITE_SUPABASE_ANON_KEY=.*',
            f'VITE_SUPABASE_ANON_KEY={new_anon_key}',
            content
        )
        
        # Write updated content
        with open(file_path, 'w') as file:
            file.write(content)
        
        log_message(f"✅ File {file_path} berhasil diupdate")
        return True
        
    except Exception as e:
        log_message(f"❌ Error update file {file_path}: {str(e)}", "ERROR")
        
        # Restore backup if update failed
        if backup_path and os.path.exists(backup_path):
            with open(backup_path, 'r') as backup:
                with open(file_path, 'w') as original:
                    original.write(backup.read())
            log_message(f"🔄 File dipulihkan dari backup", "INFO")
        
        return False

def update_config_files():
    """Update all configuration files"""
    
    log_message("🔧 Memulai update konfigurasi untuk project baru...")
    
    # New project configuration
    NEW_SUPABASE_URL = "https://nthylrvtkaqqixznrtaj.supabase.co"
    NEW_ANON_KEY = input("Masukkan Anon Key project BARU: ").strip()
    
    if not NEW_ANON_KEY:
        log_message("❌ Anon Key tidak boleh kosong!", "ERROR")
        return
    
    # Files to update
    files_to_update = [
        "aplikasi-klien/.env",
        "aplikasi-klien/.env.example",
        "konfigurasi/pengembangan.env"
    ]
    
    updated_files = []
    failed_files = []
    
    for file_path in files_to_update:
        log_message(f"📝 Memproses file: {file_path}")
        
        if update_env_file(file_path, NEW_SUPABASE_URL, NEW_ANON_KEY):
            updated_files.append(file_path)
        else:
            failed_files.append(file_path)
    
    # Update diagnosis tool
    diagnosis_file = "aplikasi-klien/diagnose-google-oauth.html"
    if os.path.exists(diagnosis_file):
        log_message(f"📝 Memproses file: {diagnosis_file}")
        
        try:
            with open(diagnosis_file, 'r') as file:
                content = file.read()
            
            # Update Supabase URL in diagnosis tool
            content = content.replace(
                'https://xuttuadlaxgmtusgdxsp.supabase.co',
                NEW_SUPABASE_URL
            )
            
            # Update Anon Key in diagnosis tool
            content = re.sub(
                r"const supabaseAnonKey = '[^']*';",
                f"const supabaseAnonKey = '{NEW_ANON_KEY}';",
                content
            )
            
            with open(diagnosis_file, 'w') as file:
                file.write(content)
            
            updated_files.append(diagnosis_file)
            log_message(f"✅ File {diagnosis_file} berhasil diupdate")
            
        except Exception as e:
            log_message(f"❌ Error update {diagnosis_file}: {str(e)}", "ERROR")
            failed_files.append(diagnosis_file)
    
    # Update test files
    test_files = [
        "aplikasi-klien/test-google-oauth.js"
    ]
    
    for test_file in test_files:
        if os.path.exists(test_file):
            log_message(f"📝 Memproses file: {test_file}")
            
            try:
                with open(test_file, 'r') as file:
                    content = file.read()
                
                # Update Supabase URL
                content = content.replace(
                    'https://xuttuadlaxgmtusgdxsp.supabase.co',
                    NEW_SUPABASE_URL
                )
                
                # Update Anon Key
                content = re.sub(
                    r"const supabaseAnonKey = '[^']*';",
                    f"const supabaseAnonKey = '{NEW_ANON_KEY}';",
                    content
                )
                
                with open(test_file, 'w') as file:
                    file.write(content)
                
                updated_files.append(test_file)
                log_message(f"✅ File {test_file} berhasil diupdate")
                
            except Exception as e:
                log_message(f"❌ Error update {test_file}: {str(e)}", "ERROR")
                failed_files.append(test_file)
    
    # Summary
    log_message("\n📋 RINGKASAN UPDATE KONFIGURASI")
    log_message("=" * 50)
    log_message(f"Files berhasil diupdate: {len(updated_files)}")
    log_message(f"Files gagal diupdate: {len(failed_files)}")
    
    if updated_files:
        log_message("\n✅ Files berhasil diupdate:")
        for file_path in updated_files:
            log_message(f"  - {file_path}")
    
    if failed_files:
        log_message("\n❌ Files gagal diupdate:")
        for file_path in failed_files:
            log_message(f"  - {file_path}")
    
    if len(updated_files) > 0:
        log_message("\n🎉 UPDATE KONFIGURASI SELESAI!")
        log_message("\n📝 Langkah selanjutnya:")
        log_message("1. Restart development server")
        log_message("2. Test aplikasi dengan konfigurasi baru")
        log_message("3. Setup Google OAuth di project baru")
        log_message("4. Verifikasi semua fitur berfungsi")
    else:
        log_message("\n❌ Tidak ada file yang berhasil diupdate")

if __name__ == "__main__":
    update_config_files()