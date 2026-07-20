import dotenv from 'dotenv';
import { detectConnextraFormat } from './formatDetectionService.js';
import llmProviderService from './llmProviderService.js';

dotenv.config();

export const convertToGherkin = async (userStory, options = {}) => {
  try {
    // ============================================================
    // TAHAP 1: FORMAT DETECTION (CEK APAKAH INPUT CONNEXTRA)
    // ============================================================
    const inputForDetection = options.originalInput || userStory;
    
    // Detect input format on ORIGINAL user input (not enhanced prompt)
    const formatDetection = detectConnextraFormat(inputForDetection);
    
    // Log format detection for debugging
    console.log('🔍 [AI-SERVICE] Format detection:', {
      input: inputForDetection.substring(0, 50) + '...',
      isConnextra: formatDetection.isConnextra,
      confidence: formatDetection.confidence,
      matchedComponents: formatDetection.matchedComponents,
      analysis: formatDetection.analysis
    });
    
    // ============================================================
    // TAHAP 2: TENTUKAN JENIS PROMPT BERDASARKAN FORMAT
    // ============================================================
    let prompt;
    let responseType;
    
    // Stricter threshold: require at least 2 components (role + want) with 0.8 confidence
    const meetsThreshold = formatDetection.isConnextra && 
                          formatDetection.confidence >= 0.8 &&
                          formatDetection.matchedComponents.length >= 2;
    
    if (meetsThreshold) {
      // ✅ CONNEXTRA FORMAT - Generate Gherkin scenarios
      console.log('✅ [AI-SERVICE] Detected as Connextra format - generating Gherkin');
      prompt = constructGherkinPrompt(userStory, options.references);
      responseType = 'gherkin';
    } else {
      // ❌ NON-CONNEXTRA FORMAT - General LLM response
      console.log('❌ [AI-SERVICE] Not Connextra format - returning general response');
      prompt = constructGeneralPrompt(inputForDetection); // Use original input for general response
      responseType = 'general';
    }
    
    // ============================================================
    // TAHAP 3: PREPARE MESSAGES UNTUK LLM
    // ============================================================
    // CATATAN: Di tahap ini sudah ditentukan apakah akan generate
    // Gherkin atau general response
    //
    // 🔵 PROMPT 1: SYSTEM MESSAGE (Instruksi untuk LLM)
    // Lokasi: aiService.js - Tahap 3
    // Tujuan: Memberikan instruksi kepada LLM tentang peran dan format output
    // Kondisi: 
    // - Jika responseType === 'gherkin': Instruksi untuk generate JSON Gherkin lengkap
    // - Jika responseType === 'general': Instruksi untuk respons singkat mengarahkan user
    const messages = [
      {
        role: "system",
        content: responseType === 'gherkin' 
          ? "Anda adalah ahli Product Manager yang sangat berpengalaman dalam membuat spesifikasi fitur dan skenario Gherkin dalam bahasa Indonesia. PENTING: Berikan output yang LENGKAP dan DETAIL, bukan hanya kerangka atau skeleton. Setiap field harus diisi dengan konten yang spesifik dan relevan. Selalu berikan output dalam format JSON yang valid tanpa markdown atau penjelasan tambahan."
          : "Berikan respons yang sangat singkat dan langsung. Maksimal 2 kalimat. Arahkan pengguna untuk menggunakan format User Story Connextra. Gunakan bahasa Indonesia yang sederhana."
      },
      // 🔵 PROMPT 2: USER MESSAGE (Konten utama yang akan diproses)
      // Lokasi: aiService.js - Tahap 3
      // Tujuan: Berisi prompt yang sudah dibentuk dari constructGherkinPrompt() atau constructGeneralPrompt()
      // Kondisi:
      // - Jika responseType === 'gherkin': Prompt berisi user story + instruksi JSON + few-shot examples
      // - Jika responseType === 'general': Prompt berisi input user + instruksi respons singkat
      {
        role: "user",
        content: prompt,
      },
    ];

    let text;

    // PENGECEKAN PROVIDER & LIMIT MODEL: Validasi keberadaan provider dan model
    // Provider dan model name harus ada, jika tidak ada akan error
    if (!options.provider || !options.modelName) {
      throw new Error('Provider dan model name harus disediakan. Groq tidak lagi didukung.');
    }

    console.log('🔄 [AI-SERVICE] Using provider abstraction:', {
      provider: options.provider,
      model: options.modelName
    });
    
    // ============================================================
    // TAHAP 5: PANGGIL LLM PROVIDER SERVICE
    // ============================================================
    // CATATAN: Ini adalah eksekusi sebenarnya ke LLM
    // Jika user belum login atau limit habis, akan error di middleware
    try {
      // 🔵 EKSEKUSI PROMPT KE LLM
      // Lokasi: aiService.js - Tahap 5
      // Fungsi: llmProviderService.generateCompletion()
      // Parameter:
      // - modelName: Nama model (e.g., 'meta-llama/llama-3.3-70b-instruct')
      // - provider: Provider name (e.g., 'openrouter')
      // - messages: Array berisi system message dan user message dengan prompt
      // Output: {text, tokensInput, tokensOutput}
      // 
      // PENGECEKAN PROVIDER & LIMIT MODEL: Panggil LLM dengan provider dan model yang sudah divalidasi
      const response = await llmProviderService.generateCompletion(
        options.modelName,
        options.provider,
        messages
      );
      
      text = response.text;
      
      console.log('✅ [AI-SERVICE] LLM response received:', {
        provider: options.provider,
        model: options.modelName,
        textLength: text.length,
        tokensInput: response.tokensInput,
        tokensOutput: response.tokensOutput
      });
      
      // Store usage and model info for later use
      const usageInfo = {
        prompt_tokens: response.tokensInput || 0,
        completion_tokens: response.tokensOutput || 0,
        total_tokens: (response.tokensInput || 0) + (response.tokensOutput || 0)
      };
      
      const modelInfo = {
        name: options.modelName,
        provider: options.provider
      };
      
      // Store in options for access in return statements
      options._usage = usageInfo;
      options._model = modelInfo;
      
    } catch (providerError) {
      console.error('❌ [AI-SERVICE] Provider error:', {
        provider: options.provider,
        model: options.modelName,
        error: providerError.message
      });
      throw providerError;
    }

    // ============================================================
    // TAHAP 6: PROSES & FORMAT RESPONSE BERDASARKAN TIPE
    // ============================================================
    if (responseType === 'gherkin') {
      // Process Gherkin JSON response
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1) {
        const cleanJson = text.substring(firstBrace, lastBrace + 1);
        return {
          type: 'gherkin',
          content: cleanJson,
          formatDetection,
          isConnextra: true,
          usage: options._usage || null,
          model: options._model?.name || null
        };
      } else {
        console.warn("⚠️ Warning: AI tidak mengembalikan format JSON yang valid.");
        return {
          type: 'gherkin',
          content: text,
          formatDetection,
          isConnextra: true,
          usage: options._usage || null,
          model: options._model?.name || null
        };
      }
    } else {
      // Return general response as-is
      return {
        type: 'general',
        content: text,
        formatDetection,
        isConnextra: false,
        usage: options._usage || null,
        model: options._model?.name || null
      };
    }

  } catch (error) {
    console.error("❌ AI Service Error:", error);
    throw new Error("Gagal memproses transformasi AI. Cek koneksi atau konfigurasi LLM provider.");
  }
};

/**
 * 🔵 PROMPT BUILDER: GHERKIN PROMPT (Few-shot/Zero-shot)
 * Lokasi: aiService.js - constructGherkinPrompt()
 * Tujuan: Membentuk prompt lengkap untuk generate Gherkin JSON
 * Input:
 * - userStory: User story dalam format Connextra
 * - patterns: Array references untuk few-shot prompting
 * Output: String prompt lengkap dengan instruksi + examples + user story
 * 
 * Prompt Engineering untuk menghasilkan JSON Terstruktur dengan llm dalam Bahasa Indonesia
 * Digunakan untuk input format Connextra (user story)
 * @param {string} userStory - User story input
 * @param {Array} patterns - Array of patterns with examples for few-shot prompting
 */
function constructGherkinPrompt(userStory, patterns = []) {
  // PENGECEKAN REFERENCE LIBRARY: Ekstrak references dari patterns
  let references = [];
  
  if (patterns && patterns.length > 0) {
    patterns.forEach(pattern => {
      if (pattern.examples && Array.isArray(pattern.examples)) {
        references = references.concat(pattern.examples);
      }
    });
  }
  
  console.log('🔍 [AI-SERVICE] Constructing prompt with references:', {
    patternsCount: patterns.length,
    referencesExtracted: references.length,
    referencesTitles: references.map(r => r.title)
  });
  
  // PENGECEKAN REFERENCE LIBRARY: Hapus duplikat berdasarkan title dan content
  const uniqueReferences = [];
  const seenKeys = new Set();
  
  references.forEach(ref => {
    // Create unique key from title + first 100 chars of content
    const uniqueKey = `${ref.title}_${ref.gherkinContent.substring(0, 100)}`;
    if (!seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      uniqueReferences.push(ref);
    }
  });
  
  references = uniqueReferences;
  
  console.log('🔍 [AI-SERVICE] After deduplication:', {
    uniqueReferencesCount: references.length,
    uniqueTitles: references.map(r => r.title)
  });
  
  // PENGECEKAN REFERENCE LIBRARY: Pilih maksimal 5 references untuk few-shot prompting
  // References sudah di-shuffle di frontend, langsung gunakan
  const maxReferences = Math.min(references.length, 5);
  const selectedReferences = references.slice(0, maxReferences);
  
  // PENGECEKAN REFERENCE LIBRARY: Build few-shot examples dari references
  let fewShotExamples = '';
  
  // 🔵 PROMPT DECISION: FEW-SHOT vs ZERO-SHOT
  // Lokasi: aiService.js - constructGherkinPrompt() - Decision Point
  // Kondisi:
  // - selectedReferences.length > 0 → FEW-SHOT (dengan contoh INPUT-OUTPUT pairs)
  // - selectedReferences.length === 0 → ZERO-SHOT (tanpa contoh)
  // 
  // PERBEDAAN PROMPT:
  // FEW-SHOT: Prompt berisi section "CONTOH REFERENSI" dengan 1-5 contoh nyata (INPUT + OUTPUT)
  // ZERO-SHOT: Prompt TIDAK berisi section "CONTOH REFERENSI", hanya instruksi dasar
  //
  // PENGECEKAN REFERENCE LIBRARY: Jika ada references, tambahkan ke prompt sebagai few-shot examples
  if (selectedReferences.length > 0) {
    // 🔵 PROMPT TYPE: FEW-SHOT PROMPTING
    // Menambahkan section "CONTOH REFERENSI" ke prompt
    // Berisi 1-5 contoh nyata dari reference library dengan INPUT-OUTPUT pairs
    
    // Opening: Instruksi tentang cara menggunakan contoh
    fewShotExamples = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    fewShotExamples += '⚠️ PENTING TENTANG CONTOH REFERENSI:\n';
    fewShotExamples += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    fewShotExamples += 'Contoh-contoh berikut HANYA untuk pembelajaran pola transformasi:\n';
    fewShotExamples += '• ✅ BOLEH: Pelajari struktur, tingkat detail, dan pola INPUT → OUTPUT\n';
    fewShotExamples += '• ❌ DILARANG: Menyalin kalimat atau frasa dari contoh secara langsung\n';
    fewShotExamples += '• ✅ WAJIB: Buat redaksi sendiri yang 100% sesuai konteks user story baru\n\n';
    
    // Examples Section
    fewShotExamples += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    fewShotExamples += '📚 CONTOH REFERENSI (Pelajari pola transformasi INPUT → OUTPUT):\n';
    fewShotExamples += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    
    selectedReferences.forEach((ref, index) => {
      fewShotExamples += `═══════════════════════════════════════════════════════════\n`;
      fewShotExamples += `📋 CONTOH ${index + 1}: ${ref.title}\n`;
      fewShotExamples += `═══════════════════════════════════════════════════════════\n\n`;
      
      // Add INPUT (User Story) if available
      if (ref.userStory && ref.userStory.trim()) {
        fewShotExamples += `📥 INPUT (User Story Asli):\n`;
        fewShotExamples += `"${ref.userStory.trim()}"\n\n`;
      } else {
        // Fallback if no user story (backward compatibility)
        fewShotExamples += `📥 INPUT (User Story):\n`;
        fewShotExamples += `⚠️ User story tidak tersedia untuk contoh ini (data lama)\n\n`;
      }
      
      // Add OUTPUT (Gherkin Content)
      fewShotExamples += `📤 OUTPUT (JSON Gherkin yang Dihasilkan):\n`;
      fewShotExamples += `${ref.gherkinContent}\n\n`;
      
      fewShotExamples += `═══════════════════════════════════════════════════════════\n\n`;
    });
    
    // Closing: Summary of learning points
    fewShotExamples += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    fewShotExamples += '⚡ RANGKUMAN PEMBELAJARAN:\n';
    fewShotExamples += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    fewShotExamples += 'Dari contoh-contoh di atas, perhatikan:\n';
    fewShotExamples += '1. Bagaimana user story (INPUT) ditransformasi menjadi JSON terstruktur (OUTPUT)\n';
    fewShotExamples += '2. Tingkat kedetailan di field given/when/then (kalimat lengkap, bukan poin singkat)\n';
    fewShotExamples += '3. Spesifisitas development tasks (actionable, bukan template generik)\n';
    fewShotExamples += '4. Kualitas bahasa Indonesia yang profesional dan jelas\n\n';
    fewShotExamples += 'PENTING: Ikuti standar kualitas yang sama, tetapi gunakan kata-kata Anda\n';
    fewShotExamples += 'sendiri yang spesifik untuk user story baru di bawah ini.\n\n';
    
    console.log(`✅ [AI-SERVICE] Few-shot prompting enabled with INPUT-OUTPUT pairs (${selectedReferences.length} references)`);
    
    // Log detail untuk debugging
    const referencesWithUserStory = selectedReferences.filter(ref => ref.userStory && ref.userStory.trim());
    console.log(`   📊 References with user story: ${referencesWithUserStory.length}/${selectedReferences.length}`);
    if (referencesWithUserStory.length < selectedReferences.length) {
      console.log(`   ⚠️  ${selectedReferences.length - referencesWithUserStory.length} references missing user story (backward compatibility)`);
    }
    
  } else {
    // 🔵 PROMPT TYPE: ZERO-SHOT PROMPTING
    // TIDAK menambahkan section "CONTOH REFERENSI"
    // Prompt hanya berisi instruksi dasar tanpa contoh dari reference library
    // PENGECEKAN REFERENCE LIBRARY: Jika tidak ada references, gunakan zero-shot prompting
    console.log('⚠️ [AI-SERVICE] Zero-shot prompting (no references available)');
  }
  
  // 🔵 PROMPT CONTENT: GHERKIN GENERATION (v2.0 - Improved with Better Structure)
  // Lokasi: aiService.js - constructGherkinPrompt() - return statement
  // Tujuan: Template prompt lengkap untuk generate Gherkin JSON
  // Komponen:
  // 1. Role definition (Product Manager & QA Lead)
  // 2. Output format requirement (JSON valid)
  // 3. Scenario requirements (3 scenarios: Happy Path, Edge Case, Alternative Flow)
  // 4. Development tasks requirement (6-8 tasks dengan role BE/FE/UI/QA)
  // 5. Few-shot examples (jika ada references dengan INPUT-OUTPUT pairs)
  // 6. User story input dengan highlight
  return `Anda adalah Senior Product Manager & QA Lead yang berpengalaman menyusun spesifikasi fitur, acceptance criteria, dan skenario Gherkin dalam bahasa Indonesia.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TUGAS ANDA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analisis satu user story dan hasilkan spesifikasi fitur lengkap dalam format JSON yang valid, tanpa markdown maupun penjelasan tambahan. Setiap field wajib diisi dengan konten spesifik dan detail berdasarkan konteks user story yang diberikan, bukan kerangka atau placeholder kosong.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 PERSYARATAN FORMAT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. FORMAT KELUARAN
   • Keluaran harus berupa JSON valid saja (tanpa markdown, tanpa code block, tanpa penjelasan)
   • Ikuti struktur JSON yang ditentukan di bagian akhir instruksi ini

2. SKENARIO GHERKIN (3 skenario wajib)
   • Buat tepat 3 skenario dengan urutan tetap:
     - Scenario 1: Happy Path (alur normal/sukses)
     - Scenario 2: Edge Case (kondisi batas/error)
     - Scenario 3: Alternative Flow (alur alternatif)
   • Field "type" harus persis salah satu dari tiga label di atas
   • Field "title" berisi deskripsi singkat dan spesifik (contoh: "Login Berhasil")
   • Field given/when/then masing-masing berupa kalimat lengkap yang menjelaskan kondisi, aksi, dan hasil secara spesifik

3. DEVELOPMENT TASKLIST (6-8 tasks wajib)
   • Komposisi minimal: 2 task BE, 2 task FE, 1 task UI/UX, 2 task QA
   • Setiap task memiliki:
     - role: "BE", "FE", "UI/UX", atau "QA"
     - description: spesifik dan actionable sesuai konteks user story
     - priority: "High", "Medium", atau "Low"
     - status: selalu "To Do"

4. KUALITAS BAHASA & KONTEN
   • Gunakan bahasa Indonesia yang profesional dan jelas
   • Tulis given/when/then dalam sudut pandang orang ketiga untuk menghindari ambiguitas
   • Gunakan terminologi bisnis yang konsisten, hindari jargon teknis implementasi (mis. nama variabel, nama tabel database)
   • Fokus pada satu aksi dan satu hasil yang jelas per langkah, hindari pengulangan informasi yang tidak perlu
   • Description fitur menjelaskan nilai bisnis dan fungsi fitur dalam 2-3 kalimat
   • Field "userStory" berisi teks user story asli, dipertahankan persis seperti yang diberikan
${fewShotExamples}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TUGAS ANDA SEKARANG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User Story yang akan dianalisis:
"${userStory}"

Struktur JSON yang Diperlukan:
{
  "feature": "Nama Fitur (Judul Pendek & Profesional)",
  "description": "Deskripsi detail 2-3 kalimat yang menjelaskan fungsi fitur, nilai bisnis, dan manfaatnya dalam bahasa Indonesia yang profesional.",
  "userStory": "User story asli yang diberikan (tetap dalam bahasa asli)",
  "scenarios": [
    {
      "type": "Happy Path",
      "title": "Deskripsi singkat scenario (contoh: 'Login Berhasil')",
      "given": "Kondisi awal yang spesifik dan jelas dalam bahasa Indonesia",
      "when": "Aksi yang dilakukan user/sistem dalam bahasa Indonesia",
      "then": "Hasil yang diharapkan secara detail dalam bahasa Indonesia"
    },
    {
      "type": "Edge Case",
      "title": "Deskripsi singkat scenario (contoh: 'Password Salah')",
      "given": "Kondisi awal yang spesifik dan jelas dalam bahasa Indonesia",
      "when": "Aksi yang dilakukan user/sistem dalam bahasa Indonesia",
      "then": "Hasil yang diharapkan secara detail dalam bahasa Indonesia"
    },
    {
      "type": "Alternative Flow",
      "title": "Deskripsi singkat scenario (contoh: 'Lupa Password')",
      "given": "Kondisi awal yang spesifik dan jelas dalam bahasa Indonesia",
      "when": "Aksi yang dilakukan user/sistem dalam bahasa Indonesia",
      "then": "Hasil yang diharapkan secara detail dalam bahasa Indonesia"
    }
  ],
  "developmentTasks": [
    {
      "role": "BE|FE|UI/UX|QA",
      "description": "Deskripsi task yang spesifik sesuai konteks user story",
      "priority": "High|Medium|Low",
      "status": "To Do"
    }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 INSTRUKSI AKHIR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Berikan output JSON yang LENGKAP dan DETAIL:
• Setiap field given/when/then berisi kalimat lengkap (bukan poin singkat)
• Setiap development task berisi penjelasan spesifik (bukan template generik)
• Gunakan kata-kata Anda sendiri yang 100% sesuai dengan user story di atas
• Output harus JSON valid tanpa markdown, code block, atau penjelasan tambahan

Hasilkan respons JSON sekarang:`;
}

/**
 * 🔵 PROMPT BUILDER: GENERAL PROMPT (Non-Connextra Response)
 * Lokasi: aiService.js - constructGeneralPrompt()
 * Tujuan: Membentuk prompt untuk respons singkat ketika input bukan Connextra
 * Input: userInput - Input user yang tidak sesuai format Connextra
 * Output: String prompt untuk generate respons singkat yang mengarahkan user
 * 
 * Prompt untuk response umum (non-Connextra format)
 * Digunakan untuk input yang bukan user story format
 */
function constructGeneralPrompt(userInput) {
  // 🔵 PROMPT CONTENT: GENERAL RESPONSE
  // Lokasi: aiService.js - constructGeneralPrompt() - return statement
  // Tujuan: Template prompt untuk respons singkat mengarahkan user ke format Connextra
  // Karakteristik:
  // - Maksimal 2 kalimat
  // - Menjelaskan bahwa input bukan format Connextra
  // - Mengarahkan user untuk menggunakan format yang benar
  return `Input: "${userInput}"

Berikan respons singkat (maksimal 2 kalimat) yang menjelaskan bahwa untuk membuat skenario pengujian, pengguna perlu menggunakan format User Story Connextra.

Gunakan bahasa Indonesia yang ramah dan langsung ke poin.`;
}