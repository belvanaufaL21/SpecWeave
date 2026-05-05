# Perbaikan: Project Jira Masih Menyimpan Data Lama Setelah Refresh

## 🔍 Analisis Masalah

### Gejala
- Setelah mengganti project Jira, kadang masih menampilkan project lama saat refresh
- Data project tidak konsisten antara localStorage dan database
- Epic context kadang masih terkait dengan project lama

### Akar Masalah

#### 1. **Race Condition antara localStorage dan Database**
```javascript
// Di JiraProjectManagementModal.jsx (baris 298-301)
// CATATAN: window.location.reload() sengaja DIHAPUS. Reload memaksa
// re-init state dari sumber yang belum tentu sinkron (race antara
// backend save dan cleanupInvalidActiveProjects di JiraContext yang
// dapat me-revert localStorage berdasarkan flag is_active lama).
```

**Masalah:**
- Saat user mengganti project, data disimpan ke:
  1. localStorage (`activeProjectsPerChat`)
  2. Backend API (`/active-projects`)
- Saat refresh, `JiraContext.loadInitialData()` memanggil:
  1. `jiraService.getConnections()` - mengambil dari database
  2. `cleanupInvalidActiveProjects(connections)` - membersihkan localStorage
- **Race condition terjadi** karena:
  - Backend mungkin belum selesai update flag `is_active`
  - `cleanupInvalidActiveProjects` membaca connections dengan flag lama
  - localStorage di-revert ke project lama

#### 2. **Dual Storage System yang Tidak Sinkron**
```javascript
// ProjectStateManager menggunakan database
const activeProjectResult = await UserDataService.getActiveProject();

// JiraProjectManagementModal menggunakan localStorage
const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
```

**Masalah:**
- Ada 2 source of truth:
  - `localStorage.activeProjectsPerChat` (per-chat)
  - Database `active_projects` table (global)
- Tidak ada mekanisme sinkronisasi yang reliable

#### 3. **Backend Tidak Mengembalikan Flag is_active yang Konsisten**
```javascript
// supabaseService.js - getUserJiraConnections
.select('*')
.eq('user_id', userId)
// REMOVED: .eq('is_active', true) - Allow multiple active connections
// All connections are now returned, regardless of is_active status
```

**Masalah:**
- Backend mengembalikan semua connections tanpa filter `is_active`
- Flag `is_active` di database tidak di-update saat user ganti project
- Frontend harus mengandalkan localStorage yang bisa tidak sinkron

## 🔧 Solusi

### Strategi Perbaikan

#### 1. **Sinkronisasi Immediate setelah Set Active Project**
Pastikan setelah `setActiveProject`, data langsung tersedia di semua layer:

```javascript
// Di JiraProjectManagementModal.jsx - handleSelectProject
const result = await projectStateManager.setActiveProject(connectionId, selectedProject);

if (result.success) {
  // 1. Update localStorage immediately
  const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
  activeProjects[chatId] = connectionId;
  localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
  
  // 2. Persist to backend API
  await jiraService.setActiveProjectForChat(chatId, connectionId);
  
  // 3. Force refresh connections dari database
  if (window.jiraContext?.refreshConnections) {
    await window.jiraContext.refreshConnections(true);
  }
  
  // 4. Clear Epic context
  if (window.jiraContext?.clearEpicContext) {
    await window.jiraContext.clearEpicContext();
  }
}
```

#### 2. **Tambahkan Timestamp untuk Validasi Freshness**
Tambahkan timestamp untuk mendeteksi data yang stale:

```javascript
// Saat save
const saveTimestamp = Date.now();
localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
localStorage.setItem('activeProjectsPerChat_timestamp', saveTimestamp.toString());

// Saat load
const savedTimestamp = parseInt(localStorage.getItem('activeProjectsPerChat_timestamp') || '0');
const now = Date.now();
const isStale = (now - savedTimestamp) > 60000; // 1 minute

if (isStale) {
  // Refresh from database
  await refreshFromDatabase();
}
```

#### 3. **Perbaiki cleanupInvalidActiveProjects**
Jangan cleanup jika data baru saja di-save:

```javascript
// activeProjectHelpers.js
export const cleanupInvalidActiveProjects = (connections) => {
  try {
    // GUARD: Don't cleanup if data was recently saved
    const savedTimestamp = parseInt(localStorage.getItem('activeProjectsPerChat_timestamp') || '0');
    const now = Date.now();
    const recentlySaved = (now - savedTimestamp) < 5000; // 5 seconds
    
    if (recentlySaved) {
      console.log('⏭️ [CLEANUP] Skipping cleanup - data recently saved');
      return;
    }
    
    const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
    const validConnectionIds = connections.map(conn => conn.id);
    let hasChanges = false;
    
    // Remove invalid project IDs
    Object.keys(activeProjects).forEach(chatId => {
      const projectId = activeProjects[chatId];
      if (projectId && !validConnectionIds.includes(projectId)) {
        console.log(`🧹 [CLEANUP] Removing invalid project: ${projectId} for chat: ${chatId}`);
        delete activeProjects[chatId];
        hasChanges = true;
      }
    });
    
    // Update localStorage if there were changes
    if (hasChanges) {
      localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
      console.log('✅ [CLEANUP] Cleaned up invalid active projects');
    }
  } catch (error) {
    console.error('❌ [CLEANUP] Error cleaning up active projects:', error);
  }
};
```

#### 4. **Backend: Update Flag is_active Saat Set Active Project**
Pastikan backend update flag `is_active` di database:

```javascript
// Backend - setActiveProject endpoint
async setActiveProject(userId, connectionId) {
  // 1. Clear all is_active flags for this user
  await supabase
    .from('jira_connections')
    .update({ is_active: false })
    .eq('user_id', userId);
  
  // 2. Set new active project
  await supabase
    .from('jira_connections')
    .update({ is_active: true })
    .eq('id', connectionId)
    .eq('user_id', userId);
  
  // 3. Save to active_projects table
  await supabase
    .from('active_projects')
    .upsert({
      user_id: userId,
      connection_id: connectionId,
      updated_at: new Date().toISOString()
    });
}
```

#### 5. **Tambahkan Validation Layer di JiraContext**
Validasi consistency saat load:

```javascript
// JiraContext.jsx - loadInitialData
const connections = connectionsResult.status === 'fulfilled' && connectionsResult.value.success 
  ? connectionsResult.value.data 
  : [];

// VALIDATION: Check if localStorage matches database
const chatId = getCurrentChatId();
const localActiveProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
const localActiveProjectId = localActiveProjects[chatId];

if (localActiveProjectId) {
  const connectionExists = connections.some(conn => conn.id === localActiveProjectId);
  
  if (!connectionExists) {
    console.warn('⚠️ [VALIDATION] localStorage has invalid project, clearing...');
    delete localActiveProjects[chatId];
    localStorage.setItem('activeProjectsPerChat', JSON.stringify(localActiveProjects));
  } else {
    // Validate against database active_projects
    const dbActiveProject = await UserDataService.getActiveProject();
    
    if (dbActiveProject.success && dbActiveProject.data) {
      const dbActiveProjectId = dbActiveProject.data.id;
      
      if (dbActiveProjectId !== localActiveProjectId) {
        console.warn('⚠️ [VALIDATION] localStorage and database mismatch, using database...');
        localActiveProjects[chatId] = dbActiveProjectId;
        localStorage.setItem('activeProjectsPerChat', JSON.stringify(localActiveProjects));
      }
    }
  }
}
```

## 📝 Implementasi

### File yang Perlu Diubah

1. **aplikasi-klien/src/utils/helpers/activeProjectHelpers.js**
   - Tambahkan timestamp guard di `cleanupInvalidActiveProjects`

2. **aplikasi-klien/src/components/modals/JiraProjectManagementModal.jsx**
   - Tambahkan timestamp saat save
   - Tambahkan validation setelah save

3. **aplikasi-klien/src/contexts/JiraContext.jsx**
   - Tambahkan validation layer di `loadInitialData`
   - Skip cleanup jika data baru saja di-save

4. **aplikasi-server/src/services/supabaseService.js**
   - Update flag `is_active` saat set active project

5. **aplikasi-server/src/controllers/userDataController.js**
   - Tambahkan endpoint untuk update `is_active` flag

## ✅ Testing

### Test Cases

1. **Test: Ganti Project dan Refresh**
   ```
   1. Login dan buka chat
   2. Ganti project dari A ke B
   3. Refresh browser
   4. Verify: Project B masih aktif (bukan A)
   ```

2. **Test: Multiple Tabs**
   ```
   1. Buka 2 tabs dengan chat yang sama
   2. Di tab 1, ganti project dari A ke B
   3. Di tab 2, refresh
   4. Verify: Tab 2 menampilkan project B
   ```

3. **Test: Delete Active Project**
   ```
   1. Set project A sebagai active
   2. Delete project A
   3. Refresh browser
   4. Verify: Tidak ada project aktif atau fallback ke project lain
   ```

4. **Test: Epic Context Consistency**
   ```
   1. Set project A dan pilih Epic X
   2. Ganti ke project B
   3. Refresh browser
   4. Verify: Epic context cleared, project B aktif
   ```

## 🎯 Expected Behavior

Setelah perbaikan:
- ✅ Project yang dipilih konsisten setelah refresh
- ✅ localStorage dan database selalu sinkron
- ✅ Epic context otomatis clear saat ganti project
- ✅ Tidak ada race condition antara save dan cleanup
- ✅ Multiple tabs tetap konsisten

## 🚨 Breaking Changes

Tidak ada breaking changes, hanya perbaikan internal logic.

## 📚 Related Issues

- Race condition antara localStorage dan database
- Epic context tidak clear saat ganti project
- `cleanupInvalidActiveProjects` terlalu agresif
- Backend tidak update flag `is_active`
