# Penjelasan Detail Metrik METEOR dalam Proses Pengujian

## Gambaran Umum

Dokumen ini menjelaskan secara detail bagaimana metrik METEOR (Metric for Evaluation of Translation with Explicit ORdering) dihitung dan dijelaskan dalam setiap tahapan proses pengujian, menggantikan bagian "Ringkasan Perhitungan Detail" yang tidak diperlukan.

## Detail Metrik METEOR yang Dijelaskan dalam Proses Pengujian

### 1. Presisi (Precision)
**Definisi**: Proporsi kata dalam teks yang dihasilkan yang juga muncul dalam teks referensi.

**Rumus**: 
```
Presisi = (Jumlah kata yang cocok) / (Total kata dalam teks yang dihasilkan)
```

**Penjelasan dalam Proses Pengujian**:
- Menghitung berapa banyak kata dari skenario yang dihasilkan yang juga ada dalam skenario referensi
- Memberikan indikasi seberapa "tepat" skenario yang dihasilkan
- Nilai tinggi menunjukkan sedikit kata yang tidak relevan

**Contoh**:
```
Teks Dihasilkan: "Given user login When click button Then see dashboard"
Teks Referensi: "Given user login When press button Then view dashboard"
Kata yang cocok: "Given", "user", "login", "When", "button", "Then", "dashboard" (7 kata)
Total kata dihasilkan: 8 kata
Presisi = 7/8 = 0.875 (87.5%)
```

### 2. Recall
**Definisi**: Proporsi kata dalam teks referensi yang juga muncul dalam teks yang dihasilkan.

**Rumus**:
```
Recall = (Jumlah kata yang cocok) / (Total kata dalam teks referensi)
```

**Penjelasan dalam Proses Pengujian**:
- Menghitung berapa banyak kata dari skenario referensi yang berhasil "ditangkap" oleh skenario yang dihasilkan
- Memberikan indikasi seberapa "lengkap" skenario yang dihasilkan
- Nilai tinggi menunjukkan sedikit informasi penting yang terlewat

**Contoh**:
```
Teks Dihasilkan: "Given user login When click button Then see dashboard"
Teks Referensi: "Given user login When press button Then view dashboard"
Kata yang cocok: "Given", "user", "login", "When", "button", "Then", "dashboard" (7 kata)
Total kata referensi: 8 kata
Recall = 7/8 = 0.875 (87.5%)
```

### 3. F-Mean (F-Score/F-Measure)
**Definisi**: Rata-rata harmonik dari presisi dan recall, memberikan keseimbangan antara keduanya.

**Rumus**:
```
F-Mean = 2 × (Presisi × Recall) / (Presisi + Recall)
```

**Penjelasan dalam Proses Pengujian**:
- Menggabungkan presisi dan recall menjadi satu metrik
- Memberikan gambaran keseluruhan kualitas kecocokan kata
- Nilai tinggi menunjukkan keseimbangan yang baik antara ketepatan dan kelengkapan

**Contoh**:
```
Presisi = 0.875, Recall = 0.875
F-Mean = 2 × (0.875 × 0.875) / (0.875 + 0.875)
F-Mean = 2 × 0.765625 / 1.75 = 0.875 (87.5%)
```

### 4. Skor METEOR Final
**Definisi**: Skor akhir yang menggabungkan F-Mean dengan penalti untuk perbedaan urutan kata (chunk penalty).

**Rumus**:
```
METEOR = F-Mean × (1 - Penalty)
Penalty = γ × (chunks/matches)^β
```

**Parameter**:
- γ (gamma) = 0.5 (konstanta penalti)
- β (beta) = 3 (eksponen penalti)
- chunks = jumlah segmen kata yang berurutan
- matches = jumlah total kata yang cocok

**Penjelasan dalam Proses Pengujian**:
- Menghitung penalti berdasarkan seberapa berbeda urutan kata antara teks yang dihasilkan dan referensi
- Skor akhir yang mempertimbangkan tidak hanya kecocokan kata, tetapi juga urutan kata
- Nilai berkisar 0-1, dengan 1 menunjukkan kecocokan sempurna

**Contoh**:
```
F-Mean = 0.875
Matches = 7 kata yang cocok
Chunks = 3 (segmen: "Given user login", "When", "button Then", "dashboard")
Penalty = 0.5 × (3/7)^3 = 0.5 × 0.088 = 0.044
METEOR = 0.875 × (1 - 0.044) = 0.875 × 0.956 = 0.837 (83.7%)
```

## Implementasi dalam Proses Pengujian

### Tahap 1: Preprocessing dan Tokenisasi
```python
# Tokenisasi teks menjadi kata-kata individual
generated_tokens = word_tokenize(generated_text.lower())
reference_tokens = word_tokenize(reference_text.lower())

# Contoh output:
# generated_tokens: ['given', 'user', 'login', 'when', 'click', 'button', 'then', 'see', 'dashboard']
# reference_tokens: ['given', 'user', 'login', 'when', 'press', 'button', 'then', 'view', 'dashboard']
```

### Tahap 2: Pencocokan Kata (Word Alignment)
```python
# METEOR melakukan pencocokan kata dengan mempertimbangkan:
# 1. Exact match (kata identik)
# 2. Stem match (kata dengan akar yang sama)
# 3. Synonym match (kata dengan makna serupa)

matches = find_word_alignments(generated_tokens, reference_tokens)
# matches: [('given', 'given'), ('user', 'user'), ('login', 'login'), 
#          ('when', 'when'), ('button', 'button'), ('then', 'then'), ('dashboard', 'dashboard')]
```

### Tahap 3: Perhitungan Metrik
```python
# Hitung presisi, recall, dan f-mean
precision = len(matches) / len(generated_tokens)
recall = len(matches) / len(reference_tokens)
f_mean = (10 * precision * recall) / (9 * precision + recall)

# Hitung chunk penalty
chunks = count_chunks(matches, generated_tokens, reference_tokens)
penalty = 0.5 * (chunks / len(matches)) ** 3

# Hitung skor METEOR final
meteor_score = f_mean * (1 - penalty)
```

### Tahap 4: Pelaporan Detail
```json
{
  "score": 0.837,
  "details": {
    "precision": 0.875,
    "recall": 0.875,
    "f_mean": 0.875,
    "chunks": 3,
    "matches": 7,
    "penalty": 0.044,
    "generated_tokens": 9,
    "reference_tokens": 8,
    "method": "METEOR + Translate-First"
  }
}
```

## Interpretasi Skor METEOR

### Rentang Skor dan Kualitas
- **0.9 - 1.0**: Kualitas Sangat Baik (Excellent)
  - Kecocokan kata sangat tinggi
  - Urutan kata hampir identik
  - Sedikit atau tidak ada informasi yang hilang

- **0.7 - 0.89**: Kualitas Baik (Good)
  - Kecocokan kata tinggi
  - Beberapa perbedaan urutan kata
  - Sebagian besar informasi penting tercakup

- **0.5 - 0.69**: Kualitas Cukup (Fair)
  - Kecocokan kata sedang
  - Perbedaan urutan kata yang signifikan
  - Beberapa informasi penting mungkin hilang

- **0.3 - 0.49**: Kualitas Kurang (Poor)
  - Kecocokan kata rendah
  - Urutan kata sangat berbeda
  - Banyak informasi penting hilang

- **0.0 - 0.29**: Kualitas Sangat Kurang (Very Poor)
  - Kecocokan kata sangat rendah
  - Hampir tidak ada kesamaan struktur
  - Sebagian besar informasi tidak cocok

### Faktor yang Mempengaruhi Skor
1. **Kecocokan Kosakata**: Seberapa banyak kata yang sama digunakan
2. **Urutan Kata**: Seberapa mirip struktur kalimat
3. **Sinonim**: METEOR dapat mengenali kata-kata bersinonim
4. **Stemming**: Mengenali kata dengan akar yang sama (misal: "login" dan "logging")
5. **Panjang Teks**: Teks yang lebih panjang cenderung memberikan skor yang lebih stabil

## Keunggulan METEOR dalam Pengujian Skenario

### 1. Fleksibilitas Bahasa
- Mendukung penerjemahan otomatis untuk skenario multibahasa
- Dapat membandingkan skenario dalam bahasa Indonesia dengan referensi bahasa Inggris

### 2. Pemahaman Konteks
- Mengenali sinonim dan variasi kata
- Mempertimbangkan urutan kata yang logis dalam skenario Gherkin

### 3. Robustness
- Tidak terlalu sensitif terhadap perbedaan kecil dalam penulisan
- Memberikan skor yang stabil untuk variasi yang wajar

## Contoh Lengkap Proses Pengujian

### Input
```
Skenario Dihasilkan: "Given user is on login page When user enters valid credentials Then user is redirected to dashboard"

Skenario Referensi: "Given user is on the login page When user provides valid email and password Then system redirects to main dashboard"
```

### Proses Perhitungan
```
1. Tokenisasi:
   Generated: [given, user, is, on, login, page, when, user, enters, valid, credentials, then, user, is, redirected, to, dashboard]
   Reference: [given, user, is, on, the, login, page, when, user, provides, valid, email, and, password, then, system, redirects, to, main, dashboard]

2. Word Alignment (matches):
   - given ↔ given
   - user ↔ user (multiple matches)
   - is ↔ is
   - on ↔ on
   - login ↔ login
   - page ↔ page
   - when ↔ when
   - valid ↔ valid
   - then ↔ then
   - to ↔ to
   - dashboard ↔ dashboard
   Total matches: 11

3. Perhitungan Metrik:
   Precision = 11/17 = 0.647 (64.7%)
   Recall = 11/20 = 0.550 (55.0%)
   F-Mean = 2 × (0.647 × 0.550) / (0.647 + 0.550) = 0.594 (59.4%)

4. Chunk Analysis:
   Chunks: 5 segmen berurutan
   Penalty = 0.5 × (5/11)³ = 0.046

5. Skor METEOR Final:
   METEOR = 0.594 × (1 - 0.046) = 0.567 (56.7%)
```

### Interpretasi Hasil
- **Skor 0.567 (56.7%)**: Kualitas Cukup (Fair)
- **Presisi 64.7%**: Sebagian besar kata dalam skenario yang dihasilkan relevan
- **Recall 55.0%**: Beberapa informasi penting dari referensi tidak tercakup
- **Penalti 4.6%**: Urutan kata cukup berbeda tetapi masih dapat diterima

### Rekomendasi Perbaikan
1. Tambahkan kata "the" untuk kelengkapan
2. Gunakan "provides" instead of "enters" untuk konsistensi
3. Spesifikasi "email and password" instead of "credentials"
4. Pertimbangkan "system redirects" instead of "user is redirected"

## Kesimpulan

Dengan menjelaskan detail metrik METEOR (presisi, recall, f-mean, dan skor METEOR) secara komprehensif dalam setiap tahapan proses pengujian, bagian "Ringkasan Perhitungan Detail" menjadi tidak diperlukan. Setiap metrik dijelaskan dengan:

1. **Definisi yang jelas**
2. **Rumus perhitungan**
3. **Contoh konkret**
4. **Interpretasi hasil**
5. **Rekomendasi perbaikan**

Pendekatan ini memberikan pemahaman yang lebih mendalam tentang bagaimana kualitas skenario dievaluasi dan bagaimana hasil dapat digunakan untuk perbaikan.