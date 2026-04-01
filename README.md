# SpecWeave

SpecWeave adalah platform generasi skenario Gherkin berbasis AI yang menggabungkan pemrosesan bahasa alami dengan evaluasi kualitas otomatis menggunakan sistem metrik METEOR dan Sentence-BERT. Aplikasi ini membantu tim membuat skenario BDD (Behavior-Driven Development) berkualitas tinggi dan mengintegrasikannya dengan JIRA untuk manajemen proyek.

## 🚀 Fitur Utama

### Fungsionalitas Inti
- **Generasi Gherkin dengan AI**: Buat skenario BDD dari deskripsi kebutuhan dalam bahasa natural
- **Evaluasi Kualitas Multi-Metrik**: Penilaian otomatis menggunakan METEOR dan Sentence-BERT
- **Integrasi JIRA**: Export skenario sebagai user story langsung ke JIRA
- **Manajemen Template**: Buat dan kelola template skenario yang dapat digunakan kembali
- **Library Referensi**: Simpan library skenario referensi untuk konsistensi

### Pengalaman Pengguna
- **Interface Chat Interaktif**: Pendekatan conversational untuk generasi skenario
- **Feedback Kualitas Real-time**: Metrik kualitas dan saran instan
- **Dashboard Analytics**: Lacak tren kualitas skenario dan performa tim
- **Multi-project Support**: Kelola multiple proyek JIRA dan epic
- **Dark Theme dengan Purple-Pink Gradient**: Desain modern dan elegan

### Fitur Teknis
- **Sistem Autentikasi**: Manajemen user aman dengan Supabase
- **Responsive Design**: UI modern dengan React dan Tailwind CSS
- **RESTful API**: Arsitektur backend yang clean dengan Express.js
- **Database Integration**: Supabase PostgreSQL untuk production
- **Property-Based Testing**: Validasi kualitas dengan fast-check
- **Performance Monitoring**: Monitoring performa dan health check otomatis

## 🏗️ Arsitektur

```
SpecWeave/
├── aplikasi-klien/          # Aplikasi frontend React
│   ├── src/
│   │   ├── components/      # Komponen UI (auth, chat, dashboard, jira, dll)
│   │   ├── pages/          # Halaman utama aplikasi
│   │   ├── services/       # Integrasi API dan service eksternal
│   │   ├── hooks/          # Custom React hooks
│   │   ├── contexts/       # React context providers
│   │   └── utils/          # Fungsi utility dan konstanta
│   └── SPECWEAVE_DESIGN_SYSTEM.md  # Panduan design system
│
├── aplikasi-server/         # Server backend Node.js
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # Definisi route API
│   │   ├── services/       # Business logic services
│   │   ├── middlewares/    # Express middlewares
│   │   ├── database/       # Database handlers dan migrations
│   │   ├── python/         # Script Python untuk evaluasi METEOR & Sentence-BERT
│   │   └── utils/          # Utility functions
│   └── config/             # File konfigurasi
│
├── docs/                   # Dokumentasi dan file arsip
│   ├── archived-fixes/     # Log perbaikan historis
│   ├── archived-scripts/   # Script one-time dan SQL files
│   └── examples/           # Contoh kode dan panduan formatting
│
├── skrip-utilitas/         # Script utility dan Python METEOR evaluator
├── konfigurasi/            # Konfigurasi environment
└── pengembangan/           # Dokumentasi pengembangan dan specs
```

> **Catatan**: Setelah cleanup komprehensif, 70+ file markdown telah diorganisir ke direktori `docs/` untuk maintainability yang lebih baik. File database telah diarsipkan karena data sekarang disimpan di Supabase.

## 🛠️ Stack Teknologi

### Frontend
- **React 18** dengan Vite untuk development yang cepat
- **Tailwind CSS** untuk styling responsive
- **React Router** untuk navigasi
- **Supabase Client** untuk autentikasi
- **Monaco Editor** untuk code editing
- **Framer Motion** untuk animasi
- **Lucide React** untuk icon system
- **React Hot Toast** untuk notifikasi

### Backend
- **Node.js** dengan Express.js framework
- **Supabase** untuk autentikasi dan database PostgreSQL
- **CORS** enabled untuk cross-origin requests
- **Express Rate Limit** untuk API protection
- **Express Validator** untuk validasi input
- **Compression** untuk response optimization

### AI & Evaluasi
- **Python** untuk sistem evaluasi METEOR dan Sentence-BERT
- **NLTK** untuk natural language processing
- **Groq SDK** untuk integrasi AI
- **Custom AI integration** untuk generasi Gherkin

### Testing & Quality
- **Vitest** untuk unit testing frontend
- **Jest** untuk unit testing backend
- **Fast-check** untuk property-based testing
- **Supertest** untuk API testing
- **Testing Library** untuk component testing

### DevOps & Tools
- **Git** untuk version control
- **npm** untuk package management
- **Nodemon** untuk development auto-reload
- **Better-SQLite3** untuk local database (development)

## 📋 Prasyarat

Sebelum menjalankan SpecWeave, pastikan kamu sudah install:

- **Node.js** (v16 atau lebih tinggi)
- **Python** (v3.8 atau lebih tinggi)
- **Git** untuk version control
- **Akun Supabase** (untuk production)
- **pip** untuk instalasi package Python

## 🚀 Deployment Options

SpecWeave dapat di-deploy dengan beberapa cara:

### Option 1: Railway (Recommended) ⭐
Deploy ke Railway untuk deployment yang cepat dan mudah!

- ✅ **Zero Configuration** - Deploy langsung dari GitHub
- ✅ **Auto Deploy** - Otomatis deploy setiap push ke main branch
- ✅ **Free Tier** - $5 credit gratis setiap bulan
- ✅ **Built-in Database** - PostgreSQL included
- ✅ **Custom Domain** - Support custom domain gratis

**Quick Start:**
```bash
# 1. Push ke GitHub
git push origin main

# 2. Connect ke Railway
# - Login ke railway.app
# - New Project → Deploy from GitHub
# - Pilih repository SpecWeave
# - Railway akan auto-detect dan deploy

# 3. Setup Environment Variables di Railway Dashboard
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dll
```

### Option 2: Docker (VPS/Cloud)
Deploy ke VPS atau cloud provider dengan Docker.

- ✅ **Full control server**
- ✅ **Custom configuration**
- ✅ **Scalable infrastructure**

📖 **[Panduan Deploy dengan Docker](./README-DOCKER.md)**

### Option 3: Local Development
Jalankan di local machine untuk development.

## 🚀 Panduan Instalasi (Local Development)

### 1. Clone Repository
```bash
git clone https://github.com/MuhammadGhazivedaBelvanaufal/SpecWeave.git
cd SpecWeave
```

### 2. Setup Environment Variables

#### Frontend (.env di aplikasi-klien/)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:5003
```

#### Backend (.env di aplikasi-server/)
```env
PORT=5003
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
NODE_ENV=development
```

### 3. Install Dependencies

#### Frontend
```bash
cd aplikasi-klien
npm install
```

#### Backend
```bash
cd aplikasi-server
npm install
```

#### Python Dependencies (untuk METEOR & Sentence-BERT)
```bash
cd aplikasi-server/src/python
pip install -r requirements.txt
```

### 4. Setup Database
```bash
# Copy environment variables
cp konfigurasi/pengembangan.env aplikasi-server/.env
cp konfigurasi/pengembangan.env aplikasi-klien/.env

# Konfigurasi Supabase credentials di file .env
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 5. Jalankan Aplikasi

#### Menggunakan Script Utility (Direkomendasikan)
```bash
# Start frontend dan backend sekaligus
cd skrip-utilitas
setup-lengkap.bat
```

#### Manual Start
```bash
# Terminal 1 - Backend
cd aplikasi-server
npm run dev

# Terminal 2 - Frontend
cd aplikasi-klien
npm run dev
```

### 6. Akses Aplikasi
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5003
- **Health Check**: http://localhost:5003/api/health

## 📖 Panduan Penggunaan

### 1. Autentikasi
- Register atau login melalui landing page
- Autentikasi dikelola melalui Supabase
- Setiap user memiliki workspace terpisah

### 2. Setup JIRA
- Konfigurasi koneksi JIRA menggunakan API token
- **Manual Setup**: Gunakan API token untuk autentikasi yang aman
- Lihat [Dokumentasi Integrasi JIRA](./docs/README.md) untuk panduan detail

### 3. Generate Skenario
- Gunakan interface chat untuk mendeskripsikan kebutuhan
- AI akan generate skenario Gherkin
- Review metrik kualitas dari evaluasi METEOR dan Sentence-BERT
- Edit dan refine skenario sesuai kebutuhan

### 4. Export ke JIRA
- Pilih skenario yang sudah di-generate
- Pilih target JIRA project dan epic
- Export sebagai user story dengan satu klik
- Track export history di dashboard

### 5. Kelola Template
- Buat template skenario yang dapat digunakan kembali
- Organisir template berdasarkan kategori
- Gunakan template untuk struktur skenario yang konsisten

### 6. Monitor Kualitas
- Lihat dashboard analytics untuk trend kualitas
- Review metrik METEOR dan Sentence-BERT
- Track performa tim dan improvement over time

## 🔧 Konfigurasi

### Environment Setup
- Copy file `.env.example` dan konfigurasi dengan nilai kamu
- Pastikan semua environment variable yang required sudah di-set
- Konfigurasi JIRA credentials untuk fitur integrasi

### Database Configuration
- Supabase PostgreSQL untuk production
- Better-SQLite3 untuk local development (optional)
- Jalankan migrations sebelum penggunaan pertama

### METEOR & Sentence-BERT Evaluation
- Setup Python environment diperlukan
- NLTK data akan di-download otomatis saat pertama kali dijalankan
- Custom evaluation metrics dapat dikonfigurasi di `aplikasi-server/src/python/`

### Performance Monitoring
- Health check endpoint tersedia di `/api/health`
- Performance metrics di `/api/performance`
- Monitoring middleware aktif di production mode

## 🧪 Testing

### Run Frontend Tests
```bash
cd aplikasi-klien
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
```

### Run Backend Tests
```bash
cd aplikasi-server
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Property-Based Testing
```bash
# Frontend property tests
cd aplikasi-klien
npm test -- --grep "property"

# Backend property tests
cd aplikasi-server
npm test -- src/test/properties/
```

### Integration Tests
```bash
cd aplikasi-server
npm test -- src/test/integration/
```

### METEOR & Sentence-BERT Evaluation Test
```bash
cd aplikasi-server/src/python
python test_calculators.py
python test_meteor_properties.py
python test_sentence_bert_properties.py
```

## 📁 Struktur Project

### Frontend (aplikasi-klien/)
```
src/
├── components/          # Komponen UI yang dapat digunakan kembali
│   ├── auth/           # Komponen autentikasi
│   ├── chat/           # Komponen chat interface
│   ├── dashboard/      # Komponen dashboard
│   ├── jira/           # Komponen integrasi JIRA
│   ├── common/         # Komponen umum (Button, Modal, dll)
│   └── base/           # Base components (Header, ErrorBoundary)
├── pages/              # Halaman utama aplikasi
├── services/           # Integrasi API dan service eksternal
├── hooks/              # Custom React hooks
├── contexts/           # React context providers
├── utils/              # Fungsi utility dan konstanta
└── assets/             # Asset statis dan styles
```

### Backend (aplikasi-server/)
```
src/
├── controllers/        # Request handlers
│   ├── optimized/     # Optimized controllers
│   └── __tests__/     # Controller tests
├── routes/            # Definisi route API
├── services/          # Business logic services
│   ├── optimized/     # Optimized services
│   └── __tests__/     # Service tests
├── middlewares/       # Express middlewares
├── database/          # Database handlers dan migrations
│   ├── handlers/      # Database operation handlers
│   ├── migrations/    # Database migrations
│   ├── optimizations/ # Query optimizations
│   └── validators/    # Data validators
├── python/            # Script Python untuk evaluasi
├── utils/             # Utility functions
└── config/            # File konfigurasi
```

## 🤝 Kontribusi

1. Fork repository ini
2. Buat feature branch (`git checkout -b feature/fitur-keren`)
3. Commit perubahan kamu (`git commit -m 'Tambah fitur keren'`)
4. Push ke branch (`git push origin feature/fitur-keren`)
5. Buat Pull Request

### Panduan Development
- Ikuti code style dan konvensi yang ada
- Tambahkan test untuk fitur baru
- Update dokumentasi sesuai kebutuhan
- Pastikan semua test pass sebelum submit PR
- Gunakan [SpecWeave Design System](./aplikasi-klien/SPECWEAVE_DESIGN_SYSTEM.md) untuk UI components

## 📝 Dokumentasi API

### Authentication Endpoints
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/logout` - Logout user

### Gherkin Generation
- `POST /api/gherkin/generate` - Generate skenario dari requirements
- `GET /api/gherkin/history` - Ambil history skenario user
- `GET /api/gherkin/:id` - Ambil detail skenario spesifik

### JIRA Integration
- `POST /api/jira/connections` - Buat koneksi JIRA
- `GET /api/jira/connections` - Ambil koneksi JIRA user
- `POST /api/jira/connect` - Connect ke JIRA instance (manual setup)
- `GET /api/jira/projects` - Ambil daftar project yang tersedia
- `GET /api/jira/epics/:projectId` - Ambil epic dari project
- `POST /api/jira/export` - Export skenario ke JIRA

### Evaluation
- `POST /api/evaluation/meteor` - Evaluasi kualitas dengan METEOR
- `POST /api/evaluation/sentence-bert` - Evaluasi dengan Sentence-BERT
- `GET /api/evaluation/history` - Ambil history evaluasi

### Template Management
- `GET /api/templates` - Ambil semua template
- `POST /api/templates` - Buat template baru
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Hapus template

### Reference Library
- `GET /api/references` - Ambil semua referensi
- `POST /api/references` - Tambah referensi baru
- `PUT /api/references/:id` - Update referensi
- `DELETE /api/references/:id` - Hapus referensi

### System Health
- `GET /api/health` - Health check endpoint
- `GET /api/performance` - Performance metrics

Untuk dokumentasi API lengkap, lihat endpoint aplikasi atau hubungi tim development.

## 🐛 Troubleshooting

### Masalah Umum

#### Frontend tidak bisa start
- Cek versi Node.js (v16+ required)
- Verifikasi environment variables sudah di-set
- Clear npm cache: `npm cache clean --force`
- Hapus `node_modules` dan install ulang: `rm -rf node_modules && npm install`

#### Backend connection errors
- Pastikan backend berjalan di port yang benar (default: 5003)
- Cek konfigurasi Supabase
- Verifikasi database migrations sudah complete
- Cek log di `aplikasi-server/logs/`

#### METEOR/Sentence-BERT evaluation gagal
- Cek instalasi Python dan versi (v3.8+ required)
- Install required packages: `pip install -r requirements.txt`
- Verifikasi NLTK data sudah ter-download
- Cek Python path di environment variables

#### JIRA integration issues
- **Connection Problems**: Cek JIRA credentials dan permissions
- **Configuration Issues**: Verifikasi JIRA URL dan API token
- Pastikan JIRA API enabled
- Cek network connectivity ke JIRA server
- Review error logs untuk detail spesifik

#### Performance issues
- Cek health endpoint: `http://localhost:5003/api/health`
- Review performance metrics: `http://localhost:5003/api/performance`
- Clear browser cache dan cookies
- Restart backend server

### Mendapatkan Bantuan
- Cek existing issues di GitHub
- Buat issue baru dengan deskripsi detail
- Include error logs dan environment details
- Sertakan langkah-langkah untuk reproduce issue

## 📚 Dokumentasi

- **[Design System](./aplikasi-klien/SPECWEAVE_DESIGN_SYSTEM.md)** - Panduan design system SpecWeave
- **[Integrasi JIRA](./docs/README.md)** - Dokumentasi integrasi JIRA
- **[Development Docs](./pengembangan/README.md)** - Dokumentasi development dan arsitektur
- **[Python Evaluation](./aplikasi-server/src/python/README.md)** - Dokumentasi sistem evaluasi Python

## 📄 Lisensi

Project ini dilisensikan di bawah MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## 👥 Tim

- **Muhammad Ghaziveda Belvanaufal** - Lead Developer
- **Contributors** - Lihat [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 🙏 Acknowledgments

- Sistem evaluasi METEOR untuk metrik kualitas
- Sentence-BERT untuk semantic similarity evaluation
- Supabase untuk infrastruktur backend
- Komunitas React dan Node.js
- JIRA API untuk kemampuan integrasi
- Fast-check untuk property-based testing framework

## 📊 Status Project

- ✅ Fungsionalitas inti complete
- ✅ Integrasi JIRA API token implemented
- ✅ JIRA manual setup working
- ✅ Sistem evaluasi METEOR aktif
- ✅ Sistem evaluasi Sentence-BERT aktif
- ✅ Sistem autentikasi implemented
- ✅ Template management functional
- ✅ Property-based testing implemented
- ✅ Performance monitoring active
- ✅ Dokumentasi komprehensif tersedia
- 🔄 Continuous improvements dan bug fixes

## 🔮 Roadmap Kedepan

- [ ] Integrasi AI model yang lebih advanced
- [ ] Support multi-language (Bahasa Indonesia, English)
- [ ] Enhanced analytics dashboard dengan lebih banyak insights
- [ ] Mobile application (React Native)
- [ ] Enterprise features (team management, role-based access)
- [ ] API rate limiting dan caching yang lebih robust
- [ ] Advanced JIRA workflow integration
- [ ] Export ke format lain (PDF, Excel, Markdown)
- [ ] Collaboration features (real-time editing, comments)
- [ ] AI-powered scenario suggestions dan improvements

---

Untuk informasi lebih lanjut, kunjungi [dokumentasi](./pengembangan/README.md) atau hubungi tim development.