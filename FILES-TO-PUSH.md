# Files to Push - LLM Usage Limit System

## 🚀 Essential Files Only (No Tests, No Docs)

### Backend - Core Files

#### Services (New)
```bash
git add aplikasi-server/src/services/llmProviderService.js
git add aplikasi-server/src/services/usageLimitService.js
```

#### Controllers (New)
```bash
git add aplikasi-server/src/controllers/usageController.js
```

#### Middleware (New)
```bash
git add aplikasi-server/src/middleware/usageLimitMiddleware.js
```

#### Routes (New)
```bash
git add aplikasi-server/src/routes/usageRoutes.js
```

#### Modified Files
```bash
git add aplikasi-server/src/controllers/gherkinController.js
git add aplikasi-server/src/routes/gherkinRoutes.js
git add aplikasi-server/src/routes/index.js
git add aplikasi-server/src/services/aiService.js
```

#### Migration
```bash
git add aplikasi-server/migrations/add-llm-usage-limit-system.sql
```

#### Dependencies
```bash
git add aplikasi-server/package.json
git add aplikasi-server/package-lock.json
```

### Frontend - Core Files

#### Components (New)
```bash
git add aplikasi-klien/src/components/common/ModelSelector.jsx
git add aplikasi-klien/src/components/common/UsageIndicator.jsx
```

#### Modified Files
```bash
git add aplikasi-klien/src/components/common/index.js
git add aplikasi-klien/src/pages/ChatRefined.jsx
git add aplikasi-klien/src/hooks/useChat.jsx
git add aplikasi-klien/src/services/EnhancedSpecWeaveService.js
```

### Environment
```bash
git add .env.example
```

---

## 📋 Quick Copy-Paste Commands

### All Essential Files in One Command
```bash
# Backend
git add aplikasi-server/src/services/llmProviderService.js \
        aplikasi-server/src/services/usageLimitService.js \
        aplikasi-server/src/controllers/usageController.js \
        aplikasi-server/src/middleware/usageLimitMiddleware.js \
        aplikasi-server/src/routes/usageRoutes.js \
        aplikasi-server/src/controllers/gherkinController.js \
        aplikasi-server/src/routes/gherkinRoutes.js \
        aplikasi-server/src/routes/index.js \
        aplikasi-server/src/services/aiService.js \
        aplikasi-server/migrations/add-llm-usage-limit-system.sql \
        aplikasi-server/package.json \
        aplikasi-server/package-lock.json

# Frontend
git add aplikasi-klien/src/components/common/ModelSelector.jsx \
        aplikasi-klien/src/components/common/UsageIndicator.jsx \
        aplikasi-klien/src/components/common/index.js \
        aplikasi-klien/src/pages/ChatRefined.jsx \
        aplikasi-klien/src/hooks/useChat.jsx \
        aplikasi-klien/src/services/EnhancedSpecWeaveService.js

# Environment
git add .env.example
```

### Commit & Push
```bash
git commit -m "feat: Add LLM Usage Limit System with multi-provider support

- Add llmProviderService for Groq and Gemini integration
- Add usageLimitService for per-user, per-model tracking
- Add usageController for usage info API endpoints
- Add usageLimitMiddleware for request limit enforcement
- Add ModelSelector and UsageIndicator components
- Update gherkinController to support model selection
- Add database migration for 4 new tables
- Update dependencies: @google/generative-ai"

git push origin main
```

---

## ⚠️ Files NOT to Push (Tests & Docs)

### Test Files (Skip)
- `aplikasi-server/src/services/__tests__/*`
- `aplikasi-server/src/controllers/__tests__/*`
- `aplikasi-server/src/middleware/__tests__/*`
- `aplikasi-server/src/test/integration/*`
- `aplikasi-klien/src/components/common/__tests__/*`
- `aplikasi-server/src/test/setup.js`

### Documentation Files (Skip)
- `DEPLOYMENT-*.md`
- `LLM-USAGE-LIMIT-*.md`
- `QUICK-COMMANDS.md`
- `README-DEPLOYMENT.md`
- `FILES-TO-PUSH.md`
- `aplikasi-server/DEPLOYMENT-*.md`
- `aplikasi-server/QUICK-*.md`
- `aplikasi-server/scripts/check-llm-system-readiness.js`
- `aplikasi-server/scripts/verify-llm-usage-system.sql`
- `aplikasi-server/migrations/README.md` (modified, but not critical)

---

## 🎯 After Push

Railway akan otomatis:
1. Detect new commit
2. Trigger new deployment
3. Build dengan dependencies baru
4. Deploy ke production

Tunggu ~2-3 menit untuk deployment selesai, kemudian test!
