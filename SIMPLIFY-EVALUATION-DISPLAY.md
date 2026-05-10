# Panduan Menyederhanakan Tampilan Evaluasi

## 📋 Ringkasan Perubahan

Menghilangkan tab **Given/When/Then** dan hanya menampilkan **skor keseluruhan (full-text)** untuk METEOR dan Sentence-BERT.

---

## 🎯 Tujuan

- ✅ Tampilan lebih sederhana dan tidak membingungkan
- ✅ Fokus pada skor utama (full-text evaluation)
- ✅ Menghilangkan section breakdown yang terlalu detail
- ✅ Tetap menyimpan data section di backend (untuk analisis lanjutan jika diperlukan)

---

## 📁 File yang Perlu Diubah

### **1. Frontend - UI Components**

#### **A. `aplikasi-klien/src/pages/TestResultsDetailPage.jsx`** ⭐ **UTAMA**

**Lokasi:** Baris 26, 536-573

**Perubahan:**
```jsx
// SEBELUM: Ada state untuk selectedSection
const [selectedSection, setSelectedSection] = useState('semua');

// SESUDAH: Hapus state ini, atau set default 'semua' dan hide selector
// const [selectedSection, setSelectedSection] = useState('semua'); // HAPUS atau COMMENT
const selectedSection = 'semua'; // HARDCODE ke 'semua'
```

**Hapus Section Selector UI (Baris 536-573):**
```jsx
// HAPUS SELURUH BLOK INI:
{['semua', 'given', 'when', 'then'].map((section) => (
  <button
    key={section}
    onClick={() => setSelectedSection(section)}
    className={...}
  >
    {section === 'semua' ? 'Semua' : section.charAt(0).toUpperCase() + section.slice(1)}
  </button>
))}
```

**Hapus Label Section di Header (Baris 573):**
```jsx
// HAPUS ATAU UBAH:
<span className="text-sm text-gray-400">
  ({selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)})
</span>

// JADI:
<span className="text-sm text-gray-400">(Overall Score)</span>
```

**Hapus Conditional Rendering Section Details (Baris 1061):**
```jsx
// HAPUS ATAU UBAH:
{selectedSection !== 'semua' && (
  <div>
    {/* Detail per section */}
  </div>
)}

// JADI: Selalu tampilkan overall, atau hapus conditional
```

---

#### **B. `aplikasi-klien/src/components/common/TestResultsDisplay.jsx`**

**Lokasi:** Baris 1-400 (keseluruhan file)

**Status:** ✅ **SUDAH BENAR** - File ini sudah hanya menampilkan overall score tanpa section breakdown

**Catatan:** File ini adalah komponen lama yang sudah simplified. Pastikan tidak ada regresi.

---

### **2. Backend - Data Processing**

#### **A. `aplikasi-server/src/services/testingService.js`**

**Status:** ✅ **TIDAK PERLU DIUBAH**

**Alasan:**
- Backend tetap menghitung dan menyimpan section metrics untuk:
  1. **Backward compatibility** dengan data lama
  2. **Future analysis** jika diperlukan
  3. **Research purposes** (Bab IV - error analysis)

**Yang Perlu Dipastikan:**
- `score` field tetap berisi **full-text score** (bukan rata-rata section) ✅ Sudah benar
- `section_metrics` tetap disimpan tapi **tidak wajib ditampilkan** di frontend

---

#### **B. `aplikasi-server/src/python/meteor_calculator.py`**

**Status:** ✅ **TIDAK PERLU DIUBAH**

**Alasan:**
- Script Python tetap menghitung section metrics untuk diagnostik
- Frontend yang memutuskan mana yang ditampilkan

---

#### **C. `aplikasi-server/src/python/sentence_bert_calculator.py`**

**Status:** ✅ **TIDAK PERLU DIUBAH**

**Alasan:** Sama dengan METEOR calculator

---

### **3. Database Schema**

**Status:** ✅ **TIDAK PERLU DIUBAH**

**Alasan:**
- Tabel `meteor_test_results` dan `sentence_bert_test_results` tetap menyimpan section metrics
- Data historis tetap utuh
- Jika suatu saat perlu analisis mendalam, data masih tersedia

---

## 🔧 Implementasi Step-by-Step

### **Step 1: Backup File**
```bash
# Backup file yang akan diubah
cp aplikasi-klien/src/pages/TestResultsDetailPage.jsx aplikasi-klien/src/pages/TestResultsDetailPage.jsx.backup
```

### **Step 2: Edit TestResultsDetailPage.jsx**

**2.1. Hardcode selectedSection**
```jsx
// Baris 26 - UBAH:
const [selectedSection, setSelectedSection] = useState('semua');

// JADI:
// const [selectedSection, setSelectedSection] = useState('semua'); // REMOVED
const selectedSection = 'semua'; // Always use overall score
```

**2.2. Hapus Section Selector UI**
```jsx
// Baris 536-573 - HAPUS SELURUH BLOK:
{/* Section Filter Tabs - REMOVED */}
{/* 
<div className="col-span-1 flex flex-col gap-2">
  {['semua', 'given', 'when', 'then'].map((section) => (
    ...
  ))}
</div>
*/}
```

**2.3. Update Grid Layout**
```jsx
// Baris 535 - UBAH dari:
<div className="grid grid-cols-4 gap-6 mb-8">
  {/* Section Filter Tabs - 25% (1 column) */}
  <div className="col-span-1">...</div>
  
  {/* Main Result Card - 75% (3 columns) */}
  <div className="col-span-3">...</div>
</div>

// JADI (full width untuk result card):
<div className="mb-8">
  {/* Main Result Card - Full Width */}
  <div className="w-full">...</div>
</div>
```

**2.4. Simplify Header Label**
```jsx
// Baris 573 - UBAH:
<span className="text-sm text-gray-400">
  ({selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)})
</span>

// JADI:
<span className="text-sm text-gray-400">(Overall Score)</span>
```

**2.5. Remove Conditional Section Details**
```jsx
// Baris 1061 - HAPUS atau UBAH:
{selectedSection !== 'semua' && (
  <div>
    {/* Detailed Process Steps */}
  </div>
)}

// JADI: Hapus conditional, atau selalu tampilkan overall
// (Opsional: bisa tetap tampilkan process steps untuk 'semua')
```

### **Step 3: Test Perubahan**

**3.1. Test Manual**
```bash
# Jalankan development server
cd aplikasi-klien
npm run dev
```

**3.2. Test Checklist**
- [ ] Halaman test results terbuka tanpa error
- [ ] Skor METEOR ditampilkan (overall)
- [ ] Skor Sentence-BERT ditampilkan (overall)
- [ ] Tidak ada tab Given/When/Then
- [ ] Layout tidak broken
- [ ] Responsive di mobile

**3.3. Test dengan Data Real**
```bash
# Jalankan test evaluation
# Pastikan skor yang ditampilkan adalah full-text score, bukan rata-rata section
```

### **Step 4: Commit Changes**
```bash
git add aplikasi-klien/src/pages/TestResultsDetailPage.jsx
git commit -m "refactor(ui): simplify evaluation display - remove section tabs

- Remove Given/When/Then section selector
- Always display overall (full-text) score
- Simplify layout to single column
- Update header label to 'Overall Score'
- Backend section metrics still calculated for future analysis

BREAKING CHANGE: Section-specific scores no longer visible in UI
(data still available in backend for research purposes)"
```

---

## 📊 Perbandingan Before/After

### **Before (Kompleks)**
```
┌─────────────────────────────────────────┐
│  Tab: METEOR                            │
├─────────────────────────────────────────┤
│  Section Selector:                      │
│  [Semua] [Given] [When] [Then]          │
│                                         │
│  Score: 0.75 (Given)                    │
│  - Precision: 0.82                      │
│  - Recall: 0.78                         │
│  - F-mean: 0.79                         │
│  - Penalty: 0.05                        │
│                                         │
│  [Detail per section...]                │
└─────────────────────────────────────────┘
```

### **After (Sederhana)**
```
┌─────────────────────────────────────────┐
│  Tab: METEOR                            │
├─────────────────────────────────────────┤
│  Overall Score: 0.75                    │
│  - Precision: 0.82                      │
│  - Recall: 0.78                         │
│  - F-mean: 0.79                         │
│  - Penalty: 0.05                        │
│                                         │
│  [Process visualization...]             │
└─────────────────────────────────────────┘
```

---

## ⚠️ Catatan Penting

### **1. Data Tidak Hilang**
- Section metrics **tetap dihitung** di backend
- Section metrics **tetap disimpan** di database
- Hanya **tampilan UI** yang disederhanakan

### **2. Backward Compatibility**
- Data lama yang sudah ada tetap bisa dibaca
- API response tetap include section metrics
- Frontend hanya tidak menampilkan

### **3. Future Extensibility**
- Jika suatu saat perlu analisis mendalam, tinggal:
  1. Uncomment section selector
  2. Restore conditional rendering
  3. Data sudah tersedia di backend

### **4. Research Impact**
- Untuk Bab IV (error analysis), section metrics masih bisa diakses via:
  1. Database query langsung
  2. API endpoint khusus
  3. Export data untuk analisis offline

---

## 🧪 Testing Scenarios

### **Scenario 1: New Evaluation**
```
1. User buka halaman scenario
2. User klik "Test Evaluation"
3. User input reference text
4. User submit
5. ✅ Result page tampil dengan overall score
6. ✅ Tidak ada section selector
```

### **Scenario 2: View Historical Results**
```
1. User buka test results history
2. User klik salah satu result
3. ✅ Detail page tampil dengan overall score
4. ✅ Data section tidak ditampilkan
```

### **Scenario 3: Switch Between METEOR & Sentence-BERT**
```
1. User di result page
2. User klik tab "Sentence-BERT"
3. ✅ Overall score Sentence-BERT ditampilkan
4. ✅ Tidak ada section selector
```

---

## 📝 Checklist Implementasi

- [ ] Backup file TestResultsDetailPage.jsx
- [ ] Hardcode `selectedSection = 'semua'`
- [ ] Hapus section selector UI (baris 536-573)
- [ ] Update grid layout ke full width
- [ ] Simplify header label ke "Overall Score"
- [ ] Remove conditional section details (baris 1061)
- [ ] Test manual di browser
- [ ] Test dengan data real
- [ ] Verify responsive layout
- [ ] Commit changes dengan descriptive message
- [ ] Push ke repository
- [ ] Monitor deployment di Railway
- [ ] Verify production behavior

---

## 🚀 Deployment

```bash
# 1. Commit changes
git add aplikasi-klien/src/pages/TestResultsDetailPage.jsx
git commit -m "refactor(ui): simplify evaluation display"

# 2. Push ke main (auto-deploy ke Railway)
git push origin main

# 3. Monitor Railway logs
# Pastikan build success dan no runtime errors

# 4. Test di production
# Buka https://your-app.railway.app/test-results/:scenarioId
```

---

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Check Railway logs untuk error
2. Check browser console untuk frontend error
3. Verify API response masih include section metrics
4. Rollback jika perlu: `git revert HEAD`

---

**Dibuat:** 2026-05-10
**Versi:** 1.0
**Status:** Ready for Implementation
