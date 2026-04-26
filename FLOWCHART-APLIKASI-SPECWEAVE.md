# Flowchart Aplikasi SpecWeave

## 🎯 Overview Aplikasi
SpecWeave adalah aplikasi web untuk mengkonversi User Stories menjadi Gherkin Scenarios dengan dukungan AI dan integrasi JIRA.

---

## 📊 Flowchart Keseluruhan Sistem

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MULAI APLIKASI                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LANDING PAGE (/)                               │
│  • Tampilan awal aplikasi                                           │
│  • Informasi tentang SpecWeave                                      │
│  • Tombol Login/Signup                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
        ┌──────────────────┐  ┌──────────────────┐
        │   SUDAH LOGIN?   │  │   BELUM LOGIN?   │
        │   (Ada Token)    │  │   (Tidak Ada)    │
        └────────┬─────────┘  └────────┬─────────┘
                 │                     │
                 │                     ▼
                 │         ┌──────────────────────────┐
                 │         │  LOGIN/SIGNUP PAGE       │
                 │         │  (/login)                │
                 │         │  • Form Login            │
                 │         │  • Form Signup           │
                 │         │  • OAuth Integration     │
                 │         │  • Password Reset        │
                 │         └──────────┬───────────────┘
                 │                    │
                 │                    ▼
                 │         ┌──────────────────────────┐
                 │         │  AUTENTIKASI             │
                 │         │  POST /api/auth/...      │
                 │         │  • Validasi kredensial   │
                 │         │  • Generate JWT token    │
                 │         │  • Create session        │
                 │         └──────────┬───────────────┘
                 │                    │
                 └────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CHAT PAGE (/chat)                              │
│                   [HALAMAN UTAMA APLIKASI]                          │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  SIDEBAR                                                   │    │
│  │  • Chat History (riwayat percakapan)                      │    │
│  │  • Quick Actions                                          │    │
│  │  • Navigation Menu                                        │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  MAIN CHAT AREA                                           │    │
│  │  • Input User Story                                       │    │
│  │  • Chat Bubbles (user & AI)                              │    │
│  │  • Model Selector (pilih AI model)                       │    │
│  │  • Epic Context Display                                   │    │
│  └───────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              USER MENGIRIM USER STORY                               │
│  • User mengetik user story di chat input                           │
│  • Pilih model AI (Gemini/Groq/dll)                                │
│  • Optional: Pilih Epic context dari JIRA                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PROSES GENERATE GHERKIN                                │
│              POST /api/gherkin/generate                             │
│                                                                     │
│  1. Validasi input user story                                      │
│  2. Check usage limit (untuk authenticated user)                   │
│  3. Kirim ke AI Service (aiService.js)                            │
│  4. AI memproses dengan LLM Provider:                              │
│     • Gemini (Google)                                              │
│     • Groq (Fast inference)                                        │
│     • Fallback ke provider lain jika gagal                        │
│  5. Generate Gherkin scenarios                                     │
│  6. Simpan ke database                                             │
│  7. Return hasil ke client                                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              TAMPILKAN HASIL GHERKIN                                │
│  • Gherkin scenarios ditampilkan di chat bubble                    │
│  • Format dengan syntax highlighting                               │
│  • Action buttons:                                                 │
│    - Edit scenario                                                 │
│    - Copy to clipboard                                             │
│    - Export to JIRA                                                │
│    - Run tests                                                     │
│    - Save as template                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │   EDIT SCENARIO      │  │   EXPORT TO JIRA     │
    │   (Optional)         │  │   (Optional)         │
    └──────────┬───────────┘  └──────────┬───────────┘
               │                         │
               │                         ▼
               │         ┌──────────────────────────────────┐
               │         │  JIRA INTEGRATION FLOW           │
               │         │                                  │
               │         │  1. Check JIRA connection        │
               │         │     GET /api/jira/connections    │
               │         │                                  │
               │         │  2. Pilih Epic (jika ada)        │
               │         │     GET /api/jira/.../epics      │
               │         │                                  │
               │         │  3. Create User Story            │
               │         │     POST /api/jira/.../          │
               │         │          user-stories            │
               │         │                                  │
               │         │  4. Create Subtasks              │
               │         │     POST /api/jira/.../          │
               │         │          subtasks                │
               │         │                                  │
               │         │  5. Simpan export history        │
               │         └──────────┬───────────────────────┘
               │                    │
               └────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FITUR TAMBAHAN (Optional)                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  RUN TESTS                                                   │  │
│  │  POST /api/testing/...                                       │  │
│  │  • Jalankan automated tests                                 │  │
│  │  • METEOR evaluation                                        │  │
│  │  • Tampilkan hasil di /meteor-results/:testId              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  SAVE AS TEMPLATE                                            │  │
│  │  POST /api/templates                                         │  │
│  │  • Simpan scenario sebagai template                         │  │
│  │  • Reuse untuk user story serupa                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  VIEW HISTORY                                                │  │
│  │  GET /api/gherkin/history                                    │  │
│  │  • Lihat riwayat konversi                                   │  │
│  │  • Filter dan search                                        │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              NAVIGASI KE HALAMAN LAIN                               │
│                                                                     │
│  • /profile - User Profile & Settings                              │
│  • /evaluation-history - Riwayat evaluasi                         │
│  • /test-results/:scenarioId - Detail hasil test                  │
│  • /meteor-results/:testId - Hasil METEOR evaluation              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Alur Autentikasi Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTENTIKASI FLOW                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │   EMAIL/PASSWORD     │  │   OAUTH (Google,     │
    │   LOGIN              │  │   GitHub, dll)       │
    └──────────┬───────────┘  └──────────┬───────────┘
               │                         │
               ▼                         ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │  POST /api/auth/...  │  │  /auth/callback      │
    │  • Validasi email    │  │  • OAuth redirect    │
    │  • Check password    │  │  • Exchange token    │
    │  • Generate JWT      │  │  • Create session    │
    └──────────┬───────────┘  └──────────┬───────────┘
               │                         │
               └────────────┬────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │  STORE TOKEN             │
              │  • localStorage (client) │
              │  • Session (server)      │
              │  • Set auth header       │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  REDIRECT TO /chat       │
              └──────────────────────────┘
```

---

## 🤖 Alur AI Processing Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AI PROCESSING FLOW                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  User Story Input        │
              │  + Model Selection       │
              │  + Epic Context (opt)    │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  aiService.js            │
              │  • Prepare prompt        │
              │  • Add context           │
              │  • Format input          │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  llmProviderService.js   │
              │  • Route to provider     │
              │  • Handle retries        │
              │  • Fallback logic        │
              └──────────┬───────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   GEMINI     │ │     GROQ     │ │   FALLBACK   │
│   (Google)   │ │   (Fast AI)  │ │   PROVIDER   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
              ┌──────────────────────────┐
              │  Parse AI Response       │
              │  • Extract scenarios     │
              │  • Format Gherkin        │
              │  • Validate syntax       │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Save to Database        │
              │  • Store scenario        │
              │  • Link to user          │
              │  • Update history        │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Return to Client        │
              │  • Formatted response    │
              │  • Metadata              │
              │  • Action options        │
              └──────────────────────────┘
```

---

## 🔗 Alur JIRA Integration Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│                      JIRA INTEGRATION FLOW                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  Setup JIRA Connection   │
              │  POST /api/jira/         │
              │       connections        │
              │  • JIRA URL              │
              │  • Email                 │
              │  • API Token             │
              │  • Project Key           │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Test Connection         │
              │  POST /api/jira/         │
              │       test-connection    │
              │  • Validate credentials  │
              │  • Check permissions     │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Get Available Epics     │
              │  GET /api/jira/.../epics │
              │  • List project epics    │
              │  • Show epic details     │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  User Pilih Epic         │
              │  (Optional)              │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Export Scenario         │
              │  POST /api/jira/.../     │
              │       complete-story     │
              └──────────┬───────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────┐          ┌──────────────────┐
│  Create User     │          │  Create Subtasks │
│  Story in JIRA   │          │  (dari scenarios)│
│  • Title         │    ──►   │  • Given steps   │
│  • Description   │          │  • When steps    │
│  • Link to Epic  │          │  • Then steps    │
└──────────────────┘          └──────────────────┘
        │                                 │
        └────────────────┬────────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Save Export History     │
              │  • JIRA issue key        │
              │  • Export timestamp      │
              │  • Link to scenario      │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Show Success Message    │
              │  • JIRA link             │
              │  • Issue key             │
              └──────────────────────────┘
```

---

## 📱 Struktur Halaman Aplikasi

### 1. **Landing Page** (`/`)
- Hero section dengan deskripsi aplikasi
- Features showcase
- Call-to-action untuk login/signup

### 2. **Login/Signup Page** (`/login`)
- Form login dengan email/password
- Form signup untuk user baru
- OAuth integration (Google, GitHub)
- Link ke password reset

### 3. **Chat Page** (`/chat`) - **HALAMAN UTAMA**
- **Sidebar:**
  - Chat history (riwayat percakapan)
  - Quick actions
  - Navigation menu
- **Main Area:**
  - Chat interface
  - User story input
  - Gherkin output display
  - Model selector
  - Epic context selector
  - Action buttons (edit, copy, export, test)

### 4. **Profile Page** (`/profile`)
- User information
- Settings & preferences
- JIRA connection management
- API key management
- Usage statistics

### 5. **Test Results Pages**
- `/meteor-results/:testId` - METEOR evaluation results
- `/test-results/:scenarioId` - Detailed test results
- `/evaluation-history` - History of all evaluations

### 6. **Callback Pages**
- `/auth/callback` - OAuth callback handler
- `/auth/jira/callback` - JIRA OAuth callback
- `/reset-password` - Password reset handler

---

## 🗄️ Backend API Endpoints

### **Authentication** (`/api/auth`)
- `POST /auth/password-reset` - Request password reset
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get current user
- `PUT /auth/profile` - Update profile
- `PUT /auth/password` - Change password
- `POST /auth/signout` - Sign out
- `DELETE /auth/account` - Delete account
- `GET /auth/activity` - Get activity log
- `POST /auth/api-keys` - Generate API key
- `GET /auth/api-keys` - List API keys
- `DELETE /auth/api-keys/:keyId` - Revoke API key

### **Gherkin** (`/api/gherkin`)
- `POST /gherkin/generate` - Generate Gherkin from user story
- `GET /gherkin/history` - Get conversion history
- `POST /gherkin/:scenarioId/create-jira-story` - Create JIRA story
- `GET /gherkin/:scenarioId/jira-status` - Get JIRA status
- `POST /gherkin/bulk-create-jira-stories` - Bulk create JIRA stories

### **JIRA Integration** (`/api/jira`)
- `POST /jira/connections` - Create JIRA connection
- `GET /jira/connections` - Get connections
- `DELETE /jira/connections/:id` - Delete connection
- `POST /jira/test-connection` - Test new connection
- `POST /jira/connections/:id/test` - Test existing connection
- `GET /jira/connections/:id/health` - Check connection health
- `GET /jira/connections/:id/projects/:key/epics` - Get epics
- `POST /jira/connections/:id/epics/:epicId/user-stories` - Create user story
- `POST /jira/connections/:id/user-stories/:id/subtasks` - Create subtasks
- `POST /jira/connections/:id/epics/:epicId/complete-story` - Create complete story

### **Testing & Evaluation** (`/api/testing`, `/api/evaluation`)
- Testing endpoints untuk automated tests
- Evaluation endpoints untuk METEOR metrics

### **Templates** (`/api/templates`)
- Template management untuk reusable scenarios

### **Usage & Performance** (`/api/usage`, `/api/performance`)
- Usage tracking dan limits
- Performance monitoring

---

## 🔄 Data Flow Summary

```
USER INPUT (User Story)
    │
    ▼
CLIENT (React App)
    │
    ▼
API REQUEST (POST /api/gherkin/generate)
    │
    ▼
SERVER (Express.js)
    │
    ├─► Authentication Check
    │
    ├─► Usage Limit Check
    │
    ├─► AI Service (aiService.js)
    │       │
    │       ▼
    │   LLM Provider (Gemini/Groq)
    │       │
    │       ▼
    │   Generate Gherkin
    │
    ├─► Database (SQLite/Supabase)
    │       │
    │       ▼
    │   Save Scenario
    │
    ▼
RESPONSE (Gherkin Scenarios)
    │
    ▼
CLIENT (Display Results)
    │
    ├─► Edit (Optional)
    │
    ├─► Export to JIRA (Optional)
    │
    ├─► Run Tests (Optional)
    │
    └─► Save as Template (Optional)
```

---

## 🎨 Tech Stack

### **Frontend (aplikasi-klien)**
- React 18
- React Router v6
- Tailwind CSS
- Framer Motion (animations)
- Monaco Editor (code editing)
- Axios (HTTP client)
- React Hot Toast (notifications)

### **Backend (aplikasi-server)**
- Node.js 20+
- Express.js
- SQLite (better-sqlite3)
- Supabase (authentication & database)
- Google Gemini AI
- Groq SDK
- Redis (caching)
- JWT (authentication)

### **AI/ML**
- Google Gemini API
- Groq API
- Sentence-BERT (embeddings)

### **Integrations**
- JIRA REST API
- OAuth 2.0

---

## 🚀 Deployment Flow

```
DEVELOPMENT
    │
    ├─► aplikasi-klien (Vite dev server)
    │   npm run dev (port 3000)
    │
    └─► aplikasi-server (Node.js)
        npm run dev (port 5003)

PRODUCTION
    │
    ├─► aplikasi-klien
    │   npm run build → dist/
    │   Deploy to Railway/Vercel
    │
    └─► aplikasi-server
        npm start
        Deploy to Railway/Heroku
```

---

## 📝 Kesimpulan

Aplikasi SpecWeave adalah sistem lengkap untuk:
1. **Konversi User Story ke Gherkin** menggunakan AI
2. **Integrasi dengan JIRA** untuk export scenarios
3. **Testing & Evaluation** dengan METEOR metrics
4. **Template Management** untuk reusability
5. **User Management** dengan authentication & authorization

Alur utama: **Landing → Login → Chat (Generate Gherkin) → Export to JIRA**
