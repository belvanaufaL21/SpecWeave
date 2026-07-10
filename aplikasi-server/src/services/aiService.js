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
          ? "Anda adalah ahli Product Manager yang sangat berpengalaman dalam membuat spesifikasi fitur dan skenario Gherkin dalam bahasa Indonesia. PENTING: Selalu berikan output LENGKAP dan DETAIL dengan konten yang BENAR-BENAR TERISI penuh. JANGAN hanya memberikan kerangka atau skeleton. Setiap field given/when/then HARUS berisi kalimat lengkap dan spesifik. Selalu berikan output dalam format JSON yang valid tanpa markdown atau penjelasan tambahan."
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
  // Maksimal 3 references untuk few-shot prompting (optimal untuk performa dan kualitas)
  const maxReferences = Math.min(references.length, 3);
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

PERINGATAN PENTING:
- JANGAN HANYA MEMBERIKAN KERANGKA ATAU TEMPLATE KOSONG
- BERIKAN OUTPUT LENGKAP DAN DETAIL DENGAN KONTEN YANG BENAR-BENAR TERISI
- SETIAP FIELD HARUS MEMILIKI KONTEN YANG SPESIFIK DAN RELEVAN DENGAN USER STORY
- JANGAN GUNAKAN PLACEHOLDER SEPERTI "[...]", "[detail lengkap]", atau konten yang tidak lengkap

PERSYARATAN KRITIS:
1. Output HARUS berupa JSON valid saja - tanpa markdown, tanpa penjelasan, tanpa code blocks
2. Ikuti struktur JSON yang tepat seperti di bawah ini
3. Buat TEPAT 3 skenario Gherkin yang realistis dan detail berdasarkan user story
4. Gunakan bahasa Indonesia yang profesional dan jelas untuk semua konten
5. Description harus menjelaskan nilai bisnis dan fungsi fitur secara detail (MINIMAL 2-3 KALIMAT LENGKAP)
6. User Story tetap dalam bahasa asli yang diberikan
7. WAJIB: Buat 3 scenario dengan tipe yang KONSISTEN:
   - Scenario 1: HARUS bertipe "Happy Path" (alur normal/sukses)
   - Scenario 2: HARUS bertipe "Edge Case" (kondisi batas/error)
   - Scenario 3: HARUS bertipe "Alternative Flow" (alur alternatif)
8. Field "type" HARUS diisi dengan salah satu dari: "Happy Path", "Edge Case", atau "Alternative Flow"
9. Field "title" adalah deskripsi singkat yang spesifik untuk scenario tersebut (contoh: "Login Berhasil", "Password Salah", "Lupa Password")
10. WAJIB SETIAP SCENARIO GIVEN/WHEN/THEN HARUS LENGKAP DAN DETAIL:
    - "given": MINIMAL 1 KALIMAT LENGKAP yang menjelaskan kondisi awal dengan spesifik
    - "when": MINIMAL 1 KALIMAT LENGKAP yang menjelaskan aksi user/sistem dengan jelas
    - "then": MINIMAL 1-2 KALIMAT LENGKAP yang menjelaskan hasil yang diharapkan secara detail
11. WAJIB: Buat 6-8 development tasks yang realistis dan spesifik berdasarkan user story:
    - role: "BE" (Backend), "FE" (Frontend), "UI/UX" (Design), atau "QA" (Testing)
    - description: Deskripsi task yang spesifik dan actionable sesuai konteks user story (MINIMAL 1 KALIMAT LENGKAP)
    - priority: "High", "Medium", atau "Low"
    - status: selalu "To Do"
12. Development tasks harus mencakup minimal: 2-3 BE tasks, 2 FE tasks, 1 UI/UX task, dan 2 QA tasks
13. Description harus spesifik sesuai konteks user story, bukan template generik
14. SETIAP FIELD GIVEN/WHEN/THEN HARUS BERISI KONTEN YANG LENGKAP DAN DETAIL, TIDAK BOLEH RINGKAS ATAU HANYA KERANGKA
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
      "given": "Kondisi awal yang spesifik, jelas, dan lengkap dalam bahasa Indonesia. WAJIB minimal 1 kalimat lengkap yang menjelaskan state sistem dan user dengan detail. Contoh: 'User sudah terdaftar dalam sistem dengan email aktif dan password yang valid, dan berada di halaman login aplikasi'",
      "when": "Aksi yang dilakukan user/sistem dalam bahasa Indonesia dengan sangat jelas dan detail. WAJIB minimal 1 kalimat lengkap. Contoh: 'User memasukkan email dan password yang benar, kemudian menekan tombol Login'",
      "then": "Hasil yang diharapkan secara detail dan lengkap dalam bahasa Indonesia. WAJIB minimal 1-2 kalimat lengkap yang menjelaskan state baru sistem, feedback ke user, dan perubahan UI. Contoh: 'Sistem memvalidasi credentials, membuat session token, mengarahkan user ke dashboard utama, dan menampilkan notifikasi Welcome dengan nama user'"
    },
    {
      "type": "Edge Case",
      "title": "Deskripsi singkat scenario (contoh: 'Password Salah')",
      "given": "Kondisi awal yang spesifik, jelas, dan lengkap dalam bahasa Indonesia. WAJIB minimal 1 kalimat lengkap yang menjelaskan state sistem dan user dengan detail",
      "when": "Aksi yang dilakukan user/sistem dalam bahasa Indonesia dengan sangat jelas dan detail. WAJIB minimal 1 kalimat lengkap",
      "then": "Hasil yang diharapkan secara detail dan lengkap dalam bahasa Indonesia. WAJIB minimal 1-2 kalimat lengkap yang menjelaskan error handling, feedback ke user, dan state sistem"
    },
    {
      "type": "Alternative Flow",
      "title": "Deskripsi singkat scenario (contoh: 'Lupa Password')",
      "given": "Kondisi awal yang spesifik, jelas, dan lengkap dalam bahasa Indonesia. WAJIB minimal 1 kalimat lengkap yang menjelaskan state sistem dan user dengan detail",
      "when": "Aksi yang dilakukan user/sistem dalam bahasa Indonesia dengan sangat jelas dan detail. WAJIB minimal 1 kalimat lengkap",
      "then": "Hasil yang diharapkan secara detail dan lengkap dalam bahasa Indonesia. WAJIB minimal 1-2 kalimat lengkap yang menjelaskan alur alternatif, feedback ke user, dan state sistem"
    }
  ],
  "developmentTasks": [
    {
      "role": "BE|FE|UI/UX|QA",
      "description": "Deskripsi task yang sangat spesifik, detail, dan actionable sesuai konteks user story. WAJIB minimal 1 kalimat lengkap. Contoh BAIK: 'Implementasi API endpoint POST /auth/login dengan validasi email format, password hashing menggunakan bcrypt, dan generate JWT token dengan expiry 24 jam'. Contoh BURUK: 'Buat API login' (terlalu ringkas)",
      "priority": "High|Medium|Low",
      "status": "To Do"
    }
  ]
}

CONTOH FORMAT YANG BENAR (sesuai standar profesional):
{
  "feature": "Agent Route Summary",
  "description": "Report ini menampilkan ringkasan rute yang dilalui agen selama satu hari kerja, termasuk urutan kunjungan dan waktu tiba di setiap titik. Fitur ini membantu manajer operasional untuk mengevaluasi efisiensi perjalanan agen dan mengoptimalkan distribusi tugas di lapangan.",
  "userStory": "Sebagai user, saya ingin melihat ringkasan rute harian agen agar saya dapat mengevaluasi efisiensi perjalanan dan distribusi tugas di lapangan.",
  "scenarios": [
    {
      "type": "Happy Path",
      "title": "Tampilkan Rute Harian",
      "given": "Sistem mencatat data lokasi GPS agen sepanjang hari kerja dengan interval 5 menit, dan user sudah login sebagai manajer operasional dengan akses ke dashboard monitoring",
      "when": "User membuka laporan Agent Route Summary melalui menu Reports, memilih tanggal hari ini, dan memilih agen bernama Budi dari dropdown list",
      "then": "Sistem menampilkan urutan kunjungan agen dalam bentuk daftar kronologis dengan waktu check-in di setiap titik, visualisasi map interaktif dengan marker untuk setiap lokasi kunjungan, garis rute yang menghubungkan titik-titik kunjungan, total jarak tempuh 45 km, dan estimasi waktu perjalanan 3 jam 20 menit"
    },
    {
      "type": "Edge Case",
      "title": "Tidak Ada Data Kunjungan",
      "given": "Agen belum melakukan check-in ke lokasi manapun pada hari yang dipilih, dan user sudah memilih tanggal kemarin melalui date picker",
      "when": "User membuka laporan Agent Route Summary untuk agen tersebut dan menekan tombol Load Report",
      "then": "Sistem menampilkan empty state dengan ilustrasi kalender kosong, pesan 'Belum ada data kunjungan untuk tanggal yang dipilih', dan tombol 'Pilih Tanggal Lain' untuk memudahkan user memilih tanggal yang berbeda"
    },
    {
      "type": "Alternative Flow",
      "title": "Data GPS Tidak Lengkap",
      "given": "Data GPS agen terputus selama beberapa periode karena sinyal hilang di area tertentu, dan user sudah membuka laporan untuk agen yang bersangkutan",
      "when": "User membuka laporan Agent Route Summary dan sistem mendeteksi ada gap dalam data GPS lebih dari 30 menit",
      "then": "Sistem menampilkan peringatan banner kuning di bagian atas laporan dengan teks 'Data GPS tidak lengkap - terdeteksi 2 gap periode 09:30-10:15 dan 14:00-14:45', menampilkan data yang tersedia dengan visualisasi rute yang terputus (dashed line) pada periode gap, dan memberikan opsi 'Export Incomplete Data' untuk analisis lebih lanjut"
    }
  ],
  "developmentTasks": [
    {
      "role": "BE",
      "description": "Implementasi API endpoint GET /api/reports/agent-route dengan parameter date dan agentId untuk mengambil data GPS tracking dari database, menghitung total jarak tempuh menggunakan Haversine formula, dan mengembalikan data dalam format JSON terstruktur",
      "priority": "High",
      "status": "To Do"
    },
    {
      "role": "BE",
      "description": "Buat service layer AgentRouteService untuk processing data GPS, identifikasi gap dalam data berdasarkan threshold 30 menit, calculate urutan kunjungan berdasarkan timestamp, dan generate statistik perjalanan seperti total jarak dan estimasi waktu",
      "priority": "High",
      "status": "To Do"
    },
    {
      "role": "BE",
      "description": "Implementasi error handling untuk kondisi data GPS tidak lengkap atau terputus, logging untuk debugging performance issue, dan caching mechanism untuk report yang sering diakses",
      "priority": "Medium",
      "status": "To Do"
    },
    {
      "role": "FE",
      "description": "Buat komponen React AgentRouteReport dengan date picker untuk pilih tanggal, dropdown untuk select agen, dan tabel untuk menampilkan daftar urutan kunjungan dengan kolom timestamp, nama lokasi, alamat, dan durasi kunjungan",
      "priority": "High",
      "status": "To Do"
    },
    {
      "role": "FE",
      "description": "Integrasi library peta Google Maps atau Leaflet untuk visualisasi rute agen, implementasi custom markers untuk setiap lokasi kunjungan dengan tooltip info, polyline untuk menghubungkan titik-titik kunjungan, dan zoom control untuk detail view",
      "priority": "High",
      "status": "To Do"
    },
    {
      "role": "UI/UX",
      "description": "Desain interface dashboard Agent Route Summary dengan layout responsive, visualisasi map yang mudah dibaca, color scheme untuk membedakan status kunjungan (completed/pending/skipped), dan empty state design untuk kondisi tidak ada data",
      "priority": "Medium",
      "status": "To Do"
    },
    {
      "role": "QA",
      "description": "Testing skenario happy path untuk tampilan rute harian dengan data GPS lengkap, validasi akurasi perhitungan jarak tempuh menggunakan sample data known distance, dan testing performa load time untuk report dengan 50+ data points",
      "priority": "Low",
      "status": "To Do"
    },
    {
      "role": "QA",
      "description": "Testing edge case untuk kondisi tidak ada data kunjungan pada tanggal yang dipilih, testing kondisi data GPS tidak lengkap dengan berbagai gap duration (10 menit, 30 menit, 1 jam), dan validasi error message yang ditampilkan sesuai dengan kondisi error",
      "priority": "Low",
      "status": "To Do"
    }
  ]
}

PERHATIAN: Contoh di atas menunjukkan DETAIL yang diharapkan - setiap given/when/then harus berisi kalimat lengkap dan spesifik seperti contoh tersebut, TIDAK BOLEH RINGKAS atau TIDAK LENGKAP.

User Story yang akan dianalisis:
"${userStory}"

INSTRUKSI FINAL YANG SANGAT PENTING:
1. BERIKAN OUTPUT JSON YANG LENGKAP DAN DETAIL - JANGAN HANYA KERANGKA
2. Setiap field "given", "when", "then" HARUS berisi minimal 1-2 kalimat lengkap dengan detail spesifik
3. Setiap "description" dalam developmentTasks HARUS berisi penjelasan lengkap tentang apa yang harus dikerjakan, tidak boleh hanya 1-2 kata
4. Pastikan semua konten relevan dengan user story dan memberikan value nyata untuk development team
5. Jangan gunakan placeholder atau template kosong - berikan konten yang benar-benar bisa langsung digunakan

Hasilkan respons JSON dalam bahasa Indonesia yang profesional dan detail:`;
}
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