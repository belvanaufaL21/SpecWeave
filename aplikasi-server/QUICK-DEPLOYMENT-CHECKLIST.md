# Quick Deployment Checklist: LLM Usage Limit System

## 🚀 Quick Start (5 menit)

### ✅ Step 1: Run Migration (2 menit)
1. Buka Supabase Dashboard: https://supabase.com/dashboard/project/nthylrvtkaqqixznrtaj
2. Klik "SQL Editor" → "New Query"
3. Copy-paste isi file: `aplikasi-server/migrations/add-llm-usage-limit-system.sql`
4. Klik "Run" atau Ctrl+Enter
5. Tunggu hingga selesai

### ✅ Step 2: Verify Migration (1 menit)
1. Di SQL Editor yang sama, jalankan:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('model_tiers', 'models', 'usage_counters', 'usage_history');
```
2. Harus return 4 rows (4 tabel baru)

### ✅ Step 3: Update Railway (2 menit)
1. Buka Railway Dashboard: https://railway.app/
2. Pilih project "specweave-server"
3. Klik tab "Variables"
4. Add variable:
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSyCRqEoqiZL3QvPvXfrZd3weB_LnMwLu83s`
5. Railway akan auto-redeploy

### ✅ Step 4: Test (Optional)
1. Tunggu deployment selesai (~2-3 menit)
2. Buka aplikasi: https://specweave-client-production.up.railway.app
3. Login dan coba generate dengan berbagai model

---

## 📋 Detailed Verification (Optional)

Jika ingin verifikasi lebih detail, jalankan script:
```
aplikasi-server/scripts/verify-llm-usage-system.sql
```

Di Supabase SQL Editor untuk melihat:
- ✅ Tables (4)
- ✅ Seed data (3 tiers, 3 models)
- ✅ Indexes (5+)
- ✅ Triggers (3+)
- ✅ Foreign keys (4+)

---

## 🔧 Troubleshooting

### Migration error "relation already exists"
→ Tabel sudah ada, skip migration

### API return 500 after deployment
→ Check Railway logs untuk error detail
→ Verify GEMINI_API_KEY sudah di-set

### Frontend tidak tampil ModelSelector
→ Clear browser cache
→ Check browser console untuk error

---

## 📚 Full Documentation

Lihat file lengkap: `aplikasi-server/DEPLOYMENT-LLM-USAGE-LIMIT.md`

---

## ✨ Success Criteria

Sistem berhasil jika:
- ✅ User dapat melihat 3 model di dropdown
- ✅ User dapat generate dengan model apapun
- ✅ Sistem reject request ketika limit tercapai (429 error)
- ✅ Sistem suggest model alternatif
- ✅ Usage counter update setelah generate

---

## 🎯 What's New for Users

Setelah deployment, users akan mendapatkan:
1. **Model Selection**: Pilih dari 3 model LLM berbeda
   - Llama 3.1 8B (50 requests/user)
   - Gemini 2.5 Flash (10 requests/user)
   - Gemini 2.5 Pro (1 request/user)

2. **Usage Tracking**: Lihat sisa quota untuk setiap model

3. **Smart Suggestions**: Ketika limit tercapai, sistem suggest model alternatif

4. **Multi-Provider**: Backend otomatis route ke Groq atau Gemini sesuai model

---

## 📞 Need Help?

Review dokumentasi lengkap:
- Requirements: `.kiro/specs/llm-usage-limit-system/requirements.md`
- Tasks: `.kiro/specs/llm-usage-limit-system/tasks.md`
- Deployment: `aplikasi-server/DEPLOYMENT-LLM-USAGE-LIMIT.md`
