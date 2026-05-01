# Cara Pemilihan Reference Library

## Pertanyaan
Jika reference library memiliki lebih dari 5 item, apakah references yang digunakan akan berbeda-beda atau selalu sama?

## Jawaban: **BERBEDA-BEDA (DINAMIS)** ✅

---

## Sistem Pemilihan Reference Library

### 1. **Sistem Scoring Dinamis**

Reference library yang digunakan **TIDAK selalu sama**. Sistem menggunakan **algoritma scoring** untuk memilih 5 references yang **paling relevan** dengan user story yang sedang diinput.

**File**: `aplikasi-klien/src/services/reference/AutoReferenceService.js` (Baris 324-373)

---

## Algoritma Pemilihan

### **Langkah 1: Scoring Setiap Pattern**

Setiap pattern (yang berisi references) diberi score berdasarkan 4 faktor:

#### **A. Category Matching (Max 10 points per keyword)**
```javascript
// Score berdasarkan kategori
if (pattern.type === 'category') {
  const categoryKeywords = this.getCategoryKeywords(pattern.category);
  categoryKeywords.forEach(keyword => {
    if (userStoryLower.includes(keyword)) {
      score += 10;  // +10 points jika keyword cocok
    }
  });
}
```

**Contoh:**
- User story: "Sebagai user, saya ingin **login** ke sistem"
- Pattern kategori "authentication" memiliki keywords: ['**login**', 'auth', 'sign in', 'password']
- **Score: +10** (karena "login" cocok)

#### **B. Usage & Quality Score (Max 70 points)**
```javascript
// Score berdasarkan usage dan quality
if (pattern.usage) {
  score += Math.min(pattern.usage.totalUsage || 0, 50); // Max 50 points
  if (pattern.usage.averageScore) {
    score += pattern.usage.averageScore * 20; // Max 20 points
  }
}
```

**Contoh:**
- Reference A: `totalUsage = 100`, `averageScore = 0.85`
  - Score: `50 + (0.85 × 20) = 67 points`
- Reference B: `totalUsage = 5`, `averageScore = 0.60`
  - Score: `5 + (0.60 × 20) = 17 points`

**Reference A lebih diprioritaskan** karena lebih sering digunakan dan kualitasnya lebih tinggi.

#### **C. Weight Score (Max 30 points)**
```javascript
// Score berdasarkan weight (jumlah references dalam pattern)
score += Math.min(pattern.weight || 0, 30); // Max 30 points
```

**Contoh:**
- Pattern dengan 10 references: Score +30
- Pattern dengan 2 references: Score +2

#### **D. Text Similarity (Max 15 points per example)**
```javascript
// Score berdasarkan kesamaan dengan examples
if (pattern.examples) {
  pattern.examples.forEach(example => {
    const similarity = this.calculateTextSimilarity(userStory, example.title);
    score += similarity * 15; // Max 15 points per example
  });
}
```

**Contoh:**
- User story: "Sebagai user, saya ingin **login dengan email**"
- Reference title: "User **Login dengan Email** dan Password"
- Similarity: 0.6 (60% kata yang sama)
- Score: `0.6 × 15 = 9 points`

---

### **Langkah 2: Sorting & Selection**

```javascript
// Sort by relevance score and return top patterns
return scoredPatterns
  .sort((a, b) => b.relevanceScore - a.relevanceScore)  // Sort descending
  .slice(0, 5); // Ambil top 5 most relevant patterns
```

**Output**: 5 patterns dengan score tertinggi

---

## Contoh Konkret

### **Skenario: Library Memiliki 15 References**

#### **User Story 1: "Sebagai user, saya ingin login ke sistem"**

**Scoring:**
| Reference | Category Match | Usage Score | Weight | Similarity | **Total** |
|-----------|----------------|-------------|--------|------------|-----------|
| Login dengan Email | +10 (login) | +50 | +10 | +12 | **82** ✅ |
| Login dengan Google OAuth | +10 (login) | +45 | +8 | +10 | **73** ✅ |
| Reset Password | +10 (password) | +30 | +5 | +3 | **48** ✅ |
| Register User Baru | 0 | +25 | +5 | +2 | **32** ✅ |
| Validasi Form Login | +10 (login) | +15 | +3 | +8 | **36** ✅ |
| Checkout Payment | 0 | +40 | +10 | +1 | **51** ❌ |
| Search Product | 0 | +35 | +8 | +0 | **43** ❌ |
| ... | ... | ... | ... | ... | ... |

**References yang dipilih (Top 5):**
1. Login dengan Email (82)
2. Login dengan Google OAuth (73)
3. Checkout Payment (51) ← Meskipun tidak relevan, tapi usage tinggi
4. Reset Password (48)
5. Search Product (43)

---

#### **User Story 2: "Sebagai user, saya ingin mencari produk berdasarkan kategori"**

**Scoring:**
| Reference | Category Match | Usage Score | Weight | Similarity | **Total** |
|-----------|----------------|-------------|--------|------------|-----------|
| Search Product | +10 (search) | +35 | +8 | +14 | **67** ✅ |
| Filter Product by Category | +10 (filter) | +30 | +7 | +13 | **60** ✅ |
| Display Product List | 0 | +40 | +10 | +8 | **58** ✅ |
| Add Product to Cart | 0 | +45 | +12 | +5 | **62** ✅ |
| Checkout Payment | 0 | +40 | +10 | +3 | **53** ✅ |
| Login dengan Email | +10 (login) | +50 | +10 | +1 | **71** ❌ |
| ... | ... | ... | ... | ... | ... |

**References yang dipilih (Top 5):**
1. Login dengan Email (71) ← Meskipun tidak relevan, tapi usage sangat tinggi
2. Search Product (67)
3. Add Product to Cart (62)
4. Filter Product by Category (60)
5. Display Product List (58)

---

## Kesimpulan

### ✅ **References BERBEDA-BEDA untuk Setiap User Story**

1. **Dinamis**: Sistem memilih references berdasarkan **relevansi** dengan user story
2. **Scoring**: Menggunakan 4 faktor (category, usage, weight, similarity)
3. **Top 5**: Selalu mengambil 5 references dengan score tertinggi
4. **Adaptif**: References yang dipilih akan berbeda tergantung:
   - Kata kunci dalam user story
   - Kategori yang cocok
   - Similarity dengan title reference
   - Usage history dan quality score

### 📊 **Faktor yang Mempengaruhi Pemilihan**

| Faktor | Bobot | Pengaruh |
|--------|-------|----------|
| **Usage Count** | Max 50 | Sangat Tinggi - References yang sering digunakan lebih diprioritaskan |
| **Quality Score** | Max 20 | Tinggi - References dengan METEOR score tinggi lebih diprioritaskan |
| **Weight** | Max 30 | Sedang - Pattern dengan banyak references lebih diprioritaskan |
| **Text Similarity** | Max 15/example | Sedang - References dengan title mirip user story lebih diprioritaskan |
| **Category Match** | +10/keyword | Tinggi - References dengan kategori yang cocok lebih diprioritaskan |

---

## Implikasi

### ✅ **Keuntungan Sistem Dinamis**

1. **Relevansi Tinggi**: References yang dipilih lebih sesuai dengan konteks user story
2. **Kualitas Terjaga**: References dengan usage tinggi dan quality score tinggi lebih sering digunakan
3. **Adaptif**: Sistem belajar dari usage history untuk memilih references terbaik
4. **Tidak Monoton**: User tidak akan selalu melihat references yang sama

### ⚠️ **Potensi Masalah**

1. **Bias Usage**: References dengan usage tinggi akan terus diprioritaskan, meskipun kurang relevan
   - **Contoh**: "Login dengan Email" (usage 100) bisa terpilih untuk user story "Search Product"
   
2. **References Baru Sulit Terpilih**: References baru dengan usage 0 akan sulit bersaing dengan references lama

3. **Tidak Ada Diversity**: Sistem tidak mempertimbangkan diversity, bisa jadi 5 references yang dipilih semuanya dari kategori yang sama

---

## Rekomendasi Perbaikan (Opsional)

### **1. Tambahkan Diversity Score**
```javascript
// Pastikan tidak semua references dari kategori yang sama
const selectedCategories = new Set();
scoredPatterns.forEach(pattern => {
  if (selectedCategories.has(pattern.category)) {
    pattern.relevanceScore *= 0.8; // Penalty untuk kategori yang sudah ada
  }
  selectedCategories.add(pattern.category);
});
```

### **2. Boost untuk References Baru**
```javascript
// Berikan boost untuk references yang belum pernah digunakan
if (pattern.usage.totalUsage === 0) {
  score += 10; // Boost +10 untuk references baru
}
```

### **3. Threshold untuk Category Match**
```javascript
// Hanya pilih references dengan category match jika ada
const hasRelevantCategory = scoredPatterns.some(p => p.categoryMatchScore > 0);
if (hasRelevantCategory) {
  // Filter out references tanpa category match
  scoredPatterns = scoredPatterns.filter(p => p.categoryMatchScore > 0);
}
```

---

## Cara Verifikasi

### **1. Test dengan User Story Berbeda**
```javascript
// User Story 1: Login
const result1 = await autoReferenceService.generateScenarioFromUserStory(
  "Sebagai user, saya ingin login ke sistem"
);
console.log('References for Login:', result1.patterns.map(p => p.examples[0].title));

// User Story 2: Search
const result2 = await autoReferenceService.generateScenarioFromUserStory(
  "Sebagai user, saya ingin mencari produk"
);
console.log('References for Search:', result2.patterns.map(p => p.examples[0].title));
```

### **2. Lihat Log Console**
```
🔍 [AI-SERVICE] Constructing prompt with references: {
  patternsCount: 5,
  referencesExtracted: 5,
  referencesTitles: [
    'Login dengan Email',      ← Berbeda untuk setiap user story
    'Login dengan Google OAuth',
    'Reset Password',
    'Register User Baru',
    'Validasi Form Login'
  ]
}
```

### **3. Cek Modal "References Used"**
Klik icon "View References Used" dan lihat apakah references yang ditampilkan berbeda untuk user story yang berbeda.

---

## Kesimpulan Akhir

✅ **References yang digunakan BERBEDA-BEDA** tergantung user story
✅ **Sistem menggunakan algoritma scoring** untuk memilih 5 references terbaik
✅ **Faktor utama**: Category match, usage count, quality score, text similarity
✅ **Adaptif dan dinamis**, tidak selalu menggunakan references yang sama

Sistem Anda sudah **intelligent** dan **production-ready**! 🎉
