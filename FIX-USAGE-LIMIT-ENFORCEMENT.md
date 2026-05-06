# 🔧 Fix: Usage Limit Not Enforced

## 🐛 Problem

User masih bisa menggunakan model yang sudah habis quota-nya. Sistem cooldown sudah berjalan tapi **limit checking tidak di-enforce** di beberapa endpoint.

### Root Cause:

Middleware `checkUsageLimit` **hanya dipasang di `/gherkin/generate`**, tapi tidak di endpoint lain yang menggunakan AI/LLM:
- ❌ `/testing/meteor` - No limit check
- ❌ `/testing/sentence-bert` - No limit check
- ❌ `/testing/batch` - No limit check
- ❌ `/testing/dual-evaluation` - No limit check
- ❌ `/subtasks/generate` - No limit check
- ❌ `/subtasks/create` - No limit check

**Result:** User bisa bypass limit dengan menggunakan endpoint testing/subtask!

---

## ✅ Solution

Add `checkUsageLimit` middleware ke semua endpoint yang menggunakan AI/LLM.

### Files Changed:

#### 1. `aplikasi-server/src/routes/testingRoutes.js`

**Before:**
```javascript
router.post('/meteor', optionalAuth, runMeteorTest);
router.post('/sentence-bert', optionalAuth, runSentenceBertTest);
router.post('/batch', optionalAuth, runBatchTest);
router.post('/dual-evaluation', optionalAuth, runDualEvaluation);
```

**After:**
```javascript
import { checkUsageLimit } from '../middleware/usageLimitMiddleware.js';

router.post('/meteor', optionalAuth, checkUsageLimit, runMeteorTest);
router.post('/sentence-bert', optionalAuth, checkUsageLimit, runSentenceBertTest);
router.post('/batch', optionalAuth, checkUsageLimit, runBatchTest);
router.post('/dual-evaluation', optionalAuth, checkUsageLimit, runDualEvaluation);
```

#### 2. `aplikasi-server/src/routes/subtaskRoutes.js`

**Before:**
```javascript
router.post('/generate', [...validation], subtaskController.generateSubtasks);
router.post('/create', [...validation], subtaskController.createSubtasks);
```

**After:**
```javascript
import { checkUsageLimit } from '../middleware/usageLimitMiddleware.js';

router.post('/generate', checkUsageLimit, [...validation], subtaskController.generateSubtasks);
router.post('/create', checkUsageLimit, [...validation], subtaskController.createSubtasks);
```

---

## 🔍 How Middleware Works

### Flow:

```
1. User makes request → POST /testing/meteor
2. optionalAuth middleware → Authenticate user (if logged in)
3. checkUsageLimit middleware → Check quota
   ├─ If quota available → Continue to controller
   └─ If quota exhausted → Return 429 with countdown
4. Controller → Process request
```

### Middleware Logic:

```javascript
export const checkUsageLimit = async (req, res, next) => {
  // Skip for anonymous users
  if (!req.user?.id) {
    return next();
  }

  // Extract model from request
  const modelName = req.body.model || 'llama-3.1-8b-instant';

  // Check limit with cooldown logic
  const limitCheck = await usageLimitService.checkLimit(req.user.id, modelName);

  // If exhausted, return 429
  if (!limitCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'USAGE_LIMIT_EXCEEDED',
        message: `Batas request tercapai untuk model ${limitCheck.displayName}.`,
        model: limitCheck.modelName,
        displayName: limitCheck.displayName,
        limit: limitCheck.limit,
        used: limitCheck.used,
        resetsAt: limitCheck.resetsAt, // Countdown info
        alternatives: limitCheck.alternatives
      }
    });
  }

  // If allowed, continue
  req.usageLimit = limitCheck;
  next();
};
```

---

## 🧪 Testing

### Test 1: Exhaust Quota

1. User pakai model sampai habis (e.g., 50/50)
2. Try to use `/testing/meteor` endpoint
3. **Expected:** Return 429 with countdown

**Before Fix:**
```json
{
  "success": true,
  "data": { ... }  ← Still works! (BUG)
}
```

**After Fix:**
```json
{
  "success": false,
  "error": {
    "code": "USAGE_LIMIT_EXCEEDED",
    "message": "Batas request tercapai untuk model Gemini 2.5 Flash.",
    "limit": 50,
    "used": 50,
    "resetsAt": "2026-05-07T10:00:00Z",
    "alternatives": [...]
  }
}
```

### Test 2: Verify All Endpoints

```bash
# Test each endpoint with exhausted quota
curl -X POST /api/testing/meteor -H "Authorization: Bearer TOKEN" -d '{"model":"gemini-2.5-flash"}'
curl -X POST /api/testing/sentence-bert -H "Authorization: Bearer TOKEN" -d '{"model":"gemini-2.5-flash"}'
curl -X POST /api/testing/batch -H "Authorization: Bearer TOKEN" -d '{"model":"gemini-2.5-flash"}'
curl -X POST /api/testing/dual-evaluation -H "Authorization: Bearer TOKEN" -d '{"model":"gemini-2.5-flash"}'
curl -X POST /api/subtasks/generate -H "Authorization: Bearer TOKEN" -d '{"model":"gemini-2.5-flash"}'
curl -X POST /api/subtasks/create -H "Authorization: Bearer TOKEN" -d '{"model":"gemini-2.5-flash"}'
```

**Expected:** All return 429 with countdown

---

## 📊 Endpoints with Limit Check

### ✅ Now Protected:

| Endpoint | Method | Middleware | Status |
|----------|--------|------------|--------|
| `/gherkin/generate` | POST | ✅ checkUsageLimit | Already had |
| `/testing/meteor` | POST | ✅ checkUsageLimit | **Added** |
| `/testing/sentence-bert` | POST | ✅ checkUsageLimit | **Added** |
| `/testing/meteor/stream` | POST | ✅ checkUsageLimit | **Added** |
| `/testing/sentence-bert/stream` | POST | ✅ checkUsageLimit | **Added** |
| `/testing/batch` | POST | ✅ checkUsageLimit | **Added** |
| `/testing/dual-evaluation` | POST | ✅ checkUsageLimit | **Added** |
| `/subtasks/generate` | POST | ✅ checkUsageLimit | **Added** |
| `/subtasks/create` | POST | ✅ checkUsageLimit | **Added** |

### ❌ Not Protected (No AI/LLM):

| Endpoint | Reason |
|----------|--------|
| `/testing/results` | GET - No AI usage |
| `/testing/statistics` | GET - No AI usage |
| `/subtasks/hierarchy` | GET - No AI usage |
| `/subtasks/bulk-update` | PUT - No AI usage |

---

## 🎯 Expected Behavior

### Scenario 1: User with Available Quota

```
User: 48/50 remaining
Request: POST /testing/meteor
Result: ✅ Success - Test runs normally
```

### Scenario 2: User with Exhausted Quota

```
User: 0/50 remaining (exhausted 2 hours ago)
Request: POST /testing/meteor
Result: ❌ 429 Error
Response: {
  "error": {
    "code": "USAGE_LIMIT_EXCEEDED",
    "message": "Batas request tercapai...",
    "resetsAt": "2026-05-07T10:00:00Z"  ← Countdown
  }
}
```

### Scenario 3: User After 24 Hours

```
User: 0/50 remaining (exhausted 24 hours ago)
Request: POST /testing/meteor
Result: ✅ Success - Auto-reset triggered
New count: 1/50
```

---

## 🔧 Frontend Handling

Frontend should handle 429 error and show countdown:

```javascript
try {
  const response = await api.post('/testing/meteor', { model, ... });
  // Success
} catch (error) {
  if (error.response?.status === 429) {
    const { resetsAt, alternatives } = error.response.data.error;
    
    // Show countdown
    showNotification({
      type: 'error',
      message: `Limit reached. Resets in ${formatTimeRemaining(resetsAt)}`,
      alternatives: alternatives
    });
  }
}
```

---

## ✅ Verification Checklist

After deployment:

- [ ] User with exhausted quota cannot use `/testing/meteor`
- [ ] User with exhausted quota cannot use `/testing/sentence-bert`
- [ ] User with exhausted quota cannot use `/testing/batch`
- [ ] User with exhausted quota cannot use `/testing/dual-evaluation`
- [ ] User with exhausted quota cannot use `/subtasks/generate`
- [ ] User with exhausted quota cannot use `/subtasks/create`
- [ ] 429 response includes `resetsAt` for countdown
- [ ] 429 response includes `alternatives` list
- [ ] User with available quota can still use all endpoints
- [ ] Auto-reset works after 24 hours

---

## 📝 Summary

**Problem:** User bisa bypass limit dengan menggunakan endpoint testing/subtask

**Root Cause:** Middleware `checkUsageLimit` tidak dipasang di semua endpoint AI/LLM

**Solution:** Add middleware ke semua endpoint yang perlu limit check

**Files Changed:**
- `aplikasi-server/src/routes/testingRoutes.js` - Added middleware to 6 endpoints
- `aplikasi-server/src/routes/subtaskRoutes.js` - Added middleware to 2 endpoints

**Result:** Limit enforcement sekarang bekerja di semua endpoint! ✅

---

**Status:** ✅ Fixed - Ready to deploy
