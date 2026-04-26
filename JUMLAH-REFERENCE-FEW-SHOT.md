# Jumlah Reference Library dalam Few-Shot Prompting

## 📊 Jawaban Singkat

**Maksimal 3 reference library** digunakan dalam 1 kali generate Gherkin.

---

## 🔍 Detail Implementasi

### Lokasi Kode
File: `aplikasi-server/src/services/aiService.js`

### Kode yang Relevan

```javascript
// Build few-shot examples from references
let fewShotExamples = '';

if (references.length > 0) {
  fewShotExamples = '\n\nCONTOH REFERENSI (gunakan sebagai panduan format dan kualitas):\n\n';
  
  // Use up to 3 most relevant references
  references.slice(0, 3).forEach((ref, index) => {
    fewShotExamples += `Contoh ${index + 1}: ${ref.title}\n`;
    fewShotExamples += `${ref.gherkinContent}\n\n`;
  });
  
  fewShotExamples += 'PENTING: Gunakan contoh di atas sebagai panduan untuk membuat scenario yang berkualitas dan konsisten dengan standar perusahaan. Ikuti pola dan struktur yang sama.\n';
  
  console.log('✅ [AI-SERVICE] Few-shot examples added to prompt');
} else {
  console.log('⚠️ [AI-SERVICE] No references available for few-shot prompting');
}
```

**Baris kode kunci:** `references.slice(0, 3)`

---

## 📝 Penjelasan

### 1. **Jumlah Reference: 3**
- Sistem menggunakan **maksimal 3 reference** yang paling relevan
- Menggunakan method `slice(0, 3)` untuk membatasi jumlah reference

### 2. **Proses Seleksi**
```javascript
references.slice(0, 3).forEach((ref, index) => {
  fewShotExamples += `Contoh ${index + 1}: ${ref.title}\n`;
  fewShotExamples += `${ref.gherkinContent}\n\n`;
});
```

### 3. **Format dalam Prompt**
Reference ditambahkan ke prompt dengan format:
```
CONTOH REFERENSI (gunakan sebagai panduan format dan kualitas):

Contoh 1: [Judul Reference 1]
[Gherkin Content 1]

Contoh 2: [Judul Reference 2]
[Gherkin Content 2]

Contoh 3: [Judul Reference 3]
[Gherkin Content 3]

PENTING: Gunakan contoh di atas sebagai panduan untuk membuat scenario yang berkualitas dan konsisten dengan standar perusahaan. Ikuti pola dan struktur yang sama.
```

---

## 🎯 Alur Few-Shot Prompting

```
User Input (User Story)
    │
    ▼
Extract References dari Patterns
    │
    ▼
Ambil 3 Reference Teratas (slice(0, 3))
    │
    ▼
Format sebagai Few-Shot Examples
    │
    ▼
Tambahkan ke Prompt AI
    │
    ▼
AI Generate Gherkin dengan Panduan Reference
```

---

## 💡 Alasan Menggunakan 3 Reference

### Keuntungan:
1. **Cukup untuk Pembelajaran** - 3 contoh memberikan pola yang cukup untuk AI
2. **Tidak Overload** - Tidak membuat prompt terlalu panjang
3. **Efisien** - Balance antara kualitas dan performa
4. **Token Limit** - Menjaga agar tidak melebihi token limit LLM

### Trade-off:
- **Lebih dari 3**: Prompt terlalu panjang, biaya token tinggi
- **Kurang dari 3**: Pola kurang jelas untuk AI

---

## 📊 Konstanta Terkait

### Client Side (aplikasi-klien)
File: `aplikasi-klien/src/utils/constants/referenceConstants.js`

```javascript
PURPOSES: {
  FEW_SHOT_PROMPTING: 'few-shot-prompting',
  TEMPLATE: 'template',
  REFERENCE: 'reference'
}
```

### Default Limits
```javascript
DEFAULT_LIMITS: {
  BEST_REFERENCES: 5,  // Untuk getBestReferences()
  FORMATTED_REFERENCES: 3  // Untuk getFormattedReferences()
}
```

---

## 🔄 Metadata yang Disimpan

Setelah generate, sistem menyimpan metadata:

```javascript
metadata: {
  promptingMethod: usedReferences.length > 0 ? 'few-shot' : 'zero-shot',
  referenceCount: usedReferences.length
}
```

- **few-shot**: Jika ada reference (1-3 reference)
- **zero-shot**: Jika tidak ada reference (0 reference)

---

## 📈 Statistik

| Kondisi | Jumlah Reference | Metode |
|---------|------------------|--------|
| Ada reference tersedia | 1-3 | Few-shot |
| Tidak ada reference | 0 | Zero-shot |
| Maximum per generate | **3** | Few-shot |

---

## 🎓 Kesimpulan

**Jawaban:** Sistem menggunakan **maksimal 3 reference library** dalam 1 kali generate Gherkin untuk few-shot prompting.

Jumlah ini dipilih untuk:
- ✅ Memberikan contoh yang cukup untuk AI
- ✅ Menjaga efisiensi token
- ✅ Menghasilkan output berkualitas
- ✅ Konsisten dengan standar perusahaan
