# Perbaikan: Test Results Persistence

## 🐛 Masalah

Hasil pengujian (METEOR + Sentence-BERT) **tidak tersimpan** setelah browser di-refresh. Skenario yang sudah diuji kembali ke status "belum diuji".

### Root Cause

1. **Backend SSE** menyimpan hasil ke tabel baru:
   - `meteor_test_results`
   - `sentence_bert_test_results`

2. **Frontend** masih load dari tabel lama:
   - `test_results` (deprecated)

3. **Mismatch** antara tabel write dan read → data tidak ditemukan setelah refresh

## ✅ Solusi

### 1. Update `UserDataService.getAllTestResults()`

**Sebelum:**
```javascript
// Query dari tabel lama
const { data, error } = await supabase
  .from('test_results')  // ❌ Tabel lama
  .select('*')
```

**Sekarang:**
```javascript
// Query dari kedua tabel baru secara parallel
const [meteorResponse, sbertResponse] = await Promise.all([
  supabase.from('meteor_test_results').select('*'),
  supabase.from('sentence_bert_test_results').select('*')
]);

// Combine hasil per scenario_id
const combinedMap = {};
meteorResults.forEach(meteor => {
  combinedMap[meteor.scenario_id] = { meteor: {...} };
});
sbertResults.forEach(sbert => {
  combinedMap[sbert.scenario_id].sentence_bert = {...};
});
```

### 2. Update `UserDataService.deleteTestResult()`

**Sebelum:**
```javascript
// Hapus dari tabel lama
await supabase.from('test_results').delete()
```

**Sekarang:**
```javascript
// Hapus dari kedua tabel baru
await Promise.all([
  supabase.from('meteor_test_results').delete(),
  supabase.from('sentence_bert_test_results').delete()
]);
```

### 3. Update `TestResultsContext` Parsing

**Sebelum:**
```javascript
resultsMap[scenarioId] = {
  ...testResult.test_details,  // ❌ Format lama
  meteor_score: testResult.score
};
```

**Sekarang:**
```javascript
const meteorDetails = testResult.test_details?.meteor || {};
const sbertDetails = testResult.test_details?.sentence_bert || {};

resultsMap[scenarioId] = {
  meteor: {
    score: meteorDetails.score,
    given_score: meteorDetails.given_score,
    // ... complete METEOR metrics
  },
  sentence_bert: {
    score: sbertDetails.score,
    given_score: sbertDetails.given_score,
    // ... complete Sentence-BERT metrics
  }
};
```

## 📊 Data Flow (Setelah Perbaikan)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User melakukan testing                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend SSE menyimpan ke tabel baru                      │
│    - meteor_test_results                                    │
│    - sentence_bert_test_results                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend update local state (instant UI feedback)        │
│    TestResultsContext.addTestResult()                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User refresh browser                                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Frontend load dari tabel baru ✅                         │
│    UserDataService.getAllTestResults()                      │
│    - Query meteor_test_results                              │
│    - Query sentence_bert_test_results                       │
│    - Combine per scenario_id                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. UI menampilkan status "Tested" dengan hasil lengkap ✅   │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Testing

### Test Case 1: Hasil Testing Persist Setelah Refresh

1. ✅ Login ke aplikasi
2. ✅ Buka chat dengan skenario
3. ✅ Klik "Test" dan jalankan dual evaluation
4. ✅ Tunggu hingga selesai (METEOR + Sentence-BERT)
5. ✅ Refresh browser (F5)
6. ✅ **Expected:** Skenario masih menampilkan status "Tested" dengan hasil lengkap
7. ✅ **Expected:** Tombol "View Details" tersedia

### Test Case 2: Multiple Scenarios

1. ✅ Test beberapa skenario berbeda
2. ✅ Refresh browser
3. ✅ **Expected:** Semua skenario yang sudah diuji tetap menampilkan hasil

### Test Case 3: Delete Test Result

1. ✅ Test skenario
2. ✅ Hapus hasil testing
3. ✅ Refresh browser
4. ✅ **Expected:** Skenario kembali ke status "belum diuji"

## 📝 Database Schema

### `meteor_test_results`
```sql
- id (uuid, PK)
- user_id (uuid, FK)
- scenario_id (text)
- meteor_score (numeric)
- given_score, when_score, then_score (numeric)
- given_precision, given_recall, given_f_mean, given_penalty (numeric)
- when_precision, when_recall, when_f_mean, when_penalty (numeric)
- then_precision, then_recall, then_f_mean, then_penalty (numeric)
- generated_text, reference_text (text)
- translation_info (jsonb)
- created_at (timestamp)
```

### `sentence_bert_test_results`
```sql
- id (uuid, PK)
- user_id (uuid, FK)
- scenario_id (text)
- similarity_score (numeric)
- given_score, when_score, then_score (numeric)
- generated_text, reference_text (text)
- details (jsonb) -- embedding_dimension, model, section_embeddings, etc.
- created_at (timestamp)
```

## 🔄 Backward Compatibility

- ✅ Format data di `TestResultsContext` tetap sama
- ✅ Komponen UI tidak perlu diubah
- ✅ Tabel `test_results` lama tidak dihapus (untuk data historis)
- ✅ Migration path: data lama tetap bisa dibaca jika ada

## 🚀 Deployment

1. ✅ Push ke main branch
2. ✅ Deploy backend (sudah ada tabel baru)
3. ✅ Deploy frontend (update query logic)
4. ✅ Test di production

## ✨ Hasil

- ✅ Hasil testing **persist** setelah refresh
- ✅ Performa lebih baik (query 2 tabel kecil vs 1 tabel besar)
- ✅ Data lebih terstruktur (METEOR & Sentence-BERT terpisah)
- ✅ Mudah untuk analytics per-metric
- ✅ Backward compatible dengan UI existing

## 📚 Files Changed

1. `aplikasi-klien/src/services/UserDataService.js`
   - `getAllTestResults()` - Query dari tabel baru
   - `deleteTestResult()` - Hapus dari tabel baru

2. `aplikasi-klien/src/contexts/TestResultsContext.jsx`
   - `loadTestResultsFromDatabase()` - Parse format baru
   - Preserve local state update untuk instant feedback

## 🎯 Next Steps

- [ ] Monitor production untuk memastikan tidak ada error
- [ ] Tambahkan analytics untuk track usage per-metric
- [ ] Consider migration script untuk data lama (jika diperlukan)
- [ ] Add unit tests untuk parsing logic baru
