# Diagram Validasi User Story - YANG BENAR

## ⚠️ Koreksi Diagram

### Diagram yang Ditunjukkan (SALAH):
```
Mengirim Input → Cek Epic (WAJIB) → Cek Limit → Cek Input → Generate
```

### Diagram yang Benar:
```
Mengirim Input → Cek Epic (OPSIONAL, hanya chat baru) → Cek Limit (WAJIB) → Cek Input → Generate
```

---

## Flowchart yang Benar

```
                    ┌─────────────────────────┐
                    │  User Mengirim Input    │
                    │     User Story          │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Ada activeChatId?     │
                    │   (Chat sudah ada?)     │
                    └───────────┬─────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
               YA                             TIDAK
                │                               │
                │                               ▼
                │                   ┌─────────────────────────┐
                │                   │    Cek hasEpic?         │
                │                   │  (Epic terhubung?)      │
                │                   └───────────┬─────────────┘
                │                               │
                │                   ┌───────────┴───────────┐
                │                   │                       │
                │                  YA                     TIDAK
                │                   │                       │
                │                   │                       ▼
                │                   │           ┌─────────────────────┐
                │                   │           │  Buka Epic Modal    │
                │                   │           │  ❌ STOP            │
                │                   │           └─────────────────────┘
                │                   │
                └───────────────────┴───────────┐
                                                │
                                                ▼
                                ┌─────────────────────────┐
                                │  Kirim Request ke       │
                                │  Server                 │
                                │  POST /api/gherkin/     │
                                │       generate          │
                                └───────────┬─────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │  Middleware:            │
                                │  checkUsageLimit()      │
                                └───────────┬─────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │  User authenticated?    │
                                └───────────┬─────────────┘
                                            │
                            ┌───────────────┴───────────────┐
                            │                               │
                          TIDAK                            YA
                            │                               │
                            │                               ▼
                            │               ┌─────────────────────────┐
                            │               │  Cek Usage Limit        │
                            │               │  untuk model terpilih   │
                            │               └───────────┬─────────────┘
                            │                           │
                            │               ┌───────────┴───────────┐
                            │               │                       │
                            │           TERSEDIA                 HABIS
                            │               │                       │
                            │               │                       ▼
                            │               │           ┌─────────────────────┐
                            │               │           │  Return 429         │
                            │               │           │  + alternatives     │
                            │               │           │  ❌ STOP            │
                            │               │           └─────────────────────┘
                            │               │
                            └───────────────┴───────────┐
                                                        │
                                                        ▼
                                            ┌─────────────────────────┐
                                            │  Controller:            │
                                            │  generateGherkin()      │
                                            └───────────┬─────────────┘
                                                        │
                                                        ▼
                                            ┌─────────────────────────┐
                                            │  Validasi Input         │
                                            │  - Required string      │
                                            │  - Min 10 chars         │
                                            └───────────┬─────────────┘
                                                        │
                                            ┌───────────┴───────────┐
                                            │                       │
                                          VALID                 INVALID
                                            │                       │
                                            │                       ▼
                                            │           ┌─────────────────────┐
                                            │           │  Return 400         │
                                            │           │  Bad Request        │
                                            │           │  ❌ STOP            │
                                            │           └─────────────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │  Panggil AI Service     │
                                │  convertToGherkin()     │
                                └───────────┬─────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │  Generate Gherkin       │
                                │  dengan model terpilih  │
                                └───────────┬─────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │  Increment Usage        │
                                │  Counter (jika auth)    │
                                └───────────┬─────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │  Save ke DB             │
                                │  (dengan Epic jika ada) │
                                └───────────┬─────────────┘
                                            │
                                            ▼
                                ┌─────────────────────────┐
                                │  Return Response        │
                                │  - Gherkin code         │
                                │  - Usage info           │
                                │  - Quality metrics      │
                                │  ✅ SUCCESS             │
                                └─────────────────────────┘
```

---

## Perbedaan Utama dengan Diagram yang Salah

### ❌ Diagram Salah Menunjukkan:

1. **Epic dicek WAJIB** sebelum kirim ke server
2. **Limit dicek SETELAH Epic**
3. Tidak ada kondisi `activeChatId`
4. Epic terlihat seperti requirement wajib

### ✅ Diagram Benar Menunjukkan:

1. **Epic OPSIONAL**, hanya dicek jika chat baru (`!activeChatId`)
2. **Limit dicek di server** (middleware), bukan di client
3. Ada kondisi `activeChatId` yang menentukan apakah Epic perlu dicek
4. Epic bisa di-skip jika sudah ada chat aktif

---

## Tabel Perbandingan

| Aspek | Diagram Salah | Diagram Benar |
|-------|---------------|---------------|
| **Epic Check** | Wajib untuk semua request | Opsional, hanya untuk chat baru |
| **Kondisi Epic** | `!hasEpic` | `!activeChatId && !hasEpic` |
| **Lokasi Limit Check** | Setelah Epic | Di server middleware |
| **Epic di Server** | Ada validasi | Tidak ada validasi |
| **Blocking** | Epic blocking | Epic tidak blocking |
| **Use Case** | Epic wajib | Epic untuk JIRA integration saja |

---

## Skenario Lengkap

### Skenario A: Chat Baru + Tidak Ada Epic + Limit Habis

```
User Input → Cek activeChatId (TIDAK) → Cek hasEpic (TIDAK) → Buka Epic Modal ❌ STOP
```

**Hasil:** Epic modal dibuka, request tidak dikirim.  
**Limit:** Tidak dicek karena request tidak sampai server.

---

### Skenario B: Chat Baru + Ada Epic + Limit Habis

```
User Input → Cek activeChatId (TIDAK) → Cek hasEpic (YA) → Kirim ke Server
           → Middleware cek limit (HABIS) → Return 429 ❌ STOP
```

**Hasil:** Error 429 dengan model alternatif.  
**Epic:** Sudah ada, jadi lanjut ke server.

---

### Skenario C: Chat Existing + Tidak Ada Epic + Limit Habis

```
User Input → Cek activeChatId (YA) → Skip cek Epic → Kirim ke Server
           → Middleware cek limit (HABIS) → Return 429 ❌ STOP
```

**Hasil:** Error 429 dengan model alternatif.  
**Epic:** Tidak dicek karena ada activeChatId.

---

### Skenario D: Chat Existing + Tidak Ada Epic + Limit Tersedia

```
User Input → Cek activeChatId (YA) → Skip cek Epic → Kirim ke Server
           → Middleware cek limit (TERSEDIA) → Validasi input (VALID)
           → Generate Gherkin → Save tanpa Epic → Return Success ✅
```

**Hasil:** Gherkin berhasil di-generate tanpa Epic.  
**Epic:** Tidak diperlukan untuk generate Gherkin.

---

### Skenario E: Chat Baru + Ada Epic + Limit Tersedia

```
User Input → Cek activeChatId (TIDAK) → Cek hasEpic (YA) → Kirim ke Server
           → Middleware cek limit (TERSEDIA) → Validasi input (VALID)
           → Generate Gherkin → Save dengan Epic → Return Success ✅
```

**Hasil:** Gherkin berhasil di-generate dengan Epic untuk JIRA integration.

---

## Kesimpulan

### Jawaban untuk Pertanyaan Awal:

**"KETIKA PENGGUNA MENGIRIM INPUT USER STORY, NAMUN JIRA DAN EPIC BELUM TERHUBUNG, KEMUDIAN LIMIT MODEL JUGA SUDAH HABIS. YANG MANA DULU YANG AKAN DI CEK?"**

**Jawaban:**

1. **Jika di chat baru:**
   - Epic dicek dulu (client-side)
   - Jika tidak ada Epic, buka modal → STOP
   - Jika ada Epic, lanjut ke server → Limit dicek (server-side)

2. **Jika di chat existing:**
   - Epic **TIDAK DICEK**
   - Langsung kirim ke server → Limit dicek (server-side)

**Jadi:**
- **Chat baru:** Epic → Limit
- **Chat existing:** Limit (Epic tidak dicek)

### Poin Penting:

✅ Epic **OPSIONAL** untuk generate Gherkin  
✅ Epic **HANYA** untuk JIRA integration  
✅ User **BISA** generate Gherkin tanpa Epic  
✅ Limit **SELALU** dicek di server untuk authenticated user  
✅ Epic **TIDAK ADA** validasi di server untuk `/api/gherkin/generate`

---

## Diagram Sederhana

### Chat Baru:
```
Input → Epic? → Server → Limit? → Input? → AI → Success
         ↓                ↓
        TIDAK            HABIS
         ↓                ↓
       STOP              STOP
```

### Chat Existing:
```
Input → Server → Limit? → Input? → AI → Success
                   ↓
                 HABIS
                   ↓
                 STOP
```

**Epic tidak dicek untuk chat existing!**
