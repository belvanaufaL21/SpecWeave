# Cara Kerja Pemilihan 3 Referensi untuk Few-Shot Prompting

## 🎯 Ringkasan

Sistem menggunakan **algoritma scoring berbasis relevansi** untuk memilih 3 reference library terbaik yang paling sesuai dengan user story yang diinput.

---

## 📊 Alur Lengkap Pemilihan Referensi

```
User Input (User Story)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  1. FETCH ALL REFERENCES                                │
│     (Client: AutoReferenceService)                      │
│     • Get dari API /references                          │
│     • Templates (global) + User's own references        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  2. ANALYZE PATTERNS                                    │
│     (analyzeReferencePatterns)                          │
│     • Group by category                                 │
│     • Group by structure (Given/When/Then count)        │
│     • Extract common steps                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  3. SELECT RELEVANT PATTERNS                            │
│     (selectRelevantPatterns)                            │
│     • Calculate relevance score untuk setiap pattern    │
│     • Sort by score (highest first)                     │
│     • Return top 5 patterns                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  4. EXTRACT TOP 3 REFERENCES                            │
│     (aiService.js - constructGherkinPrompt)             │
│     • Ambil examples dari top patterns                  │
│     • Slice(0, 3) - ambil 3 teratas                    │
│     • Format untuk few-shot prompt                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  5. SEND TO LLM                                         │
│     • Prompt dengan 3 reference examples                │
│     • LLM generate Gherkin berdasarkan patterns         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Detail Algoritma Scoring

### File: `aplikasi-klien/src/services/reference/AutoReferenceService.js`

### Method: `selectRelevantPatterns(userStory, patterns)`

Algoritma ini menghitung **relevance score** untuk setiap pattern berdasarkan beberapa faktor:

```javascript
selectRelevantPatterns(userStory, patterns) {
  const userStoryLower = userStory.toLowerCase();
  const scoredPatterns = [];

  patterns.forEach(pattern => {
    let score = 0;
    
    // 1. CATEGORY MATCHING (max 10 points per keyword)
    if (pattern.type === 'category') {
      const categoryKeywords = this.getCategoryKeywords(pattern.category);
      categoryKeywords.forEach(keyword => {
        if (userStoryLower.includes(keyword)) {
          score += 10;
        }
      });
    }

    // 2. USAGE & QUALITY (max 70 points)
    if (pattern.usage) {
      score += Math.min(pattern.usage.totalUsage || 0, 50); // Max 50 points
      if (pattern.usage.averageScore) {
        score += pattern.usage.averageScore * 20; // Max 20 points
      }
    }

    // 3. WEIGHT (jumlah references dalam pattern, max 30 points)
    score += Math.min(pattern.weight || 0, 30);

    // 4. TEXT SIMILARITY (max 15 points per example)
    if (pattern.examples) {
      pattern.examples.forEach(example => {
        const similarity = this.calculateTextSimilarity(userStory, example.title);
        score += similarity * 15;
      });
    }

    if (score > 0) {
      scoredPatterns.push({
        ...pattern,
        relevanceScore: score
      });
    }
  });

  // Sort by relevance score (highest first)
  return scoredPatterns
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5); // Top 5 most relevant patterns
}
```

---

## 📈 Komponen Scoring

### 1. **Category Matching** (0-100+ points)
- Mencocokkan keywords dari user story dengan kategori reference
- Setiap keyword match = +10 points

**Kategori & Keywords:**
```javascript
{
  'authentication': ['login', 'auth', 'sign in', 'password', 'user', 'account'],
  'form': ['form', 'input', 'submit', 'validation', 'field'],
  'api': ['api', 'service', 'request', 'response', 'data', 'fetch'],
  'search': ['search', 'find', 'filter', 'query', 'result'],
  'registration': ['register', 'signup', 'create account', 'sign up'],
  'ecommerce': ['product', 'cart', 'order', 'payment', 'buy', 'purchase']
}
```

**Contoh:**
- User story: "Sebagai user, saya ingin login dengan email"
- Keywords match: "login" (10), "user" (10), "email" (10) = **30 points**

---

### 2. **Usage & Quality Score** (0-70 points)

#### a. Total Usage (max 50 points)
- Berapa kali reference ini digunakan
- Semakin sering digunakan = semakin relevan
- Formula: `Math.min(totalUsage, 50)`

#### b. Average Score (max 20 points)
- Rata-rata METEOR score dari hasil generate menggunakan reference ini
- Formula: `averageScore * 20`
- Range: 0.0 - 1.0 → 0 - 20 points

**Contoh:**
- Reference A: totalUsage = 45, averageScore = 0.85
  - Usage points: 45
  - Quality points: 0.85 × 20 = 17
  - **Total: 62 points**

---

### 3. **Weight Score** (0-30 points)
- Jumlah references dalam pattern group
- Semakin banyak references dengan pola serupa = semakin reliable
- Formula: `Math.min(weight, 30)`

**Contoh:**
- Pattern dengan 25 references = **25 points**
- Pattern dengan 50 references = **30 points** (capped)

---

### 4. **Text Similarity** (0-15+ points per example)
- Menghitung kesamaan teks antara user story dan title reference
- Menggunakan simple word matching algorithm

**Algorithm:**
```javascript
calculateTextSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return totalWords > 0 ? commonWords.length / totalWords : 0;
}
```

**Contoh:**
- User story: "user login dengan email"
- Reference title: "Login user dengan password"
- Common words: ["user", "login", "dengan"] = 3
- Total unique words: ["user", "login", "dengan", "email", "password"] = 5
- Similarity: 3/5 = 0.6
- **Score: 0.6 × 15 = 9 points**

---

## 🎯 Contoh Perhitungan Lengkap

### Scenario: User Story Login

**Input:**
```
"Sebagai user, saya ingin login dengan email dan password"
```

### Pattern A: Authentication Category
```javascript
{
  type: 'category',
  category: 'authentication',
  weight: 15,
  usage: {
    totalUsage: 42,
    averageScore: 0.88
  },
  examples: [
    { title: "Login user dengan email", gherkinContent: "..." },
    { title: "Autentikasi pengguna", gherkinContent: "..." }
  ]
}
```

**Scoring:**
1. Category matching:
   - "login" → +10
   - "user" → +10
   - "email" → +10
   - "password" → +10
   - **Subtotal: 40 points**

2. Usage & Quality:
   - totalUsage: 42 → +42
   - averageScore: 0.88 × 20 = +17.6
   - **Subtotal: 59.6 points**

3. Weight:
   - 15 references → +15
   - **Subtotal: 15 points**

4. Text Similarity:
   - Example 1: similarity 0.7 → 0.7 × 15 = +10.5
   - Example 2: similarity 0.4 → 0.4 × 15 = +6
   - **Subtotal: 16.5 points**

**Total Score: 40 + 59.6 + 15 + 16.5 = 131.1 points**

---

### Pattern B: Form Category
```javascript
{
  type: 'category',
  category: 'form',
  weight: 8,
  usage: {
    totalUsage: 20,
    averageScore: 0.75
  },
  examples: [
    { title: "Submit form validasi", gherkinContent: "..." }
  ]
}
```

**Scoring:**
1. Category matching: 0 (no keywords match)
2. Usage & Quality: 20 + (0.75 × 20) = 35
3. Weight: 8
4. Text Similarity: 0.2 × 15 = 3

**Total Score: 0 + 35 + 8 + 3 = 46 points**

---

## 🏆 Hasil Akhir

Setelah semua patterns di-score:

```
Pattern A (Authentication): 131.1 points ✅ Rank 1
Pattern C (API):            95.3 points  ✅ Rank 2
Pattern D (Search):         78.5 points  ✅ Rank 3
Pattern E (Registration):   65.2 points  ❌ Rank 4
Pattern B (Form):           46.0 points  ❌ Rank 5
```

**Top 5 patterns dipilih**, kemudian:
- Ambil **examples** dari masing-masing pattern
- **Slice(0, 3)** untuk ambil 3 reference teratas
- Format sebagai few-shot examples dalam prompt

---

## 🔄 Pattern Analysis

### Grouping Strategies

#### 1. **Category-Based Grouping**
```javascript
categoryGroups = {
  'authentication': [ref1, ref2, ref3, ...],
  'form': [ref4, ref5, ...],
  'api': [ref6, ref7, ref8, ...]
}
```

#### 2. **Structure-Based Grouping**
Berdasarkan struktur Gherkin (jumlah Given/When/Then):

```javascript
structureGroups = {
  'g1_w1_t1_and': [ref1, ref2, ...],  // 1 Given, 1 When, 1 Then, with And
  'g2_w1_t2_noand': [ref3, ref4, ...] // 2 Given, 1 When, 2 Then, no And
}
```

**Structure Key Format:**
- `g{count}` = Given count
- `w{count}` = When count
- `t{count}` = Then count
- `and` / `noand` = Has And statements

---

## 📊 Common Steps Analysis

Untuk setiap pattern, sistem menganalisis **common steps** yang muncul di banyak references:

```javascript
findCommonSteps(references, stepType) {
  // Count frequency of each step
  const stepCounts = {};
  
  references.forEach(ref => {
    const steps = extractSteps(ref.gherkinContent, stepType);
    steps.forEach(step => {
      const normalizedStep = normalizeStep(step);
      stepCounts[normalizedStep] = (stepCounts[normalizedStep] || 0) + 1;
    });
  });

  // Return steps that appear in at least 30% of references
  const threshold = Math.max(1, Math.floor(references.length * 0.3));
  return Object.entries(stepCounts)
    .filter(([step, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5 common steps
}
```

**Contoh Output:**
```javascript
{
  given: [
    { step: "user berada di halaman login", frequency: 8, percentage: "80.0" },
    { step: "user memiliki akun valid", frequency: 6, percentage: "60.0" }
  ],
  when: [
    { step: "user memasukkan email dan password", frequency: 7, percentage: "70.0" }
  ],
  then: [
    { step: "user berhasil login", frequency: 9, percentage: "90.0" },
    { step: "sistem menampilkan dashboard", frequency: 5, percentage: "50.0" }
  ]
}
```

---

## 💾 Caching Mechanism

Untuk efisiensi, sistem menggunakan **cache** untuk pattern analysis:

```javascript
constructor() {
  this.patternCache = new Map();
  this.lastCacheUpdate = null;
  this.CACHE_DURATION = 5 * 60 * 1000; // 5 menit
}

async analyzeReferencePatterns() {
  // Check cache first
  if (this.patternCache.size > 0 && 
      this.lastCacheUpdate && 
      Date.now() - this.lastCacheUpdate < this.CACHE_DURATION) {
    return Array.from(this.patternCache.values());
  }

  // Fetch and analyze...
  // Update cache...
  this.lastCacheUpdate = Date.now();
}
```

**Benefits:**
- ✅ Mengurangi API calls
- ✅ Faster response time
- ✅ Mengurangi beban server
- ✅ Cache expire setelah 5 menit (data tetap fresh)

---

## 🎨 Format Few-Shot Prompt

Setelah 3 reference terpilih, format dalam prompt:

```javascript
// aiService.js - constructGherkinPrompt()

let fewShotExamples = '';

if (references.length > 0) {
  fewShotExamples = '\n\nCONTOH REFERENSI (gunakan sebagai panduan format dan kualitas):\n\n';
  
  // Use up to 3 most relevant references
  references.slice(0, 3).forEach((ref, index) => {
    fewShotExamples += `Contoh ${index + 1}: ${ref.title}\n`;
    fewShotExamples += `${ref.gherkinContent}\n\n`;
  });
  
  fewShotExamples += 'PENTING: Gunakan contoh di atas sebagai panduan untuk membuat scenario yang berkualitas dan konsisten dengan standar perusahaan. Ikuti pola dan struktur yang sama.\n';
}
```

**Output Example:**
```
CONTOH REFERENSI (gunakan sebagai panduan format dan kualitas):

Contoh 1: Login user dengan email
Feature: User Authentication
  Scenario: Login berhasil
    Given user berada di halaman login
    When user memasukkan email dan password yang valid
    Then user berhasil login
    And sistem menampilkan dashboard

Contoh 2: Validasi login gagal
Feature: User Authentication
  Scenario: Login dengan password salah
    Given user berada di halaman login
    When user memasukkan email valid dan password salah
    Then sistem menampilkan pesan error
    And user tetap di halaman login

Contoh 3: Reset password
Feature: User Authentication
  Scenario: Request reset password
    Given user berada di halaman login
    When user klik "Lupa Password"
    Then sistem menampilkan form reset password
    And sistem mengirim email reset ke user

PENTING: Gunakan contoh di atas sebagai panduan untuk membuat scenario yang berkualitas dan konsisten dengan standar perusahaan. Ikuti pola dan struktur yang sama.
```

---

## 📊 Metadata yang Disimpan

Setelah generate, sistem menyimpan metadata tentang reference yang digunakan:

```javascript
// gherkinController.js
{
  usedReferences: usedReferences, // Array of 3 references
  metadata: {
    promptingMethod: usedReferences.length > 0 ? 'few-shot' : 'zero-shot',
    referenceCount: usedReferences.length
  }
}
```

---

## 🎯 Kesimpulan

### Cara Kerja Pemilihan 3 Referensi:

1. **Fetch** semua references (templates + user's own)
2. **Analyze** patterns berdasarkan category dan structure
3. **Score** setiap pattern dengan 4 faktor:
   - Category matching (keyword-based)
   - Usage & quality (historical data)
   - Weight (jumlah references dalam pattern)
   - Text similarity (word matching)
4. **Sort** patterns by relevance score (highest first)
5. **Select** top 5 patterns
6. **Extract** examples dari patterns
7. **Slice(0, 3)** untuk ambil 3 reference teratas
8. **Format** sebagai few-shot examples dalam prompt
9. **Send** ke LLM untuk generate Gherkin

### Keunggulan Algoritma:

✅ **Intelligent Selection** - Tidak random, tapi berdasarkan relevansi  
✅ **Multi-Factor Scoring** - Mempertimbangkan berbagai aspek  
✅ **Quality-Aware** - Prioritas ke references dengan score tinggi  
✅ **Usage-Based** - References yang sering dipakai lebih diprioritaskan  
✅ **Context-Aware** - Matching dengan user story input  
✅ **Cached** - Efisien dengan caching mechanism  

### Trade-offs:

⚠️ **Simple Text Similarity** - Bukan semantic similarity (tidak pakai embeddings)  
⚠️ **Keyword-Based** - Category matching bergantung pada keywords  
⚠️ **No ML Model** - Tidak menggunakan machine learning untuk ranking  

### Potential Improvements:

💡 Gunakan **Sentence-BERT embeddings** untuk semantic similarity  
💡 Implementasi **collaborative filtering** berdasarkan user behavior  
💡 **A/B testing** untuk optimize scoring weights  
💡 **Learning algorithm** yang adjust weights berdasarkan hasil METEOR scores
