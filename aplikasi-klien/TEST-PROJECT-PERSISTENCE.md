# Test Plan: Project Persistence After Refresh

## 🎯 Tujuan Testing
Memastikan project yang dipilih tetap konsisten setelah refresh browser dan tidak kembali ke project lama.

## 🔧 Perbaikan yang Diimplementasikan

### 1. **Timestamp Guard di cleanupInvalidActiveProjects**
- **File**: `aplikasi-klien/src/utils/helpers/activeProjectHelpers.js`
- **Perubahan**: Menambahkan timestamp check untuk mencegah cleanup dalam 10 detik setelah save
- **Tujuan**: Mencegah race condition dimana cleanup me-revert localStorage sebelum backend selesai update

### 2. **Timestamp Saat Save di JiraProjectManagementModal**
- **File**: `aplikasi-klien/src/components/modals/JiraProjectManagementModal.jsx`
- **Perubahan**: Menyimpan timestamp saat save active project
- **Tujuan**: Memberikan signal ke cleanup untuk skip validation

### 3. **Validation Layer di JiraContext**
- **File**: `aplikasi-klien/src/contexts/JiraContext.jsx`
- **Perubahan**: Menambahkan validation localStorage vs database saat load
- **Tujuan**: Memastikan consistency antara localStorage dan database

### 4. **Backend: Clear All is_active Flags**
- **File**: `aplikasi-server/src/services/supabaseService.js`
- **Perubahan**: Clear semua `is_active` flags sebelum set yang baru
- **Tujuan**: Memastikan hanya satu project yang active di database

## 📋 Test Cases

### Test 1: Basic Project Switch and Refresh
**Objective**: Memastikan project yang dipilih tetap setelah refresh

**Steps**:
1. Login ke aplikasi
2. Buka halaman chat
3. Klik JIRA indicator, pilih Project A
4. Verify: JIRA indicator menampilkan Project A
5. Refresh browser (F5)
6. Verify: JIRA indicator masih menampilkan Project A (bukan project lain)

**Expected Result**:
- ✅ Project A tetap aktif setelah refresh
- ✅ Tidak ada flash/flicker ke project lain
- ✅ Console log menunjukkan validation success

**Console Logs to Check**:
```
💾 [PROJECT-MODAL] Saved to localStorage with timestamp: {...}
✅ [CLEANUP] No invalid projects found
✅ [VALIDATION] localStorage and database are consistent
```

---

### Test 2: Project Switch with Epic Context
**Objective**: Memastikan Epic context di-clear saat ganti project

**Steps**:
1. Login ke aplikasi
2. Pilih Project A dan Epic X
3. Verify: Epic indicator menampilkan Epic X
4. Ganti ke Project B
5. Verify: Epic indicator menampilkan "No Epic Selected"
6. Refresh browser
7. Verify: Project B aktif, Epic masih "No Epic Selected"

**Expected Result**:
- ✅ Epic context di-clear saat ganti project
- ✅ Setelah refresh, Epic tetap cleared
- ✅ Project B tetap aktif

**Console Logs to Check**:
```
🧹 [PROJECT-MODAL] Clearing epic context due to project change
⏭️ [CLEANUP] Skipping cleanup - data recently saved
✅ [VALIDATION] localStorage and database are consistent
```

---

### Test 3: Multiple Tabs Consistency
**Objective**: Memastikan perubahan project di satu tab ter-sync ke tab lain

**Steps**:
1. Buka 2 tabs dengan chat yang sama
2. Di Tab 1: Pilih Project A
3. Di Tab 2: Refresh browser
4. Verify Tab 2: Menampilkan Project A
5. Di Tab 2: Ganti ke Project B
6. Di Tab 1: Refresh browser
7. Verify Tab 1: Menampilkan Project B

**Expected Result**:
- ✅ Perubahan di satu tab ter-sync ke tab lain setelah refresh
- ✅ Tidak ada conflict antara tabs

**Console Logs to Check**:
```
📢 [PROJECT-MODAL] Dispatching update events
✅ [VALIDATION] localStorage and database are consistent
```

---

### Test 4: Delete Active Project
**Objective**: Memastikan sistem handle dengan baik saat active project di-delete

**Steps**:
1. Login dan pilih Project A sebagai active
2. Buka Project Management Modal
3. Delete Project A
4. Verify: Modal menampilkan project lain atau empty state
5. Refresh browser
6. Verify: Tidak ada error, sistem fallback ke project lain atau no active project

**Expected Result**:
- ✅ Delete berhasil tanpa error
- ✅ Setelah refresh, tidak ada reference ke Project A yang sudah dihapus
- ✅ Epic context di-clear jika terkait dengan Project A

**Console Logs to Check**:
```
🧹 [CLEANUP] Removing invalid project: {...}
✅ [CLEANUP] Cleaned up invalid active projects
```

---

### Test 5: Race Condition Prevention
**Objective**: Memastikan timestamp guard mencegah race condition

**Steps**:
1. Login dan pilih Project A
2. Immediately refresh browser (dalam 2 detik)
3. Verify: Project A tetap aktif
4. Check console logs untuk timestamp guard

**Expected Result**:
- ✅ Project A tetap aktif meskipun refresh cepat
- ✅ Cleanup di-skip karena data baru saja di-save

**Console Logs to Check**:
```
💾 [PROJECT-MODAL] Saved to localStorage with timestamp: {...}
⏭️ [CLEANUP] Skipping cleanup - data recently saved (Xs remaining)
```

---

### Test 6: Backend Consistency
**Objective**: Memastikan backend hanya set satu project sebagai active

**Steps**:
1. Login dan pilih Project A
2. Check database: `SELECT * FROM jira_connections WHERE user_id = '...' AND is_active = true`
3. Verify: Hanya Project A yang `is_active = true`
4. Ganti ke Project B
5. Check database lagi
6. Verify: Hanya Project B yang `is_active = true`, Project A sudah `is_active = false`

**Expected Result**:
- ✅ Hanya satu project yang `is_active = true` di database
- ✅ Flag `is_active` di-update dengan benar

**Backend Logs to Check**:
```
✅ [SUPABASE] Set active project: { userId: '...', connectionId: '...', projectKey: '...' }
```

---

### Test 7: Validation Layer
**Objective**: Memastikan validation layer mendeteksi dan memperbaiki inconsistency

**Steps**:
1. Login dan pilih Project A
2. Manually edit localStorage: Set project B sebagai active
3. Refresh browser
4. Verify: Sistem mendeteksi mismatch dan menggunakan database (Project A)

**Expected Result**:
- ✅ Validation mendeteksi mismatch
- ✅ localStorage di-update sesuai database
- ✅ UI menampilkan project yang benar

**Console Logs to Check**:
```
⚠️ [VALIDATION] localStorage and database mismatch, using database...
✅ [VALIDATION] localStorage updated to match database
```

---

## 🐛 Known Issues to Watch

### Issue 1: Cleanup Terlalu Agresif
**Symptom**: Project kembali ke project lama setelah refresh
**Root Cause**: `cleanupInvalidActiveProjects` dipanggil sebelum backend selesai update
**Fix**: Timestamp guard mencegah cleanup dalam 10 detik setelah save

### Issue 2: Multiple Active Projects di Database
**Symptom**: Beberapa project memiliki `is_active = true`
**Root Cause**: Backend tidak clear flag lama sebelum set yang baru
**Fix**: Backend sekarang clear semua flags sebelum set yang baru

### Issue 3: localStorage dan Database Tidak Sinkron
**Symptom**: UI menampilkan project berbeda setelah refresh
**Root Cause**: Tidak ada validation layer
**Fix**: Validation layer di JiraContext memastikan consistency

---

## 📊 Success Criteria

Semua test cases harus pass dengan kriteria:
- ✅ Project yang dipilih tetap konsisten setelah refresh
- ✅ Tidak ada flash/flicker ke project lain
- ✅ Epic context di-clear saat ganti project
- ✅ Multiple tabs tetap konsisten
- ✅ Delete active project tidak menyebabkan error
- ✅ Timestamp guard mencegah race condition
- ✅ Backend hanya set satu project sebagai active
- ✅ Validation layer mendeteksi dan memperbaiki inconsistency

---

## 🔍 Debugging Tips

### Check Console Logs
```javascript
// Timestamp guard
⏭️ [CLEANUP] Skipping cleanup - data recently saved (Xs remaining)

// Validation success
✅ [VALIDATION] localStorage and database are consistent

// Validation mismatch
⚠️ [VALIDATION] localStorage and database mismatch, using database...

// Backend update
✅ [SUPABASE] Set active project: {...}
```

### Check localStorage
```javascript
// In browser console
localStorage.getItem('activeProjectsPerChat')
localStorage.getItem('activeProjectsPerChat_timestamp')
```

### Check Database
```sql
-- Check active projects
SELECT id, project_key, project_name, is_active, updated_at 
FROM jira_connections 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY updated_at DESC;

-- Should only have ONE is_active = true
```

---

## 🚀 Next Steps

1. Run all test cases manually
2. Fix any issues found
3. Add automated tests if needed
4. Monitor production for any edge cases
5. Update documentation based on findings
