# Penjelasan Flowchart Autentikasi - SpecWeave

## Penjelasan yang Diperbarui

Flowchart ini menggambarkan alur autentikasi pengguna sebagaimana disajikan pada Gambar 3.2. Alur dimulai ketika pengguna membuka halaman login dan menekan tombol "Login dengan Google" untuk memulai proses OAuth. Sistem memvalidasi kredensial melalui Google Authentication. Apabila autentikasi gagal, sistem menampilkan pesan kesalahan dan mengarahkan pengguna kembali ke halaman login. Apabila berhasil, sistem **otomatis mendeteksi** apakah pengguna baru atau sudah terdaftar. **Untuk pengguna baru**, sistem membuat profil baru di tabel profiles dengan data dasar (email, nama, avatar). **Untuk pengguna yang sudah terdaftar**, sistem memuat profil existing beserta seluruh data pengguna (riwayat chat, template, koneksi JIRA, preferensi) dari database, kemudian melakukan migrasi data lama dari localStorage ke database jika diperlukan. Setelah proses autentikasi dan pemuatan profil selesai, sistem mengarahkan pengguna ke halaman chat utama dengan semua data tersedia.

---

## Penjelasan Detail

### Alur Lengkap:

1. **Mulai** - Pengguna membuka halaman login

2. **Halaman Login** - Pengguna melihat tombol "Login dengan Google"

3. **Klik Login dengan Google** - Pengguna memulai proses OAuth
   - Sistem menyimpan mode autentikasi ke sessionStorage
   - Redirect ke Google OAuth

4. **Proses OAuth Google** - Google memvalidasi kredensial
   - Pengguna login dengan akun Google
   - Pengguna memberikan izin akses

5. **Autentikasi Berhasil?** - Keputusan berdasarkan hasil OAuth
   
   **JIKA TIDAK (Gagal):**
   - Tampilkan pesan kesalahan login
   - Redirect kembali ke halaman login
   - Proses selesai (kembali ke awal)
   
   **JIKA YA (Berhasil):**
   - Google mengirim access_token dan refresh_token
   - Supabase Auth membuat session
   - Lanjut ke tahap berikutnya

6. **Profil Tersimpan (tabel profiles)** - Sistem mengecek database
   
   **Proses yang Terjadi:**
   - Query ke tabel `profiles` dengan user ID
   - Cek apakah profil sudah ada
   
   **Dua Kemungkinan:**
   
   ### A. **Pengguna Baru** (Profil tidak ditemukan):
   ```
   - Sistem membuat profil baru
   - INSERT INTO profiles:
     * id (dari Google)
     * email
     * name
     * avatar_url
     * role (default: 'user')
     * created_at
   - Data awal kosong:
     * Tidak ada chat history
     * Tidak ada template custom
     * Tidak ada koneksi JIRA
     * Preferensi default
   ```
   
   ### B. **Pengguna Existing** (Profil ditemukan):
   ```
   - Sistem memuat profil existing
   - SELECT * FROM profiles WHERE id = user_id
   - Data yang dimuat:
     * Personal info (name, email, avatar, role)
     * Chat history (dari tabel chat_sessions)
     * Templates (dari tabel user_templates)
     * JIRA connections (dari tabel jira_connections)
     * Preferences & settings
     * Usage limits & counters
   
   - Cek migrasi data:
     * Jika ada data lama di localStorage
     * Migrate ke database:
       - Chat history → chat_sessions
       - Templates → user_templates
       - Preferences → profiles.preferences
     * Tampilkan notifikasi: "X items migrated"
     * Hapus data dari localStorage
   ```

7. **Halaman Chat** - Pengguna diarahkan ke halaman chat utama
   - URL: `/chat`
   - Semua data tersedia (untuk user existing)
   - Siap digunakan

8. **Mulai** - Pengguna dapat mulai menggunakan aplikasi

---

## Perbedaan Penanganan User

| Aspek | Pengguna Baru | Pengguna Existing |
|-------|---------------|-------------------|
| **Deteksi** | Profil tidak ada di database | Profil ditemukan di database |
| **Action** | Buat profil baru (INSERT) | Load profil existing (SELECT) |
| **Data Personal** | Dari Google (email, name, avatar) | Dari database (lengkap) |
| **Chat History** | Kosong | Dimuat dari database |
| **Templates** | Default saja | Custom + default |
| **JIRA Connections** | Tidak ada | Dimuat dari database |
| **Preferences** | Default | Dimuat dari database |
| **Migrasi Data** | Tidak perlu | Jika ada data lama di localStorage |
| **Notifikasi** | Tidak ada | "X items migrated" (jika ada migrasi) |
| **Waktu Load** | Cepat (data minimal) | Sedikit lebih lama (load semua data) |

---

## Flowchart yang Diperbarui

```
┌─────────┐
│  Mulai  │
└────┬────┘
     │
     ▼
┌──────────────────┐
│ Halaman Login    │
└────┬─────────────┘
     │
     ▼
┌──────────────────────┐
│ Klik Login dengan    │
│ Google               │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ Proses OAuth Google  │
└────┬─────────────────┘
     │
     ▼
     ◇ Autentikasi
     │ Berhasil?
     │
     ├─── TIDAK ──────────────────┐
     │                            │
     │                            ▼
     │                  ┌──────────────────────┐
     │                  │ Tampilkan Pesan      │
     │                  │ Kesalahan Login      │
     │                  └──────────┬───────────┘
     │                             │
     │                             │ (kembali ke login)
     │                             │
     YA                            │
     │                             │
     ▼                             │
┌──────────────────────┐          │
│ Cek Profil di        │          │
│ Database             │          │
└────┬─────────────────┘          │
     │                             │
     ├─── Profil Tidak Ada ───────┤
     │    (Pengguna Baru)          │
     │                             │
     ▼                             │
┌──────────────────────┐          │
│ Buat Profil Baru     │          │
│ di tabel profiles    │          │
│                      │          │
│ Data:                │          │
│ - id, email, name    │          │
│ - avatar_url, role   │          │
│ - created_at         │          │
│                      │          │
│ Status:              │          │
│ - Chat: kosong       │          │
│ - Templates: default │          │
│ - JIRA: tidak ada    │          │
└────┬─────────────────┘          │
     │                             │
     │                             │
     ├─── Profil Ditemukan ───────┤
     │    (Pengguna Existing)      │
     │                             │
     ▼                             │
┌──────────────────────┐          │
│ Load Profil Existing │          │
│ dari Database        │          │
│                      │          │
│ Data yang dimuat:    │          │
│ - Personal info      │          │
│ - Chat history       │          │
│ - Templates          │          │
│ - JIRA connections   │          │
│ - Preferences        │          │
│ - Usage limits       │          │
│                      │          │
│ Migrasi (jika perlu):│          │
│ - Cek localStorage   │          │
│ - Migrate ke DB      │          │
│ - Tampilkan notif    │          │
└────┬─────────────────┘          │
     │                             │
     └──────────┬──────────────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Halaman Chat         │
     │ (Semua data tersedia)│
     └────┬─────────────────┘
          │
          ▼
     ┌─────────┐
     │  Mulai  │
     │ (Siap)  │
     └─────────┘
```

---

## Flowchart Visual yang Diperbarui

Untuk menggantikan flowchart di gambar, berikut adalah versi yang lebih akurat:

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Mulai  │────▶│   Halaman    │────▶│  Klik Login  │────▶│    Proses    │
│         │     │    Login     │     │ dengan Google│     │OAuth Google  │
└─────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                   │
                                                                   ▼
                                                          ┌────────────────┐
                                                          │  Autentikasi   │
                                                          │   Berhasil?    │
                                                          └───┬────────┬───┘
                                                              │        │
                                                            YA│        │TIDAK
                                                              │        │
                                                              │        ▼
                                                              │  ┌──────────────┐
                                                              │  │  Tampilkan   │
                                                              │  │    Pesan     │
                                                              │  │  Kesalahan   │
                                                              │  └──────┬───────┘
                                                              │         │
                                                              │         │(loop)
                                                              ▼         │
                                                     ┌─────────────────┐│
                                                     │  Cek Profil di  ││
                                                     │    Database     ││
                                                     └────┬────────┬───┘│
                                                          │        │    │
                                              Tidak Ada   │        │Ada │
                                              (User Baru) │        │(Existing)
                                                          │        │    │
                                                          ▼        ▼    │
                                              ┌──────────────┐ ┌──────────────┐
                                              │ Buat Profil  │ │ Load Profil  │
                                              │    Baru      │ │  Existing +  │
                                              │              │ │  Semua Data  │
                                              │ - Email      │ │              │
                                              │ - Name       │ │ - History    │
                                              │ - Avatar     │ │ - Templates  │
                                              │ - Role       │ │ - JIRA       │
                                              │              │ │ - Preferences│
                                              │ Data kosong  │ │              │
                                              │              │ │ + Migrasi    │
                                              └──────┬───────┘ └──────┬───────┘
                                                     │                │
                                                     └────────┬───────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │  Halaman Chat   │
                                                     │ (Semua tersedia)│
                                                     └────────┬────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │      Mulai      │
                                                     │  (Siap pakai)   │
                                                     └─────────────────┘
```

---

## Keterangan Warna (untuk flowchart visual):

- **Ungu/Pink** (Interaksi Pengguna): Mulai, Halaman Login, Klik Login dengan Google
- **Biru** (Proses Sistem): Proses OAuth Google, Cek Profil, Buat/Load Profil, Halaman Chat
- **Hijau** (Pilihan/Desisi): Autentikasi Berhasil?
- **Biru Muda** (Output): Tampilkan Pesan Kesalahan

---

## Penjelasan Singkat untuk Caption Gambar

**Versi Pendek:**
> Flowchart autentikasi pengguna dengan Google OAuth. Sistem otomatis membedakan pengguna baru (membuat profil baru) dan pengguna existing (memuat profil dan data lengkap dari database). Setelah autentikasi berhasil, pengguna diarahkan ke halaman chat.

**Versi Lengkap:**
> Flowchart autentikasi pengguna melalui Google OAuth. Alur dimulai dari halaman login, dilanjutkan dengan proses OAuth Google. Jika autentikasi gagal, sistem menampilkan pesan kesalahan. Jika berhasil, sistem mengecek database: untuk pengguna baru, sistem membuat profil baru dengan data dasar; untuk pengguna existing, sistem memuat profil lengkap beserta riwayat chat, template, koneksi JIRA, dan melakukan migrasi data jika diperlukan. Pengguna kemudian diarahkan ke halaman chat dengan semua data tersedia.

---

## Poin Penting untuk Dokumentasi

1. **Otomatis Deteksi**: Sistem otomatis mendeteksi user baru vs existing tanpa input manual
2. **Seamless Experience**: Dari sisi user, prosesnya sama - hanya klik "Login dengan Google"
3. **Data Persistence**: User existing langsung mendapat semua data mereka
4. **Migration Support**: Data lama di localStorage otomatis di-migrate ke database
5. **Single Sign-On**: Menggunakan Google OAuth untuk keamanan dan kemudahan
6. **Profile Management**: Profil disimpan di tabel `profiles` dengan relasi ke tabel lain
7. **Session Management**: Token disimpan di localStorage untuk autentikasi API

---

## Referensi Kode

- **AuthContext**: `aplikasi-klien/src/contexts/AuthContext.jsx`
- **AuthService**: `aplikasi-klien/src/services/auth/AuthService.js`
- **Supabase Config**: `aplikasi-klien/src/config/supabase.js`
- **Migration**: `aplikasi-klien/src/utils/migrations/localStorageMigration.js`
