# Toast Notifications Guide

Panduan penggunaan sistem notifikasi toast yang konsisten di aplikasi SpecWeave.

## Overview

Aplikasi ini menggunakan `react-hot-toast` dengan styling yang konsisten untuk semua notifikasi. Semua toast notification mengikuti design system yang sama dengan:
- Background blur effect
- Consistent border colors
- Consistent shadows
- Consistent padding dan spacing

## Import

```javascript
import { 
  showSuccessToast, 
  showErrorToast, 
  showInfoToast, 
  showWarningToast,
  showAuthSuccessToast,
  showJiraExportSuccessToast
} from '../utils/toastNotifications';
```

## Basic Usage

### Success Toast
Untuk menampilkan notifikasi sukses:

```javascript
showSuccessToast('Data berhasil disimpan!');
```

### Error Toast
Untuk menampilkan notifikasi error:

```javascript
showErrorToast('Gagal menyimpan data. Silakan coba lagi.');
```

### Info Toast
Untuk menampilkan notifikasi informasi:

```javascript
showInfoToast('Fitur ini akan segera hadir.');
```

### Warning Toast
Untuk menampilkan notifikasi peringatan:

```javascript
showWarningToast('Koneksi internet tidak stabil.');
```

## Special Toast Notifications

### Authentication Success
Notifikasi khusus untuk login berhasil dengan nama user:

```javascript
import { showAuthSuccessToast } from '../utils/toastNotifications';

// Setelah login berhasil
const userName = user.user_metadata?.name || user.email?.split('@')[0];
showAuthSuccessToast(userName);
```

**Tampilan:**
- Icon success dengan gradient hijau
- Pesan "Login Berhasil!"
- Nama user dengan highlight warna

### JIRA Export Success
Notifikasi khusus untuk export ke JIRA berhasil:

```javascript
import { showJiraExportSuccessToast } from '../utils/toastNotifications';

// Setelah export berhasil
showJiraExportSuccessToast(issueKey, issueUrl, epicName);
```

**Tampilan:**
- Logo JIRA dengan gradient purple-pink
- Pesan "Export Berhasil!"
- Epic name dan issue key
- Link button untuk membuka di JIRA

## Custom Options

Semua toast function menerima parameter `options` untuk kustomisasi:

```javascript
showSuccessToast('Data berhasil disimpan!', {
  duration: 6000, // 6 detik
  position: 'bottom-center',
  style: {
    // Custom style jika diperlukan
  }
});
```

### Available Options

- `duration`: Durasi tampil dalam milliseconds (default: 4000 untuk success/info/warning, 5000 untuk error)
- `position`: Posisi toast ('top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right')
- `style`: Custom CSS styles
- `icon`: Custom icon (untuk custom toast)

## Complex Toast Content

Untuk konten yang lebih kompleks, gunakan React component:

```javascript
import toast from 'react-hot-toast';

toast.success(
  (t) => (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        {/* Icon atau image */}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-white">Title</div>
        <div className="text-sm text-gray-400">Description</div>
      </div>
    </div>
  ),
  {
    duration: 5000,
    position: 'top-right',
    style: {
      background: 'rgba(10, 10, 15, 0.95)',
      backdropFilter: 'blur(16px)',
      color: '#fff',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '12px',
      padding: '18px 24px',
    },
    icon: null // Hilangkan default icon
  }
);
```

## Design System Colors

Toast notifications menggunakan warna yang konsisten:

| Type | Border Color | Shadow Color | Icon Color |
|------|-------------|--------------|------------|
| Success | `rgba(16, 185, 129, 0.3)` | `rgba(16, 185, 129, 0.2)` | `#10b981` |
| Error | `rgba(239, 68, 68, 0.3)` | `rgba(239, 68, 68, 0.2)` | `#ef4444` |
| Info | `rgba(59, 130, 246, 0.3)` | `rgba(59, 130, 246, 0.2)` | `#3b82f6` |
| Warning | `rgba(234, 179, 8, 0.3)` | `rgba(234, 179, 8, 0.2)` | `#eab308` |
| Custom | `rgba(139, 92, 246, 0.3)` | `rgba(139, 92, 246, 0.2)` | `#8b5cf6` |

## Best Practices

1. **Gunakan helper functions** - Selalu gunakan helper functions dari `toastNotifications.js` untuk konsistensi
2. **Pesan yang jelas** - Gunakan pesan yang jelas dan actionable
3. **Durasi yang tepat**:
   - Success: 4 detik (default)
   - Error: 5 detik (default) - lebih lama agar user bisa membaca
   - Info/Warning: 4 detik (default)
4. **Posisi konsisten** - Gunakan `top-right` untuk semua notifikasi (default)
5. **Hindari spam** - Jangan menampilkan terlalu banyak toast sekaligus

## Examples

### Form Submission Success
```javascript
const handleSubmit = async (data) => {
  try {
    await api.saveData(data);
    showSuccessToast('Data berhasil disimpan!');
  } catch (error) {
    showErrorToast('Gagal menyimpan data. Silakan coba lagi.');
  }
};
```

### API Error Handling
```javascript
const fetchData = async () => {
  try {
    const response = await api.getData();
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      showErrorToast('Sesi Anda telah berakhir. Silakan login kembali.');
    } else if (error.response?.status === 403) {
      showErrorToast('Anda tidak memiliki akses ke resource ini.');
    } else {
      showErrorToast('Terjadi kesalahan. Silakan coba lagi.');
    }
  }
};
```

### Feature Coming Soon
```javascript
const handleFeatureClick = () => {
  showInfoToast('Fitur ini akan segera hadir!');
};
```

### Network Warning
```javascript
window.addEventListener('offline', () => {
  showWarningToast('Koneksi internet terputus. Beberapa fitur mungkin tidak tersedia.');
});

window.addEventListener('online', () => {
  showSuccessToast('Koneksi internet kembali normal.');
});
```

## Migration Guide

Jika Anda memiliki kode lama yang menggunakan `toast` langsung:

### Before
```javascript
import toast from 'react-hot-toast';

toast.success('Success!', {
  duration: 4000,
  position: 'top-right',
  style: {
    background: '#09090A',
    color: '#ffffff',
    // ... banyak style
  }
});
```

### After
```javascript
import { showSuccessToast } from '../utils/toastNotifications';

showSuccessToast('Success!');
```

Jauh lebih simple dan konsisten! 🎉
