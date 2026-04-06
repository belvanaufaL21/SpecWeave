# Manual Trigger Railway Deployment

Jika auto-deploy tidak jalan, ikuti langkah ini:

## Via Railway Dashboard:

1. Buka https://railway.app
2. Login dan pilih project SpecWeave
3. Klik service **specweave-frontend**
4. Klik tab **Deployments**
5. Klik tombol **Deploy** di kanan atas
6. Pilih branch **main**
7. Klik **Deploy**

## Via Railway CLI (Optional):

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Trigger deployment
railway up
```

## Cek Status Deployment:

1. Di tab **Deployments**, klik deployment yang sedang berjalan
2. Lihat **Build Logs** untuk memastikan tidak ada error
3. Tunggu sampai status berubah jadi **Active** (hijau)
4. Klik **View Logs** untuk melihat runtime logs

## Verify Fix:

Setelah deployment selesai:

1. Buka URL frontend Railway
2. Tekan **F5** (hard refresh) beberapa kali
3. Pastikan halaman tidak stuck
4. Coba navigate antar chats
5. Cek browser console - seharusnya tidak ada error

## Expected Behavior:

✅ Hard refresh tidak stuck
✅ Auth state load dengan cepat
✅ Chat history muncul setelah data ready
✅ Tidak ada infinite loop di console
✅ Navigation antar chats smooth

## Jika Masih Ada Masalah:

1. Cek Railway logs untuk error
2. Cek browser console untuk error
3. Clear browser cache dan cookies
4. Test di incognito/private window
