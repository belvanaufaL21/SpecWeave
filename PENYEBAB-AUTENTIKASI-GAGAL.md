# Penyebab Autentikasi Tidak Berhasil

## Diagram Penyebab Kegagalan Autentikasi

```
                    ┌─────────────────────────────────────┐
                    │   Autentikasi Tidak Berhasil        │
                    └────────────┬────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
        ┌───────▼────────┐              ┌────────▼────────┐
        │  Masalah dari  │              │  Masalah dari   │
        │  Sisi Google   │              │  Sisi Aplikasi  │
        └───────┬────────┘              └────────┬────────┘
                │                                 │
    ┌───────────┼───────────┐         ┌──────────┼──────────┐
    │           │           │         │          │          │
    ▼           ▼           ▼         ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ User   │ │ Google │ │Network │ │Session │ │Database│ │Config  │
│Cancelled│ │Denied  │ │Error   │ │Expired │ │Error   │ │Error   │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

---

## Kategori Penyebab Kegagalan

### 1️⃣ **Masalah dari Sisi Google OAuth**

#### A. **User Membatalkan Proses (OAUTH_CANCELLED)**
**Penyebab:**
- User menutup popup/tab Google OAuth sebelum selesai
- User menekan tombol "Cancel" atau "Back" di halaman Google
- User tidak menyelesaikan proses login di Google

**Error Message:**
```
"Proses Google dibatalkan. Silakan coba lagi jika Anda ingin melanjutkan."
```

**Solusi:**
- User harus menyelesaikan proses login sampai selesai
- Jangan tutup popup/tab sebelum redirect kembali ke aplikasi

---

#### B. **Akses Ditolak oleh Google (OAUTH_ACCESS_DENIED)**
**Penyebab:**
- User menolak memberikan izin akses ke aplikasi
- User tidak meng-klik "Allow" di halaman permission Google
- User memilih "Deny" atau "Cancel" saat diminta izin

**Error Message:**
```
"Akses ditolak oleh Google. Berikan izin untuk melanjutkan dengan akun Google Anda."
```

**Solusi:**
- User harus memberikan izin akses yang diminta
- Klik "Allow" atau "Izinkan" di halaman Google
- Aplikasi memerlukan izin untuk: email, profile, openid

---

#### C. **Popup Diblokir Browser (OAUTH_POPUP_BLOCKED)**
**Penyebab:**
- Browser memblokir popup OAuth
- Ad blocker atau extension browser memblokir popup
- Setting browser tidak mengizinkan popup

**Error Message:**
```
"Pop-up diblokir browser. Izinkan pop-up untuk situs ini dan coba lagi."
```

**Solusi:**
- Izinkan popup untuk domain aplikasi
- Disable ad blocker sementara
- Cek setting browser: Allow popups for this site

---

#### D. **Timeout OAuth (OAUTH_TIMEOUT)**
**Penyebab:**
- Proses OAuth memakan waktu terlalu lama (> 60 detik)
- Koneksi internet lambat
- Server Google lambat merespons
- User terlalu lama di halaman Google tanpa action

**Error Message:**
```
"Proses Google memakan waktu terlalu lama. Periksa koneksi internet dan coba lagi."
```

**Solusi:**
- Periksa koneksi internet
- Coba lagi dengan koneksi yang lebih stabil
- Selesaikan proses login lebih cepat

---

#### E. **Request Tidak Valid (OAUTH_INVALID_REQUEST)**
**Penyebab:**
- Parameter OAuth tidak lengkap atau salah
- Redirect URL tidak sesuai dengan konfigurasi Google Console
- Client ID tidak valid atau salah
- State parameter tidak cocok

**Error Message:**
```
"Permintaan tidak valid. Silakan refresh halaman dan coba lagi."
```

**Solusi:**
- Refresh halaman dan coba lagi
- Clear browser cache dan cookies
- Pastikan konfigurasi OAuth di Google Console benar

---

### 2️⃣ **Masalah Network/Koneksi**

#### A. **Koneksi Internet Bermasalah (OAUTH_NETWORK_ERROR)**
**Penyebab:**
- Tidak ada koneksi internet
- Koneksi internet tidak stabil
- Firewall memblokir akses ke Google
- DNS error

**Error Message:**
```
"Masalah koneksi internet. Periksa koneksi Anda dan coba lagi."
```

**Solusi:**
- Periksa koneksi internet
- Coba reconnect WiFi/data
- Cek apakah bisa akses website lain
- Disable VPN jika ada

---

#### B. **Timeout Network (TIMEOUT)**
**Penyebab:**
- Request ke server memakan waktu terlalu lama
- Server tidak merespons dalam waktu yang ditentukan
- Koneksi sangat lambat

**Error Message:**
```
"Permintaan memakan waktu terlalu lama. Periksa koneksi internet Anda."
```

**Solusi:**
- Periksa kecepatan internet
- Coba lagi dengan koneksi yang lebih baik
- Tunggu beberapa saat dan retry

---

### 3️⃣ **Masalah Session & Token**

#### A. **Session Expired (SESSION_EXPIRED)**
**Penyebab:**
- Session Supabase sudah kedaluwarsa
- Token sudah tidak valid
- User sudah logout di tab lain
- Session timeout (biasanya 1 jam)

**Error Message:**
```
"Sesi Anda telah berakhir. Silakan masuk kembali."
```

**Solusi:**
- Login ulang
- Session akan di-refresh otomatis jika masih valid

---

#### B. **Token Tidak Valid (TOKEN_INVALID)**
**Penyebab:**
- Access token rusak atau corrupt
- Token di-manipulasi
- Token format tidak sesuai
- Token dari session lama

**Error Message:**
```
"Token tidak valid. Silakan masuk kembali."
```

**Solusi:**
- Clear localStorage dan cookies
- Login ulang
- Jangan manipulasi token secara manual

---

### 4️⃣ **Masalah Database & Profile**

#### A. **Gagal Membuat Profile (Profile Creation Failed)**
**Penyebab:**
- Database error saat INSERT profile
- Constraint violation (duplicate ID, email)
- Database connection timeout
- Permission database tidak cukup

**Error Message:**
```
"Gagal membuat profil pengguna. Silakan coba lagi."
```

**Solusi:**
- Retry login
- Jika tetap gagal, hubungi admin
- Cek apakah email sudah terdaftar

---

#### B. **Gagal Load Profile (Profile Load Failed)**
**Penyebab:**
- Database error saat SELECT profile
- Profile tidak ditemukan (data corrupt)
- Database connection timeout
- Query error

**Error Message:**
```
"Gagal memuat profil. Refresh halaman dan coba lagi."
```

**Solusi:**
- Refresh halaman
- Clear cache browser
- Logout dan login ulang

---

#### C. **User Deleted (USER_DELETED)**
**Penyebab:**
- User sudah dihapus dari database
- Profile di-delete oleh admin
- Data corruption
- Conflict error (409)

**Error Message:**
```
"Akun tidak ditemukan. Silakan daftar ulang."
```

**Solusi:**
- Daftar ulang dengan email yang sama
- Hubungi admin jika akun seharusnya masih ada

---

### 5️⃣ **Masalah Konfigurasi Aplikasi**

#### A. **OAuth Config Error**
**Penyebab:**
- `VITE_SUPABASE_URL` tidak di-set
- `VITE_SUPABASE_ANON_KEY` tidak di-set
- Google Client ID tidak valid
- Redirect URL tidak sesuai

**Error Message:**
```
"Konfigurasi autentikasi tidak valid. Hubungi administrator."
```

**Solusi (untuk Developer):**
- Cek file `.env`:
  ```
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJxxx...
  ```
- Cek Google Console:
  - Client ID benar
  - Redirect URI: `http://localhost:3000/auth/callback`
  - Authorized domains

---

#### B. **Supabase Config Error**
**Penyebab:**
- Supabase project tidak aktif
- Supabase Auth tidak di-enable
- Google provider tidak di-configure di Supabase
- Callback URL tidak di-whitelist

**Error Message:**
```
"Layanan autentikasi tidak tersedia. Coba lagi nanti."
```

**Solusi (untuk Developer):**
- Cek Supabase Dashboard:
  - Authentication > Providers > Google (enabled)
  - Authentication > URL Configuration > Redirect URLs
  - Project status (active)

---

### 6️⃣ **Masalah Rate Limiting**

#### A. **Too Many Requests (TOO_MANY_REQUESTS)**
**Penyebab:**
- Terlalu banyak percobaan login dalam waktu singkat
- Rate limit Google OAuth terlampaui
- Rate limit Supabase terlampaui
- Spam detection triggered

**Error Message:**
```
"Terlalu banyak percobaan masuk. Tunggu beberapa menit."
```

**Solusi:**
- Tunggu 5-15 menit
- Jangan spam tombol login
- Coba lagi setelah cooldown period

---

### 7️⃣ **Masalah Browser & Cache**

#### A. **Cache Corrupt**
**Penyebab:**
- localStorage corrupt
- sessionStorage corrupt
- Cookies corrupt
- Cache browser bermasalah

**Error Message:**
```
"Terjadi kesalahan. Refresh halaman dan coba lagi."
```

**Solusi:**
- Clear browser cache dan cookies
- Hard refresh (Ctrl+Shift+R)
- Coba di incognito/private mode
- Coba browser lain

---

#### B. **Third-Party Cookies Disabled**
**Penyebab:**
- Browser setting memblokir third-party cookies
- Privacy mode terlalu strict
- Extension browser memblokir cookies

**Error Message:**
```
"OAuth gagal. Pastikan cookies diizinkan."
```

**Solusi:**
- Enable third-party cookies untuk Google
- Disable strict privacy mode sementara
- Whitelist domain aplikasi dan Google

---

## Flowchart Troubleshooting

```
┌─────────────────────────┐
│ Autentikasi Gagal       │
└────────────┬────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Cek Error Message  │
    └────────┬───────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐      ┌─────────┐
│ OAuth   │      │ Network │
│ Error?  │      │ Error?  │
└────┬────┘      └────┬────┘
     │                │
    YA               YA
     │                │
     ▼                ▼
┌──────────────┐  ┌──────────────┐
│ - Cancelled? │  │ - No Internet│
│ - Denied?    │  │ - Timeout?   │
│ - Popup?     │  │ - Firewall?  │
└──────────────┘  └──────────────┘
     │                │
     ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Solusi:      │  │ Solusi:      │
│ - Retry      │  │ - Cek koneksi│
│ - Allow      │  │ - Disable VPN│
│ - Enable     │  │ - Retry      │
└──────────────┘  └──────────────┘
```

---

## Tabel Ringkasan Error

| Error Code | Kategori | Penyebab Utama | Solusi Cepat |
|------------|----------|----------------|--------------|
| `OAUTH_CANCELLED` | OAuth | User cancel | Retry, selesaikan proses |
| `OAUTH_ACCESS_DENIED` | OAuth | User deny permission | Klik "Allow" |
| `OAUTH_POPUP_BLOCKED` | Browser | Popup blocked | Enable popup |
| `OAUTH_TIMEOUT` | Network | Koneksi lambat | Cek internet, retry |
| `OAUTH_INVALID_REQUEST` | Config | Parameter salah | Refresh, clear cache |
| `OAUTH_NETWORK_ERROR` | Network | No internet | Cek koneksi |
| `SESSION_EXPIRED` | Session | Token expired | Login ulang |
| `TOKEN_INVALID` | Session | Token corrupt | Clear storage, login ulang |
| `TOO_MANY_REQUESTS` | Rate Limit | Spam login | Tunggu 5-15 menit |
| `USER_DELETED` | Database | Account deleted | Daftar ulang |
| `PROFILE_CREATION_FAILED` | Database | DB error | Retry, hubungi admin |

---

## Kode Implementasi Error Handling

### Client-Side (AuthService.js)

```javascript
static async signInWithGoogle(mode = 'signup') {
  try {
    // Simpan mode
    sessionStorage.setItem('auth_mode', mode);
    
    // Redirect URL
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    // Panggil OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      // Clear mode jika error
      sessionStorage.removeItem('auth_mode');
      
      // Handle specific errors
      if (error.message.includes('popup')) {
        throw new Error('OAUTH_POPUP_BLOCKED');
      }
      if (error.message.includes('cancelled')) {
        throw new Error('OAUTH_CANCELLED');
      }
      if (error.message.includes('access_denied')) {
        throw new Error('OAUTH_ACCESS_DENIED');
      }
      
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    // Clear mode jika error
    sessionStorage.removeItem('auth_mode');
    
    // Return user-friendly error
    return { 
      data: null, 
      error: {
        code: error.message,
        message: getUserFriendlyError(error)
      }
    };
  }
}
```

### Error Display (Landing Page)

```javascript
// Cek error dari URL params
const urlParams = new URLSearchParams(window.location.search);
const errorType = urlParams.get('error');
const errorMessage = urlParams.get('message');

if (errorType) {
  // Tampilkan error message
  toast.error(decodeURIComponent(errorMessage), {
    duration: 5000,
    position: 'top-center'
  });
  
  // Clear URL params
  window.history.replaceState({}, '', window.location.pathname);
}
```

---

## Checklist Troubleshooting untuk User

### ✅ Langkah 1: Cek Koneksi
- [ ] Internet connected?
- [ ] Bisa akses Google.com?
- [ ] VPN disabled?
- [ ] Firewall tidak memblokir?

### ✅ Langkah 2: Cek Browser
- [ ] Popup allowed?
- [ ] Cookies enabled?
- [ ] Cache cleared?
- [ ] Extension disabled?

### ✅ Langkah 3: Cek Proses OAuth
- [ ] Selesaikan proses sampai akhir?
- [ ] Klik "Allow" di Google?
- [ ] Tidak cancel di tengah jalan?
- [ ] Tunggu sampai redirect?

### ✅ Langkah 4: Retry
- [ ] Refresh halaman
- [ ] Clear cache
- [ ] Coba incognito mode
- [ ] Coba browser lain

### ✅ Langkah 5: Hubungi Admin
- [ ] Jika semua gagal
- [ ] Jika error "Config Error"
- [ ] Jika error "User Deleted"
- [ ] Jika error persisten

---

## Monitoring & Logging

### Log yang Dicatat:

```javascript
// Success
console.log('[AUTH] OAuth success:', {
  userId: user.id,
  email: user.email,
  provider: 'google',
  timestamp: new Date().toISOString()
});

// Error
console.error('[AUTH] OAuth failed:', {
  error: error.message,
  code: error.code,
  provider: 'google',
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent
});
```

### Metrics yang Dipantau:

- **Success Rate**: % autentikasi berhasil
- **Error Rate**: % autentikasi gagal
- **Error Types**: Distribusi jenis error
- **Retry Rate**: % user yang retry setelah error
- **Time to Success**: Waktu rata-rata sampai berhasil

---

## Kesimpulan

Autentikasi bisa gagal karena berbagai alasan:

1. **User Action** (40%): Cancel, deny, tidak selesai
2. **Network** (30%): No internet, timeout, firewall
3. **Browser** (15%): Popup blocked, cookies disabled
4. **Config** (10%): OAuth setup salah, Supabase config
5. **Database** (5%): Profile creation failed, user deleted

**Solusi Umum:**
- Retry dengan koneksi stabil
- Enable popup dan cookies
- Selesaikan proses OAuth sampai akhir
- Clear cache jika perlu
- Hubungi admin jika persisten
