# 🧵 SpecWeave

**Platform generasi skenario Gherkin berbasis AI – dari user story ke backlog siap pakai, terintegrasi langsung dengan JIRA.**

![Node.js](https://img.shields.io/badge/node-%3E%3D16-339933?logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/python-%3E%3D3.8-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/frontend-React%2018-61DAFB?logo=react&logoColor=white)
![Express](https://img.shields.io/badge/backend-Express-000000?logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/database-Supabase-3ECF8E?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

[Fitur](#-fitur-utama) • [Cara Kerja](#-cara-kerja) • [Instalasi](#-instalasi) • [Struktur](#-struktur-project) • [API](#-dokumentasi-api) • [Kontribusi](#-kontribusi)

---

SpecWeave mengubah kebutuhan dalam bahasa natural menjadi skenario **Behavior-Driven Development (BDD)** berformat Gherkin yang terstruktur, lengkap dengan rincian *development task*, evaluasi kualitas otomatis, dan ekspor langsung ke JIRA sebagai backlog.

## 🚀 10 Use Case Utama

| # | Use Case | Deskripsi |
|---|---|---|
| 1️⃣ | **Generate Skenario dari User Story** | Input user story format Connextra, dapatkan skenario Gherkin lengkap dengan Given-When-Then |
| 2️⃣ | **Edit & Refine Iteratif** | Perbaiki skenario melalui chat interaktif sampai sesuai kebutuhan |
| 3️⃣ | **Evaluasi Kualitas Otomatis** | Cek skor kemiripan semantik skenario terhadap best practice dengan Sentence-BERT |
| 4️⃣ | **Ekspor ke JIRA** | Langsung push skenario sebagai user story ke project & epic JIRA pilihan Anda |
| 5️⃣ | **Buat Template Skenario** | Simpan pola skenario yang sering dipakai untuk dipanggil ulang |
| 6️⃣ | **Gunakan Reference Library** | Tambahkan contoh skenario terbaik untuk meningkatkan akurasi AI (few-shot learning) |
| 7️⃣ | **Kelola Multi-Project JIRA** | Switch antar project/epic JIRA tanpa perlu login ulang |
| 8️⃣ | **Lihat History Skenario** | Akses semua skenario yang pernah di-generate, edit, atau ekspor |
| 9️⃣ | **Monitor Dashboard Analytics** | Tracking tren kualitas skenario dan performa tim dari waktu ke waktu |
| 🔟 | **Development Task Breakdown** | Setiap skenario dilengkapi rincian task development yang actionable |

## 🧭 Cara Kerja

SpecWeave menerapkan strategi ***dual-path prompting***:

```
User Story ──▶ Deteksi Format Connextra ─┬─▶ [Sesuai]  ─▶ Gherkin Path  ─▶ LLM ─▶ Skenario Gherkin ─▶ Ekspor JIRA
                                         └─▶ [Tidak]   ─▶ General Path ─▶ Panduan Format Connextra
```

| Jalur | Kapan Aktif | Yang Terjadi |
|---|---|---|
| **Gherkin Path** | Masukan sesuai format Connextra | Prompt berisi persyaratan format + contoh dari *reference library* (bila tersedia) |
| **General Path** | Masukan tidak sesuai format | Diarahkan ke panduan penulisan user story yang benar |

## 🛠️ Stack Teknologi

| Layer | Teknologi |
|---|---|
| **Frontend** | React 18 + Vite, Tailwind CSS, React Router, Monaco Editor, Framer Motion |
| **Backend** | Node.js + Express.js, Supabase (auth + PostgreSQL) |
| **AI** | OpenRouter API – Llama 3.3 70B Instruct, DeepSeek R1, Gemini 2.5 Pro, GPT-4 Turbo |
| **Evaluasi** | Python + Sentence-Transformers (Sentence-BERT) |
| **Testing** | Vitest, Jest, Fast-check |

## 📋 Prasyarat

| Kebutuhan | Versi Minimum |
|---|---|
| Node.js | v16+ |
| Python | v3.8+ |
| Akun Supabase | untuk production |
| API key OpenRouter | untuk akses model LLM |

## ⚙️ Instalasi

```bash
# 1. Clone
git clone https://github.com/MuhammadGhazivedaBelvanaufal/SpecWeave.git
cd SpecWeave

# 2. Install dependencies
cd aplikasi-klien && npm install
cd ../aplikasi-server && npm install
cd src/python && pip install -r requirements.txt

# 3. Setup .env (lihat tabel di bawah), lalu jalankan
cd aplikasi-server && npm run dev      # terminal 1
cd aplikasi-klien && npm run dev       # terminal 2
```

**Environment Variables**

| File | Variable | Keterangan |
|---|---|---|
| `aplikasi-klien/.env` | `VITE_SUPABASE_URL` | URL project Supabase |
| | `VITE_SUPABASE_ANON_KEY` | Anon key Supabase |
| | `VITE_API_BASE_URL` | `http://localhost:5003` |
| `aplikasi-server/.env` | `PORT` | `5003` |
| | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Kredensial Supabase |
| | `OPENROUTER_API_KEY` | API key OpenRouter |
| | `NODE_ENV` | `development` |

**Akses:** Frontend `localhost:3000` · Backend `localhost:5003` · Health check `localhost:5003/api/health`

Untuk deployment ke Railway atau Docker, lihat [dokumentasi deployment](./docs/deployment.md).

## 📁 Struktur Project

```
SpecWeave/
├── aplikasi-klien/          # Aplikasi frontend React
│   ├── src/
│   │   ├── components/      # Komponen UI (auth, chat, dashboard, jira, dll)
│   │   ├── pages/           # Halaman utama aplikasi
│   │   ├── services/        # Integrasi API dan service eksternal
│   │   ├── hooks/           # Custom React hooks
│   │   ├── contexts/        # React context providers
│   │   └── utils/           # Fungsi utility dan konstanta
│   └── SPECWEAVE_DESIGN_SYSTEM.md
│
├── aplikasi-server/         # Server backend Node.js
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # Definisi route API
│   │   ├── services/        # Business logic services
│   │   ├── middlewares/     # Express middlewares
│   │   ├── database/        # Database handlers dan migrations
│   │   ├── python/          # Script Python untuk evaluasi Sentence-BERT
│   │   └── utils/           # Utility functions
│   └── config/              # File konfigurasi
│
├── docs/                    # Dokumentasi dan file arsip
├── skrip-utilitas/          # Script utility
├── konfigurasi/             # Konfigurasi environment
└── pengembangan/            # Dokumentasi pengembangan dan specs
```

## 📚 Dokumentasi API

<details>
<summary>Lihat seluruh endpoint</summary>

| Kategori | Method | Endpoint | Deskripsi |
|---|---|---|---|
| Auth | POST | `/api/auth/login` | Login user |
| Auth | POST | `/api/auth/register` | Register user baru |
| Auth | POST | `/api/auth/logout` | Logout user |
| Gherkin | POST | `/api/gherkin/generate` | Generate skenario dari requirements |
| Gherkin | GET | `/api/gherkin/history` | History skenario user |
| Gherkin | GET | `/api/gherkin/:id` | Detail skenario spesifik |
| JIRA | POST | `/api/jira/connections` | Buat koneksi JIRA |
| JIRA | GET | `/api/jira/connections` | Ambil koneksi JIRA user |
| JIRA | POST | `/api/jira/connect` | Connect instance JIRA (manual setup) |
| JIRA | GET | `/api/jira/projects` | Daftar project tersedia |
| JIRA | GET | `/api/jira/epics/:projectId` | Epic dari project |
| JIRA | POST | `/api/jira/export` | Ekspor skenario ke JIRA |
| Evaluation | POST | `/api/evaluation/sentence-bert` | Evaluasi dengan Sentence-BERT |
| Evaluation | GET | `/api/evaluation/history` | History evaluasi |
| Template | GET/POST | `/api/templates` | Ambil semua / buat template baru |
| Template | PUT/DELETE | `/api/templates/:id` | Update / hapus template |
| Reference | GET/POST | `/api/references` | Ambil semua / tambah referensi |
| Reference | PUT/DELETE | `/api/references/:id` | Update / hapus referensi |
| System | GET | `/api/health` | Health check |
| System | GET | `/api/performance` | Performance metrics |

</details>

## 🤝 Kontribusi

| Langkah | Command |
|---|---|
| 1. Fork repo | ✓ |
| 2. Buat branch | `git checkout -b feature/fitur-keren` |
| 3. Commit | `git commit -m 'Tambah fitur keren'` |
| 4. Push | `git push origin feature/fitur-keren` |
| 5. Buat Pull Request | ✓ |

Ikuti code style yang ada, jalankan `npm test` sebelum submit PR, dan gunakan [SpecWeave Design System](./aplikasi-klien/SPECWEAVE_DESIGN_SYSTEM.md) untuk komponen UI.

## 🔮 Roadmap

- [ ] Integrasi model AI yang lebih advanced
- [ ] Dukungan multi-bahasa (Indonesia, English)
- [ ] Dashboard analytics dengan lebih banyak insight
- [ ] Aplikasi mobile (React Native)
- [ ] Fitur enterprise (team management, role-based access)
- [ ] Integrasi workflow JIRA tingkat lanjut
- [ ] Fitur kolaborasi real-time

## 📄 Lisensi & Tim

**MIT License** – lihat [LICENSE](LICENSE). Dikembangkan oleh **Muhammad Ghaziveda Belvanaufal** (Lead Developer) & [Contributors](CONTRIBUTORS.md).

---

Terima kasih kepada Supabase, komunitas React & Node.js, OpenRouter, dan JIRA API.
