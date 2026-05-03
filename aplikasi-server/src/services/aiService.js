import dotenv from 'dotenv';
import { detectConnextraFormat } from './formatDetectionService.js';
import llmProviderService from './llmProviderService.js';

dotenv.config();

export const convertToGherkin = async (userStory, options = {}) => {
  try {
    // Use originalInput for format detection if provided, otherwise use userStory
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
    
    let prompt;
    let responseType;
    
    // Stricter threshold: require at least 2 components (role + want) with 0.8 confidence
    const meetsThreshold = formatDetection.isConnextra && 
                          formatDetection.confidence >= 0.8 &&
                          formatDetection.matchedComponents.length >= 2;
    
    if (meetsThreshold) {
      // Connextra format - Generate Gherkin scenarios
      console.log('✅ [AI-SERVICE] Detected as Connextra format - generating Gherkin');
      prompt = constructGherkinPrompt(userStory, options.references);
      responseType = 'gherkin';
    } else {
      // Non-Connextra format - General LLM response
      console.log('❌ [AI-SERVICE] Not Connextra format - returning general response');
      prompt = constructGeneralPrompt(inputForDetection); // Use original input for general response
      responseType = 'general';
    }
    
    // Prepare messages for LLM
    const messages = [
      {
        role: "system",
        content: responseType === 'gherkin' 
          ? "Anda adalah ahli Product Manager yang sangat berpengalaman dalam membuat spesifikasi fitur dan skenario Gherkin dalam bahasa Indonesia. Selalu berikan output dalam format JSON yang valid tanpa markdown atau penjelasan tambahan."
          : "Berikan respons yang sangat singkat dan langsung. Maksimal 2 kalimat. Arahkan pengguna untuk menggunakan format User Story Connextra. Gunakan bahasa Indonesia yang sederhana."
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    let text;

    // Use provider abstraction - provider and modelName are required
    if (!options.provider || !options.modelName) {
      throw new Error('Provider dan model name harus disediakan. Groq tidak lagi didukung.');
    }

    console.log('🔄 [AI-SERVICE] Using provider abstraction:', {
      provider: options.provider,
      model: options.modelName
    });
    
    try {
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
    } catch (providerError) {
      console.error('❌ [AI-SERVICE] Provider error:', {
        provider: options.provider,
        model: options.modelName,
        error: providerError.message
      });
      throw providerError;
    }

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
          isConnextra: true
        };
      } else {
        console.warn("⚠️ Warning: AI tidak mengembalikan format JSON yang valid.");
        return {
          type: 'gherkin',
          content: text,
          formatDetection,
          isConnextra: true
        };
      }
    } else {
      // Return general response as-is
      return {
        type: 'general',
        content: text,
        formatDetection,
        isConnextra: false
      };
    }

  } catch (error) {
    console.error("❌ AI Service Error:", error);
    throw new Error("Gagal memproses transformasi AI. Cek koneksi atau konfigurasi LLM provider.");
  }
};

/**
 * Prompt Engineering untuk menghasilkan JSON Terstruktur dengan Groq/Llama dalam Bahasa Indonesia
 * Digunakan untuk input format Connextra (user story)
 * @param {string} userStory - User story input
 * @param {Array} patterns - Array of patterns with examples for few-shot prompting
 */
function constructGherkinPrompt(userStory, patterns = []) {
  // Extract references from patterns
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
  
  // Remove duplicates based on title AND gherkinContent (more strict)
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
  
  // References sudah di-shuffle di frontend, langsung gunakan
  // Maksimal 5 references, atau semua jika kurang dari 5
  const maxReferences = Math.min(references.length, 5);
  const selectedReferences = references.slice(0, maxReferences);
  
  // Build few-shot examples from references
  let fewShotExamples = '';
  
  if (selectedReferences.length > 0) {
    fewShotExamples = '\n\nCONTOH REFERENSI (gunakan sebagai panduan format dan kualitas):\n\n';
    
    selectedReferences.forEach((ref, index) => {
      fewShotExamples += `Contoh ${index + 1}: ${ref.title}\n`;
      fewShotExamples += `${ref.gherkinContent}\n\n`;
    });
    
    fewShotExamples += 'PENTING: Gunakan contoh di atas sebagai panduan untuk membuat scenario yang berkualitas dan konsisten dengan standar perusahaan. Ikuti pola dan struktur yang sama, tetapi sesuaikan dengan konteks user story yang diberikan.\n';
    
    console.log(`✅ [AI-SERVICE] Few-shot examples added to prompt (${selectedReferences.length} references)`);
  } else {
    console.log('⚠️ [AI-SERVICE] No references available for few-shot prompting');
  }
  
  return `Anda adalah Senior Product Manager & QA Lead yang ahli dalam membuat spesifikasi fitur dan acceptance criteria. Tugas Anda adalah menganalisis User Story berikut dan membuat spesifikasi fitur lengkap dalam format JSON.

PERSYARATAN KRITIS:
1. Output HARUS berupa JSON valid saja - tanpa markdown, tanpa penjelasan, tanpa code blocks
2. Ikuti struktur JSON yang tepat seperti di bawah ini
3. Buat TEPAT 3 skenario Gherkin yang realistis dan detail berdasarkan user story
4. Gunakan bahasa Indonesia yang profesional dan jelas untuk semua konten
5. Description harus menjelaskan nilai bisnis dan fungsi fitur secara detail
6. User Story tetap dalam bahasa asli yang diberikan
7. WAJIB: Buat 3 scenario dengan tipe yang KONSISTEN:
   - Scenario 1: HARUS bertipe "Happy Path" (alur normal/sukses)
   - Scenario 2: HARUS bertipe "Edge Case" (kondisi batas/error)
   - Scenario 3: HARUS bertipe "Alternative Flow" (alur alternatif)
8. Field "type" HARUS diisi dengan salah satu dari: "Happy Path", "Edge Case", atau "Alternative Flow"
9. Field "title" adalah deskripsi singkat yang spesifik untuk scenario tersebut (contoh: "Login Berhasil", "Password Salah", "Lupa Password")
10. WAJIB: Buat 6-8 development tasks yang realistis dan spesifik berdasarkan user story:
    - role: "BE" (Backend), "FE" (Frontend), "UI/UX" (Design), atau "QA" (Testing)
    - description: Deskripsi task yang spesifik dan actionable sesuai konteks user story
    - priority: "High", "Medium", atau "Low"
    - status: selalu "To Do"
11. Development tasks harus mencakup minimal: 2-3 BE tasks, 2 FE tasks, 1 UI/UX task, dan 2 QA tasks
12. Description harus spesifik sesuai konteks user story, bukan template generik
${fewShotExamples}
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

CONTOH FORMAT YANG BENAR (sesuai standar profesional):
{
  "feature": "Agent Route Summary",
  "description": "Report ini menampilkan ringkasan rute yang dilalui agen selama satu hari kerja, termasuk urutan kunjungan dan waktu tiba di setiap titik.",
  "userStory": "Sebagai user, saya ingin melihat ringkasan rute harian agen agar saya dapat mengevaluasi efisiensi perjalanan dan distribusi tugas di lapangan.",
  "scenarios": [
    {
      "type": "Happy Path",
      "title": "Tampilkan Rute Harian",
      "given": "Sistem mencatat data lokasi agen sepanjang hari",
      "when": "User membuka laporan Agent Route Summary",
      "then": "Sistem menampilkan urutan kunjungan agen dalam bentuk daftar dan visualisasi map, termasuk waktu tiba di tiap titik"
    },
    {
      "type": "Edge Case",
      "title": "Tidak Ada Data Kunjungan",
      "given": "Agen belum melakukan kunjungan apapun pada hari tersebut",
      "when": "User membuka laporan Agent Route Summary",
      "then": "Sistem menampilkan pesan bahwa belum ada data kunjungan untuk hari yang dipilih"
    },
    {
      "type": "Alternative Flow",
      "title": "Data GPS Tidak Lengkap",
      "given": "Data GPS agen tidak tersedia atau terputus",
      "when": "User membuka laporan Agent Route Summary",
      "then": "Sistem menampilkan peringatan tentang data yang tidak lengkap dan menampilkan data yang tersedia"
    }
  ],
  "developmentTasks": [
    {
      "role": "BE",
      "description": "Implementasi API endpoint untuk mengambil data rute agen dari database dengan filter tanggal",
      "priority": "High",
      "status": "To Do"
    },
    {
      "role": "BE",
      "description": "Buat service layer untuk menghitung urutan kunjungan dan waktu tiba di setiap lokasi",
      "priority": "High",
      "status": "To Do"
    },
    {
      "role": "BE",
      "description": "Implementasi error handling untuk data GPS yang tidak lengkap atau terputus",
      "priority": "Medium",
      "status": "To Do"
    },
    {
      "role": "FE",
      "description": "Buat komponen React untuk menampilkan daftar urutan kunjungan dengan timeline",
      "priority": "High",
      "status": "To Do"
    },
    {
      "role": "FE",
      "description": "Integrasi library peta (Google Maps/Leaflet) untuk visualisasi rute agen",
      "priority": "High",
      "status": "To Do"
    },
    {
      "role": "UI/UX",
      "description": "Desain interface untuk laporan Agent Route Summary dengan visualisasi map dan timeline",
      "priority": "Medium",
      "status": "To Do"
    },
    {
      "role": "QA",
      "description": "Testing skenario happy path untuk tampilan rute harian dengan data lengkap",
      "priority": "Low",
      "status": "To Do"
    },
    {
      "role": "QA",
      "description": "Testing edge case untuk kondisi tidak ada data kunjungan dan data GPS tidak lengkap",
      "priority": "Low",
      "status": "To Do"
    }
  ]
}

User Story yang akan dianalisis:
"${userStory}"

Hasilkan respons JSON dalam bahasa Indonesia yang profesional dan detail:`;
}

/**
 * Prompt untuk response umum (non-Connextra format)
 * Digunakan untuk input yang bukan user story format
 */
function constructGeneralPrompt(userInput) {
  return `Input: "${userInput}"

Berikan respons singkat (maksimal 2 kalimat) yang menjelaskan bahwa untuk membuat skenario pengujian, pengguna perlu menggunakan format User Story Connextra.

Gunakan bahasa Indonesia yang ramah dan langsung ke poin.`;
}