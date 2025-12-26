import Groq from "groq-sdk";
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const convertToGherkin = async (userStory) => {
  try {
    console.log("🤖 AI Service: Mengirim request ke Groq...");
    
    const prompt = constructPrompt(userStory);
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Anda adalah ahli Product Manager yang sangat berpengalaman dalam membuat spesifikasi fitur dan skenario Gherkin dalam bahasa Indonesia. Selalu berikan output dalam format JSON yang valid tanpa markdown atau penjelasan tambahan."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "openai/gpt-oss-120b", // Using Llama 3.1 70B model for better Indonesian support
      temperature: 0.3, // Balanced for natural yet consistent Indonesian language
      max_tokens: 4000, // Increased for more detailed professional descriptions
      top_p: 0.9,
      stream: false,
    });

    const text = chatCompletion.choices[0]?.message?.content || "";
    console.log("📝 Raw Response from Groq:", text); // Debugging: Cek apa yang dikirim AI

    // PEMBERSIHAN JSON LEBIH KUAT
    // Kita cari posisi kurung kurawal pertama "{" dan terakhir "}"
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      // Ambil hanya bagian JSON-nya saja
      const cleanJson = text.substring(firstBrace, lastBrace + 1);
      return cleanJson;
    } else {
      // Jika tidak menemukan JSON, kembalikan text aslinya (agar error terlihat di UI)
      console.warn("⚠️ Warning: AI tidak mengembalikan format JSON yang valid.");
      return text;
    }

  } catch (error) {
    console.error("❌ AI Service Error:", error);
    throw new Error("Gagal memproses transformasi AI. Cek koneksi atau API Key Groq.");
  }
};

/**
 * Prompt Engineering untuk menghasilkan JSON Terstruktur dengan Groq/Llama dalam Bahasa Indonesia
 */
function constructPrompt(userStory) {
  return `Anda adalah Senior Product Manager & QA Lead yang ahli dalam membuat spesifikasi fitur dan acceptance criteria. Tugas Anda adalah menganalisis User Story berikut dan membuat spesifikasi fitur lengkap dalam format JSON.

PERSYARATAN KRITIS:
1. Output HARUS berupa JSON valid saja - tanpa markdown, tanpa penjelasan, tanpa code blocks
2. Ikuti struktur JSON yang tepat seperti di bawah ini
3. Buat 2-3 skenario Gherkin yang realistis dan detail berdasarkan user story
4. Gunakan bahasa Indonesia yang profesional dan jelas untuk semua konten
5. Description harus menjelaskan nilai bisnis dan fungsi fitur secara detail
6. User Story tetap dalam bahasa asli yang diberikan
7. Scenarios harus mencakup happy path dan edge cases

Struktur JSON yang Diperlukan:
{
  "feature": "Nama Fitur (Judul Pendek & Profesional)",
  "description": "Deskripsi detail 2-3 kalimat yang menjelaskan fungsi fitur, nilai bisnis, dan manfaatnya dalam bahasa Indonesia yang profesional.",
  "userStory": "User story asli yang diberikan (tetap dalam bahasa asli)",
  "scenarios": [
    {
      "given": "Kondisi awal yang spesifik dan jelas dalam bahasa Indonesia",
      "when": "Aksi yang dilakukan user/sistem dalam bahasa Indonesia",
      "then": "Hasil yang diharapkan secara detail dalam bahasa Indonesia"
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
      "given": "Sistem mencatat data lokasi agen sepanjang hari",
      "when": "User membuka laporan Agent Route Summary",
      "then": "Sistem menampilkan urutan kunjungan agen dalam bentuk daftar dan visualisasi map, termasuk waktu tiba di tiap titik"
    },
    {
      "given": "Agen belum melakukan kunjungan apapun pada hari tersebut",
      "when": "User membuka laporan Agent Route Summary",
      "then": "Sistem menampilkan pesan bahwa belum ada data kunjungan untuk hari yang dipilih"
    },
    {
      "given": "Data GPS agen tidak tersedia atau terputus",
      "when": "User membuka laporan Agent Route Summary",
      "then": "Sistem menampilkan peringatan tentang data yang tidak lengkap dan menampilkan data yang tersedia"
    }
  ]
}

User Story yang akan dianalisis:
"${userStory}"

Hasilkan respons JSON dalam bahasa Indonesia yang profesional dan detail:`;
}