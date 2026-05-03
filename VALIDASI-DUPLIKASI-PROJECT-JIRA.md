# Validasi Duplikasi Project JIRA

## 📋 Deskripsi
Fitur validasi untuk mencegah pengguna menghubungkan project JIRA yang sama lebih dari satu kali dengan kredensial yang identik.

## 🎯 Tujuan
- Mencegah duplikasi koneksi project JIRA
- Memberikan feedback yang jelas kepada pengguna
- Meningkatkan user experience dengan pesan error yang informatif

## 🔍 Kriteria Duplikasi
Sebuah koneksi dianggap duplikat jika memiliki kombinasi yang sama dari:
1. **User ID** - ID pengguna yang sama
2. **JIRA URL** - URL instance JIRA yang sama
3. **Email** - Email akun JIRA yang sama
4. **Project Key** - Kode project yang sama

## 🛠️ Implementasi

### Backend

#### 1. Supabase Service (`aplikasi-server/src/services/supabaseService.js`)
```javascript
async createJiraConnection(userId, connectionData) {
  // Check for duplicate connection
  const { data: existingConnections } = await this.admin
    .from('jira_connections')
    .select('id, project_name, project_key')
    .eq('user_id', userId)
    .eq('jira_url', connectionData.jira_url)
    .eq('jira_email', connectionData.jira_email)
    .eq('project_key', connectionData.project_key);

  // If duplicate found, throw specific error
  if (existingConnections && existingConnections.length > 0) {
    const existing = existingConnections[0];
    const projectDisplay = existing.project_name && existing.project_key
      ? `${existing.project_name} (${existing.project_key})`
      : existing.project_name || existing.project_key;
    
    throw new Error(`DUPLICATE_PROJECT:${projectDisplay}`);
  }
  
  // Continue with insert...
}
```

#### 2. JIRA Controller (`aplikasi-server/src/controllers/jiraController.js`)
```javascript
export const createConnection = async (req, res) => {
  try {
    // ... validation code ...
    
    const result = await jiraService.createJiraConnection(userId, connectionData);
    
    return res.status(201).json({
      success: true,
      data: result,
      message: 'JIRA connection created successfully'
    });
  } catch (error) {
    // Handle duplicate project error specially
    if (error.message && error.message.startsWith('DUPLICATE_PROJECT:')) {
      const projectName = error.message.replace('DUPLICATE_PROJECT:', '');
      return res.status(409).json({
        success: false,
        error: `Project JIRA "${projectName}" sudah terhubung, silahkan hubungkan Project JIRA lainnya`,
        errorType: 'DUPLICATE_PROJECT',
        projectName: projectName
      });
    }
    
    // Handle other errors...
  }
};
```

### Frontend

#### 3. JIRA Setup Modal (`aplikasi-klien/src/components/modals/JiraSetupModal.jsx`)

**Error Message Handler:**
```javascript
const getErrorMessage = (error) => {
  const errorStr = String(error || '').toLowerCase();
  
  // Check for duplicate project error (special handling)
  if (errorStr.includes('sudah terhubung') || errorStr.includes('duplicate')) {
    return error; // Return as-is for duplicate errors
  }
  
  // Handle other error types...
}
```

**Error Display with Custom Styling:**
```jsx
{error && (
  <div className={`mb-4 p-3 rounded-lg ${
    error.toLowerCase().includes('sudah terhubung') || error.toLowerCase().includes('duplicate')
      ? 'bg-[#160D14] border border-[#44273D]'
      : 'bg-red-500/10 border border-red-500/20'
  }`}>
    <p className={`text-sm ${
      error.toLowerCase().includes('sudah terhubung') || error.toLowerCase().includes('duplicate')
        ? 'text-[#FF7AD0]'
        : 'text-red-400'
    }`}>{error}</p>
  </div>
)}
```

## 🎨 Styling Error Duplikasi

### Warna yang Digunakan
- **Background**: `#160D14` (Dark purple)
- **Border**: `#44273D` (Purple border)
- **Text**: `#FF7AD0` (Pink text)

### Contoh Visual
```
┌─────────────────────────────────────────────────┐
│  Project JIRA "TEST (TEST)" sudah terhubung,    │
│  silahkan hubungkan Project JIRA lainnya        │
└─────────────────────────────────────────────────┘
  Background: #160D14
  Border: #44273D
  Text: #FF7AD0
```

## 📊 Flow Diagram

```
User Input Credentials
        ↓
Test Connection (Valid)
        ↓
Submit Form
        ↓
Backend: Check Duplicate
        ↓
    ┌───┴───┐
    │       │
Duplicate   New
    │       │
    ↓       ↓
  Error   Success
  409     201
    │       │
    ↓       ↓
Display   Create
Custom    Connection
Message
```

## 🧪 Testing

### Test Case 1: Koneksi Baru (Success)
**Input:**
- JIRA URL: `https://company.atlassian.net`
- Email: `user@company.com`
- Project Key: `PROJ1`

**Expected:**
- Status: 201 Created
- Message: "JIRA connection created successfully"

### Test Case 2: Koneksi Duplikat (Error)
**Input:**
- JIRA URL: `https://company.atlassian.net` (sama)
- Email: `user@company.com` (sama)
- Project Key: `PROJ1` (sama)

**Expected:**
- Status: 409 Conflict
- Error Type: `DUPLICATE_PROJECT`
- Message: `Project JIRA "Project Name (PROJ1)" sudah terhubung, silahkan hubungkan Project JIRA lainnya`
- Display: Custom styling dengan warna pink

### Test Case 3: Project Berbeda, Kredensial Sama (Success)
**Input:**
- JIRA URL: `https://company.atlassian.net` (sama)
- Email: `user@company.com` (sama)
- Project Key: `PROJ2` (berbeda)

**Expected:**
- Status: 201 Created
- Message: "JIRA connection created successfully"

## 📝 Catatan Penting

1. **Validasi dilakukan di backend** untuk keamanan
2. **Frontend hanya menampilkan** pesan error dengan styling yang sesuai
3. **HTTP Status 409 (Conflict)** digunakan untuk error duplikasi
4. **Error message** mencantumkan nama project yang sudah terhubung
5. **Styling khusus** membedakan error duplikasi dari error lainnya

## 🔄 Update Log

### Version 1.0.0 (2026-05-03)
- ✅ Implementasi validasi duplikasi di backend
- ✅ Custom error handling dengan status 409
- ✅ Styling khusus untuk error duplikasi di frontend
- ✅ Pesan error dalam Bahasa Indonesia
- ✅ Display project name dan key dalam pesan error

## 🚀 Deployment Notes

Tidak ada migrasi database yang diperlukan. Fitur ini menggunakan struktur tabel yang sudah ada (`jira_connections`).

## 📚 Related Files

- `aplikasi-server/src/services/supabaseService.js`
- `aplikasi-server/src/controllers/jiraController.js`
- `aplikasi-klien/src/components/modals/JiraSetupModal.jsx`
