@echo off
echo ========================================
echo Setup Lengkap SpecWeave
echo ========================================

echo 1. Setup Database...
node setup-database.js

echo 2. Install Dependencies Server...
cd ../aplikasi-server
npm install

echo 3. Install Dependencies Client...
cd ../aplikasi-klien
npm install

echo 4. Copy Environment Configuration...
cd ..
copy konfigurasi\pengembangan.env aplikasi-server\.env

echo ========================================
echo Setup Selesai!
echo ========================================
echo Untuk menjalankan aplikasi:
echo - Server: skrip-utilitas\jalankan-server.bat
echo - Client: skrip-utilitas\jalankan-klien.bat
echo ========================================