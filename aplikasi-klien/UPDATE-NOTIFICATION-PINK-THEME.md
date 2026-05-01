# Update Notification - Pink Theme

Summary perubahan sistem notifikasi ke tema pink dengan perbedaan antara notifikasi biasa dan notifikasi dengan action.

## 🎨 Perubahan Utama

### 1. Color Scheme - Pink Theme
Semua notifikasi sekarang menggunakan tema **Pink** yang konsisten:

| Element | Old Color | New Color |
|---------|-----------|-----------|
| Background | `rgba(10, 10, 15, 0.95)` | `#160D14` |
| Primary Text | `#ffffff` | `#FFFFFF` |
| Secondary Text | `#gray-400` | `#FF7AD0` |
| Border | `rgba(255, 255, 255, 0.05)` | `#44273D` |
| Shadow | Various | `rgba(255, 122, 208, 0.2)` |
| Icon BG | Gradient (green/purple) | `#FF7AD0` |
| Icon Color | `#ffffff` | `#160D14` |

### 2. Notification Types

#### Type 1: Simple Notification (TANPA Action Button)
**Struktur:**
```
[Icon] Title          [Close]
       Subtitle
```

**Digunakan untuk:**
- ✅ Login berhasil
- ✅ Save berhasil
- ✅ Update berhasil
- ✅ Notifikasi informasi umum
- ✅ Error messages

**Komponen:**
- Icon (10x10, bg: #FF7AD0)
- Title (font-semibold, color: #FFFFFF)
- Subtitle (text-sm, color: #FF7AD0)
- Close button (8x8, bg: rgba(255, 122, 208, 0.1))

#### Type 2: Notification with Action (DENGAN Chip/Button)
**Struktur:**
```
[Icon] Title          [Close]
       Subtitle
       [Action Chip]
```

**Digunakan untuk:**
- ✅ Export JIRA (dengan link ke JIRA)
- ✅ Download file
- ✅ Redirect ke halaman lain
- ✅ External links

**Komponen:**
- Icon (10x10, bg: #FF7AD0)
- Title (font-semibold, color: #FFFFFF)
- Subtitle (text-sm, color: #FF7AD0)
- Action Chip (px-3 py-1.5, bg: rgba(255, 122, 208, 0.2), border: #44273D)
- Close button (8x8, bg: rgba(255, 122, 208, 0.1))

## 📁 File yang Dimodifikasi

### 1. `aplikasi-klien/src/utils/toastNotifications.js`

**Perubahan:**

#### Base Style
```javascript
// Before
const baseStyle = {
  background: 'rgba(10, 10, 15, 0.95)',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  // ...
};

// After
const baseStyle = {
  background: '#160D14',
  color: '#FF7AD0',
  border: '1px solid #44273D',
  boxShadow: '0 10px 40px rgba(255, 122, 208, 0.2)',
  // ...
};
```

#### showAuthSuccessToast (Simple Notification)
```javascript
// Before
- Icon: Gradient green background
- Title: White color
- Subtitle: Gray with green highlight
- No close button

// After
- Icon: #FF7AD0 background with #160D14 icon
- Title: #FFFFFF color
- Subtitle: #FF7AD0 color
- Close button: Added with hover effect
```

**Visual:**
```
┌────────────────────────────────────────┐
│  [✓]  Login Berhasil!            [X]   │
│       Selamat datang, John Doe         │
└────────────────────────────────────────┘
```

#### showJiraExportSuccessToast (With Action)
```javascript
// Before
- Icon: Purple-pink gradient
- Title: White color
- Subtitle: Gray with purple highlight
- Arrow icon button (small)

// After
- Icon: #FF7AD0 background with #160D14 icon
- Title: #FFFFFF color
- Subtitle: #FF7AD0 color
- Action Chip: "Buka di JIRA →" (full button with text)
- Close button: Added with hover effect
```

**Visual:**
```
┌────────────────────────────────────────┐
│  [J]  Export Berhasil!           [X]   │
│       Epic Name: PROJ-123              │
│       [Buka di JIRA →]                 │
└────────────────────────────────────────┘
```

### 2. `aplikasi-klien/src/App.jsx`

**Perubahan Toaster Config:**
```javascript
// Before
<Toaster
  toastOptions={{
    style: {
      background: '#09090A',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    success: {
      iconTheme: {
        primary: '#10b981',  // Green
        secondary: '#ffffff',
      },
    },
  }}
/>

// After
<Toaster
  toastOptions={{
    style: {
      background: '#160D14',
      color: '#FF7AD0',
      border: '1px solid #44273D',
      boxShadow: '0 10px 40px rgba(255, 122, 208, 0.2)',
    },
    success: {
      iconTheme: {
        primary: '#FF7AD0',  // Pink
        secondary: '#160D14',
      },
    },
  }}
/>
```

## 🎯 Contoh Penggunaan

### Simple Notification (Login Berhasil)

```javascript
import { showAuthSuccessToast } from '../utils/toastNotifications';

// After successful login
const userName = user.name || user.email?.split('@')[0];
showAuthSuccessToast(userName);
```

**Result:**
- ✅ Icon success dengan background pink
- ✅ Title "Login Berhasil!" (putih)
- ✅ Subtitle "Selamat datang, {userName}" (pink)
- ✅ Close button (X) di kanan atas
- ❌ TIDAK ada action button/chip

### Notification with Action (Export JIRA)

```javascript
import { showJiraExportSuccessToast } from '../utils/toastNotifications';

// After successful JIRA export
showJiraExportSuccessToast(
  'PROJ-123',                    // issueKey
  'https://jira.com/...',        // issueUrl
  'Epic Name'                    // epicName
);
```

**Result:**
- ✅ Icon JIRA dengan background pink
- ✅ Title "Export Berhasil!" (putih)
- ✅ Subtitle "Epic Name: PROJ-123" (pink)
- ✅ Action chip "Buka di JIRA →" (clickable)
- ✅ Close button (X) di kanan atas

## 🎨 Design Tokens

### Colors
```css
--notification-bg: #160D14;
--notification-text-primary: #FFFFFF;
--notification-text-secondary: #FF7AD0;
--notification-border: #44273D;
--notification-shadow: rgba(255, 122, 208, 0.2);
--notification-icon-bg: #FF7AD0;
--notification-icon-color: #160D14;
--notification-chip-bg: rgba(255, 122, 208, 0.2);
--notification-chip-hover: rgba(255, 122, 208, 0.3);
--notification-close-bg: rgba(255, 122, 208, 0.1);
--notification-close-hover: rgba(255, 122, 208, 0.2);
```

### Spacing
```css
--notification-padding: 18px 24px;
--notification-gap: 12px;
--notification-icon-size: 40px;
--notification-close-size: 32px;
--notification-border-radius: 12px;
```

### Typography
```css
--notification-title-size: 16px;
--notification-title-weight: 600;
--notification-subtitle-size: 14px;
--notification-subtitle-weight: 400;
--notification-chip-size: 14px;
--notification-chip-weight: 500;
```

## 📊 Before vs After Comparison

### Login Notification

**Before:**
```
┌────────────────────────────────────────┐
│  [✓]  Login Berhasil!                  │
│       Selamat datang, John Doe         │
└────────────────────────────────────────┘
```
- Background: Dark gray
- Icon: Green gradient
- Text: White/Gray
- No close button

**After:**
```
┌────────────────────────────────────────┐
│  [✓]  Login Berhasil!            [X]   │
│       Selamat datang, John Doe         │
└────────────────────────────────────────┘
```
- Background: Pink dark (#160D14)
- Icon: Pink (#FF7AD0)
- Text: White/Pink
- Close button added

### JIRA Export Notification

**Before:**
```
┌────────────────────────────────────────┐
│  [J]  Export Berhasil!            [→]  │
│       Epic Name: PROJ-123              │
└────────────────────────────────────────┘
```
- Background: Dark gray
- Icon: Purple-pink gradient
- Text: White/Gray/Purple
- Small arrow icon

**After:**
```
┌────────────────────────────────────────┐
│  [J]  Export Berhasil!           [X]   │
│       Epic Name: PROJ-123              │
│       [Buka di JIRA →]                 │
└────────────────────────────────────────┘
```
- Background: Pink dark (#160D14)
- Icon: Pink (#FF7AD0)
- Text: White/Pink
- Full action chip with text
- Close button added

## ✅ Checklist

- [x] Update base style dengan pink theme
- [x] Update showAuthSuccessToast (simple notification)
- [x] Update showJiraExportSuccessToast (with action)
- [x] Update showSuccessToast
- [x] Update showErrorToast
- [x] Update showInfoToast
- [x] Update showWarningToast
- [x] Update Toaster config di App.jsx
- [x] Tambah close button ke semua notifikasi
- [x] Tambah action chip untuk notifikasi dengan external link
- [x] Buat dokumentasi design system
- [ ] Test manual di browser
- [ ] Test responsive (mobile/desktop)
- [ ] Test accessibility (keyboard navigation)
- [ ] Code review
- [ ] Deploy to staging

## 🧪 Testing Guide

### Manual Testing

1. **Test Login Notification:**
   ```
   1. Login dengan Google
   2. Verifikasi notifikasi muncul
   3. Check: Icon pink, title putih, subtitle pink
   4. Check: TIDAK ada action button
   5. Check: Ada close button (X)
   6. Click close button → notifikasi hilang
   ```

2. **Test JIRA Export Notification:**
   ```
   1. Export scenario ke JIRA
   2. Verifikasi notifikasi muncul
   3. Check: Icon pink, title putih, subtitle pink
   4. Check: ADA action chip "Buka di JIRA →"
   5. Check: Ada close button (X)
   6. Click action chip → buka JIRA di tab baru
   7. Click close button → notifikasi hilang
   ```

3. **Test Hover States:**
   ```
   1. Hover action chip → background lebih terang
   2. Hover close button → background lebih terang
   ```

### Visual Regression Testing

Compare screenshots:
- Before: Old notification style
- After: New pink theme notification

## 📝 Notes

### Why Pink Theme?
- Konsisten dengan brand color aplikasi
- Lebih eye-catching dan modern
- Membedakan dari notifikasi sistem default

### Why Separate Simple and Action Notifications?
- **Simple**: Untuk informasi yang tidak memerlukan action
- **Action**: Untuk notifikasi yang memerlukan follow-up action
- Menghindari clutter pada notifikasi sederhana
- Memberikan emphasis pada action yang penting

### Why Add Close Button?
- User control untuk dismiss notifikasi
- Accessibility improvement
- Better UX untuk notifikasi yang mungkin mengganggu

## 🚀 Next Steps

1. Test di berbagai browser (Chrome, Firefox, Safari, Edge)
2. Test di berbagai device (Desktop, Tablet, Mobile)
3. Test accessibility dengan screen reader
4. Gather user feedback
5. Iterate based on feedback

---

**Updated By**: Developer  
**Date**: 2026-05-01  
**Version**: 2.0  
**Status**: Ready for Testing ✅
