# Flowchart Autentikasi - Versi Diperbarui

## Penjelasan untuk Gambar 3.2 (Diperbarui)

Flowchart ini menggambarkan alur autentikasi pengguna sebagaimana disajikan pada Gambar 3.2. Alur dimulai ketika pengguna membuka halaman login dan menekan tombol "Login dengan Google" untuk memulai proses OAuth. Sistem memvalidasi kredensial melalui Google Authentication. Apabila autentikasi gagal, sistem menampilkan pesan kesalahan dan mengarahkan pengguna kembali ke halaman login. Apabila berhasil, sistem **otomatis mendeteksi** apakah pengguna baru atau sudah terdaftar. **Untuk pengguna baru**, sistem membuat profil baru di tabel profiles dengan data dasar (email, nama, avatar). **Untuk pengguna yang sudah terdaftar**, sistem memuat profil existing beserta seluruh data pengguna (riwayat chat, template, koneksi JIRA, preferensi) dari database, kemudian melakukan migrasi data lama dari localStorage ke database jika diperlukan. Setelah proses autentikasi dan pemuatan profil selesai, sistem mengarahkan pengguna ke halaman chat utama dengan semua data tersedia.

---

## Flowchart Visual (Menggantikan Gambar yang Ada)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLOWCHART AUTENTIKASI                            │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  Mulai  │  ◄─────────────────────────────────────┐
    └────┬────┘                                         │
         │                                              │
         ▼                                              │
    ┌──────────────────┐                               │
    │ Halaman Login    │                               │
    │                  │                               │
    └────┬─────────────┘                               │
         │                                              │
         ▼                                              │
    ┌──────────────────────┐                           │
    │ Klik Login dengan    │  ◄── Interaksi Pengguna  │
    │ Google               │                           │
    └────┬─────────────────┘                           │
         │                                              │
         ▼                                              │
    ┌──────────────────────┐                           │
    │ Proses OAuth Google  │  ◄── Proses Sistem        │
    │ (Validasi Kredensial)│                           │
    └────┬─────────────────┘                           │
         │                                              │
         ▼                                              │
         ◇ Autentikasi                                 │
         │ Berhasil?        ◄── Pilihan/Desisi         │
         │                                              │
    ┌────┴────┐                                         │
    │         │                                         │
  TIDAK      YA                                         │
    │         │                                         │
    │         ▼                                         │
    │    ┌──────────────────────┐                      │
    │    │ Cek Profil di        │                      │
    │    │ Database             │                      │
    │    │ (tabel profiles)     │                      │
    │    └────┬─────────────────┘                      │
    │         │                                         │
    │    ┌────┴────────────────┐                       │
    │    │                     │                       │
    │  User Baru          User Existing                │
    │    │                     │                       │
    │    ▼                     ▼                       │
    │ ┌──────────────┐  ┌──────────────────────┐      │
    │ │ Buat Profil  │  │ Load Profil Existing │      │
    │ │ Baru         │  │ + Semua Data         │      │
    │ │              │  │                      │      │
    │ │ INSERT:      │  │ SELECT:              │      │
    │ │ - id         │  │ - Personal info      │      │
    │ │ - email      │  │ - Chat history       │      │
    │ │ - name       │  │ - Templates          │      │
    │ │ - avatar_url │  │ - JIRA connections   │      │
    │ │ - role       │  │ - Preferences        │      │
    │ │ - created_at │  │ - Usage limits       │      │
    │ │              │  │                      │      │
    │ │ Status:      │  │ Migrasi (jika ada):  │      │
    │ │ - Data kosong│  │ - localStorage → DB  │      │
    │ │              │  │ - Tampilkan notif    │      │
    │ └──────┬───────┘  └──────────┬───────────┘      │
    │        │                     │                   │
    │        └──────────┬──────────┘                   │
    │                   │                              │
    │                   ▼                              │
    │          ┌─────────────────┐                     │
    │          │ Halaman Chat    │                     │
    │          │ (Semua tersedia)│                     │
    │          └────────┬────────┘                     │
    │                   │                              │
    │                   └──────────────────────────────┘
    │
    ▼
┌──────────────────────┐
│ Tampilkan Pesan      │
│ Kesalahan Login      │
└──────────────────────┘
    │
    └─────────────────────────────────────────────────┐
                                                      │
                                                      │
                                                      ▼
                                            (Kembali ke Halaman Login)


┌─────────────────────────────────────────────────────────────────────────┐
│                              KETERANGAN                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ◇  = Pilihan/Desisi                                                    │
│  ▢  = Proses Sistem                                                     │
│  ▢  = Interaksi Pengguna (dengan warna berbeda di gambar)              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Flowchart Horizontal (Alternatif - Sesuai Gambar Asli)

```
┌─────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        ◇
│  Mulai  │──▶│   Halaman    │──▶│  Klik Login  │──▶│    Proses    │──────▶ │
│         │   │    Login     │   │ dengan Google│   │OAuth Google  │        │
└─────────┘   └──────────────┘   └──────────────┘   └──────────────┘        │
                                                                              │
                                                                    Autentikasi
                                                                     Berhasil?
                                                                              │
                                                                              │
                    ┌─────────────────────────────────────────────────────────┤
                    │                                                         │
                  TIDAK                                                      YA
                    │                                                         │
                    ▼                                                         ▼
         ┌──────────────────────┐                              ┌──────────────────────┐
         │  Tampilkan Pesan     │                              │  Cek Profil di       │
         │  Kesalahan Login     │                              │  Database            │
         └──────────┬───────────┘                              └──────────┬───────────┘
                    │                                                     │
                    │                                         ┌───────────┴───────────┐
                    │                                         │                       │
                    │                                    User Baru              User Existing
                    │                                         │                       │
                    │                                         ▼                       ▼
                    │                              ┌──────────────────┐   ┌──────────────────┐
                    │                              │  Buat Profil     │   │  Load Profil     │
                    │                              │  Baru            │   │  Existing +      │
                    │                              │                  │   │  Semua Data +    │
                    │                              │  - Email         │   │  Migrasi         │
                    │                              │  - Name          │   │                  │
                    │                              │  - Avatar        │   │  - History       │
                    │                              │  - Role          │   │  - Templates     │
                    │                              │                  │   │  - JIRA          │
                    │                              │  Data kosong     │   │  - Preferences   │
                    │                              └────────┬─────────┘   └────────┬─────────┘
                    │                                       │                      │
                    │                                       └──────────┬───────────┘
                    │                                                  │
                    │                                                  ▼
                    │                                       ┌──────────────────────┐
                    │                                       │  Halaman Chat        │
                    │                                       │  (Semua tersedia)    │
                    │                                       └──────────┬───────────┘
                    │                                                  │
                    │                                                  ▼
                    │                                       ┌──────────────────────┐
                    └──────────────────────────────────────▶│       Mulai          │
                                                            │    (Siap pakai)      │
                                                            └──────────────────────┘
```

---

## Penjelasan Detail untuk Setiap Komponen

### 1. Mulai
- **Jenis**: Start/End (Oval)
- **Warna**: Ungu/Pink (Interaksi Pengguna)
- **Deskripsi**: Titik awal alur autentikasi

### 2. Halaman Login
- **Jenis**: Process (Rectangle)
- **Warna**: Biru (Proses Sistem)
- **Deskripsi**: Halaman landing dengan tombol "Login dengan Google"

### 3. Klik Login dengan Google
- **Jenis**: Process (Rectangle)
- **Warna**: Ungu/Pink (Interaksi Pengguna)
- **Deskripsi**: User mengklik tombol untuk memulai OAuth

### 4. Proses OAuth Google
- **Jenis**: Process (Rectangle)
- **Warna**: Biru (Proses Sistem)
- **Deskripsi**: Redirect ke Google, user login, Google validasi kredensial

### 5. Autentikasi Berhasil?
- **Jenis**: Decision (Diamond)
- **Warna**: Hijau (Pilihan/Desisi)
- **Deskripsi**: Cek hasil autentikasi dari Google
- **Output**: YA atau TIDAK

### 6a. Tampilkan Pesan Kesalahan Login (jika TIDAK)
- **Jenis**: Process (Rectangle)
- **Warna**: Biru Muda (Output)
- **Deskripsi**: Tampilkan error message
- **Flow**: Kembali ke Halaman Login

### 6b. Cek Profil di Database (jika YA)
- **Jenis**: Process (Rectangle)
- **Warna**: Biru (Proses Sistem)
- **Deskripsi**: Query ke tabel `profiles` untuk cek user
- **Output**: User Baru atau User Existing

### 7a. Buat Profil Baru (User Baru)
- **Jenis**: Process (Rectangle)
- **Warna**: Biru (Proses Sistem)
- **Deskripsi**: INSERT profil baru ke database
- **Data**: id, email, name, avatar_url, role, created_at
- **Status**: Data kosong (no history, no templates, no JIRA)

### 7b. Load Profil Existing (User Existing)
- **Jenis**: Process (Rectangle)
- **Warna**: Biru (Proses Sistem)
- **Deskripsi**: SELECT profil dan semua data terkait
- **Data**: Personal info, chat history, templates, JIRA, preferences, usage limits
- **Bonus**: Migrasi data dari localStorage jika ada

### 8. Halaman Chat
- **Jenis**: Process (Rectangle)
- **Warna**: Biru (Proses Sistem)
- **Deskripsi**: Redirect ke `/chat` dengan semua data tersedia

### 9. Mulai (Siap pakai)
- **Jenis**: Start/End (Oval)
- **Warna**: Ungu/Pink (Interaksi Pengguna)
- **Deskripsi**: User siap menggunakan aplikasi

---

## Perbedaan dengan Flowchart Lama

| Aspek | Flowchart Lama | Flowchart Baru |
|-------|----------------|----------------|
| **Profil Tersimpan** | Hanya untuk user baru | Untuk user baru DAN existing |
| **Penjelasan** | "Menyimpan profil" | "Buat profil baru" atau "Load profil existing" |
| **Detail Data** | Tidak dijelaskan | Dijelaskan lengkap (history, templates, JIRA, dll) |
| **Migrasi** | Tidak disebutkan | Disebutkan untuk user existing |
| **Alur** | Linear sederhana | Bercabang (user baru vs existing) |

---

## Rekomendasi untuk Gambar 3.2

### Opsi 1: Update Flowchart dengan Cabang
Tambahkan decision diamond setelah "Autentikasi Berhasil?" untuk membedakan user baru dan existing:

```
Autentikasi Berhasil? (YA)
    │
    ▼
Profil Ada di Database?
    │
    ├─── TIDAK (User Baru)
    │    │
    │    ▼
    │    Buat Profil Baru
    │    (INSERT)
    │
    └─── YA (User Existing)
         │
         ▼
         Load Profil + Data
         (SELECT + Migrasi)
```

### Opsi 2: Simplifikasi dengan Catatan
Tetap gunakan flowchart sederhana, tapi tambahkan catatan:

```
Profil Tersimpan
(tabel profiles)
    │
    ▼
Halaman Chat

Catatan:
- User baru: Profil dibuat otomatis
- User existing: Profil dan data dimuat dari database
```

### Opsi 3: Dua Flowchart Terpisah
Buat dua flowchart side-by-side:
- Flowchart A: Alur untuk User Baru
- Flowchart B: Alur untuk User Existing

---

## Caption yang Direkomendasikan

**Versi Singkat:**
> Gambar 3.2: Flowchart autentikasi pengguna dengan Google OAuth. Sistem otomatis membedakan pengguna baru (membuat profil) dan pengguna existing (memuat profil dan data lengkap).

**Versi Lengkap:**
> Gambar 3.2: Flowchart autentikasi pengguna melalui Google OAuth. Setelah autentikasi berhasil, sistem mengecek database: untuk pengguna baru, sistem membuat profil baru dengan data dasar; untuk pengguna existing, sistem memuat profil lengkap beserta riwayat chat, template, koneksi JIRA, dan melakukan migrasi data jika diperlukan.

**Versi Akademis:**
> Gambar 3.2: Diagram alir proses autentikasi pengguna menggunakan protokol OAuth 2.0 dengan Google sebagai identity provider. Sistem mengimplementasikan deteksi otomatis status pengguna (baru atau existing) dan melakukan operasi database yang sesuai: INSERT untuk pengguna baru atau SELECT dengan migrasi data untuk pengguna existing.

---

## Kode Warna untuk Flowchart

Jika membuat flowchart berwarna, gunakan skema ini:

- **Ungu/Pink (#E9D5FF)**: Interaksi Pengguna
  - Mulai
  - Halaman Login
  - Klik Login dengan Google
  
- **Biru (#DBEAFE)**: Proses Sistem
  - Proses OAuth Google
  - Cek Profil di Database
  - Buat Profil Baru
  - Load Profil Existing
  - Halaman Chat

- **Hijau (#D1FAE5)**: Pilihan/Desisi
  - Autentikasi Berhasil?
  - Profil Ada di Database? (jika ditambahkan)

- **Biru Muda (#BAE6FD)**: Output/Error
  - Tampilkan Pesan Kesalahan Login

---

## Kesimpulan

Flowchart yang diperbarui harus mencerminkan bahwa:

1. ✅ Sistem **otomatis** mendeteksi user baru vs existing
2. ✅ User baru: profil **dibuat** (INSERT)
3. ✅ User existing: profil **dimuat** (SELECT) dengan semua data
4. ✅ User existing: data lama **di-migrate** jika ada
5. ✅ Kedua jenis user: sama-sama diarahkan ke halaman chat
6. ✅ Proses **seamless** dari perspektif user
