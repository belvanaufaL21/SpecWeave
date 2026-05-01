# Notification Design System

Dokumentasi lengkap design system untuk toast notifications di aplikasi SpecWeave.

## 🎨 Color Palette

Semua notifikasi menggunakan tema **Pink** yang konsisten:

| Element | Color Code | Usage |
|---------|-----------|-------|
| Background | `#160D14` | Background utama notifikasi |
| Primary Text | `#FFFFFF` | Title/heading |
| Secondary Text | `#FF7AD0` | Subtitle, description, icon |
| Border | `#44273D` | Border notifikasi |
| Shadow | `rgba(255, 122, 208, 0.2)` | Box shadow |
| Icon Background | `#FF7AD0` | Background icon |
| Icon Color | `#160D14` | Warna icon di dalam background |

## 📐 Layout Structure

### Type 1: Simple Notification (Tanpa Action Button)
**Digunakan untuk**: Login berhasil, save berhasil, notifikasi umum

```
┌─────────────────────────────────────────────┐
│  [Icon]  Title                        [X]   │
│          Subtitle                           │
└─────────────────────────────────────────────┘
```

**Komponen:**
1. **Icon** (10x10, rounded-lg, bg: #FF7AD0)
2. **Title** (font-semibold, text-base, color: #FFFFFF)
3. **Subtitle** (text-sm, color: #FF7AD0)
4. **Close Button** (8x8, rounded-lg, bg: rgba(255, 122, 208, 0.1))

**Contoh:**
```
┌─────────────────────────────────────────────┐
│  [✓]  Login Berhasil!                 [X]   │
│       Selamat datang, John Doe              │
└─────────────────────────────────────────────┘
```

### Type 2: Notification with Action (Dengan Chip/Button)
**Digunakan untuk**: Export JIRA, redirect ke halaman lain, external links

```
┌─────────────────────────────────────────────┐
│  [Icon]  Title                        [X]   │
│          Subtitle                           │
│          [Action Button/Chip]               │
└─────────────────────────────────────────────┘
```

**Komponen:**
1. **Icon** (10x10, rounded-lg, bg: #FF7AD0)
2. **Title** (font-semibold, text-base, color: #FFFFFF)
3. **Subtitle** (text-sm, color: #FF7AD0)
4. **Action Chip** (px-3 py-1.5, rounded-lg, bg: rgba(255, 122, 208, 0.2), border: #44273D)
5. **Close Button** (8x8, rounded-lg, bg: rgba(255, 122, 208, 0.1))

**Contoh:**
```
┌─────────────────────────────────────────────┐
│  [JIRA] Export Berhasil!              [X]   │
│         Epic Name: PROJ-123                 │
│         [Buka di JIRA →]                    │
└─────────────────────────────────────────────┘
```

## 🎯 Usage Guidelines

### When to Use Simple Notification (Type 1)

✅ **Use for:**
- Login/Logout berhasil
- Data berhasil disimpan
- Profile berhasil diupdate
- Settings berhasil diubah
- Notifikasi informasi umum
- Pesan sukses tanpa action lanjutan

❌ **Don't use for:**
- Notifikasi yang memerlukan user action
- Link ke halaman eksternal
- Export/Download yang perlu dibuka

**Code Example:**
```javascript
import { showAuthSuccessToast } from '../utils/toastNotifications';

// Login berhasil
showAuthSuccessToast('John Doe');

// Save berhasil
showSuccessToast('Data berhasil disimpan!');
```

### When to Use Notification with Action (Type 2)

✅ **Use for:**
- Export ke JIRA (dengan link ke JIRA)
- Download file (dengan button download)
- Redirect ke halaman lain (dengan button "Lihat Detail")
- External links (dengan button "Buka Link")
- Notifikasi yang memerlukan follow-up action

❌ **Don't use for:**
- Notifikasi informasi biasa
- Pesan sukses yang tidak memerlukan action
- Error messages tanpa solusi

**Code Example:**
```javascript
import { showJiraExportSuccessToast } from '../utils/toastNotifications';

// Export JIRA berhasil
showJiraExportSuccessToast('PROJ-123', 'https://jira.com/...', 'Epic Name');
```

## 🎨 Visual Examples

### Example 1: Login Berhasil (Simple)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ┌──┐  Login Berhasil!                    ┌──┐  │
│  │✓ │  Selamat datang, John Doe           │✕ │  │
│  └──┘                                      └──┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Styling:**
- Background: `#160D14`
- Border: `1px solid #44273D`
- Shadow: `0 10px 40px rgba(255, 122, 208, 0.2)`
- Icon BG: `#FF7AD0`
- Title: `#FFFFFF`
- Subtitle: `#FF7AD0`

### Example 2: Export JIRA Berhasil (With Action)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ┌──┐  Export Berhasil!                   ┌──┐  │
│  │J │  Epic Name: PROJ-123                │✕ │  │
│  └──┘  ┌─────────────────┐                └──┘  │
│        │ Buka di JIRA → │                       │
│        └─────────────────┘                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Styling:**
- Background: `#160D14`
- Border: `1px solid #44273D`
- Shadow: `0 10px 40px rgba(255, 122, 208, 0.2)`
- Icon BG: `#FF7AD0`
- Title: `#FFFFFF`
- Subtitle: `#FF7AD0`
- Chip BG: `rgba(255, 122, 208, 0.2)`
- Chip Border: `1px solid #44273D`
- Chip Text: `#FF7AD0`

## 📏 Dimensions & Spacing

### Icon
- Size: `40px × 40px` (w-10 h-10)
- Border Radius: `8px` (rounded-lg)
- Background: `#FF7AD0`
- Icon Size: `20px × 20px` (w-5 h-5)
- Icon Color: `#160D14`

### Title
- Font Size: `16px` (text-base)
- Font Weight: `600` (font-semibold)
- Color: `#FFFFFF`
- Margin Bottom: `4px` (mb-1)

### Subtitle
- Font Size: `14px` (text-sm)
- Font Weight: `400` (normal)
- Color: `#FF7AD0`

### Action Chip
- Padding: `6px 12px` (px-3 py-1.5)
- Border Radius: `8px` (rounded-lg)
- Background: `rgba(255, 122, 208, 0.2)`
- Border: `1px solid #44273D`
- Font Size: `14px` (text-sm)
- Font Weight: `500` (font-medium)
- Color: `#FF7AD0`
- Margin Top: `8px` (mt-2)

### Close Button
- Size: `32px × 32px` (w-8 h-8)
- Border Radius: `8px` (rounded-lg)
- Background: `rgba(255, 122, 208, 0.1)`
- Hover Background: `rgba(255, 122, 208, 0.2)`
- Icon Size: `16px × 16px` (w-4 h-4)
- Icon Color: `#FF7AD0`

### Container
- Min Width: `300px` (simple), `380px` (with action)
- Padding: `18px 24px`
- Border Radius: `12px`
- Border: `1px solid #44273D`
- Background: `#160D14`
- Backdrop Filter: `blur(16px)`
- Box Shadow: `0 10px 40px rgba(255, 122, 208, 0.2)`

## 🎭 Interaction States

### Hover States

**Action Chip:**
```css
/* Default */
background: rgba(255, 122, 208, 0.2);

/* Hover */
background: rgba(255, 122, 208, 0.3);
```

**Close Button:**
```css
/* Default */
background: rgba(255, 122, 208, 0.1);

/* Hover */
background: rgba(255, 122, 208, 0.2);
```

### Active States

**Action Chip:**
```css
/* Active/Pressed */
background: rgba(255, 122, 208, 0.4);
transform: scale(0.98);
```

## 🔧 Implementation

### Simple Notification

```javascript
import { showAuthSuccessToast } from '../utils/toastNotifications';

// After successful login
const userName = user.name || user.email?.split('@')[0];
showAuthSuccessToast(userName);
```

**Result:**
- Icon: Success checkmark (✓)
- Title: "Login Berhasil!"
- Subtitle: "Selamat datang, {userName}"
- Close button: X icon
- Duration: 4 seconds
- Position: top-right

### Notification with Action

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
- Icon: JIRA logo
- Title: "Export Berhasil!"
- Subtitle: "Epic Name: PROJ-123"
- Action Chip: "Buka di JIRA →" (clickable link)
- Close button: X icon
- Duration: 5 seconds
- Position: top-right

## 📱 Responsive Behavior

### Desktop (> 768px)
- Min Width: `300px` (simple), `380px` (with action)
- Position: `top-right`
- Offset: `16px` from top and right

### Mobile (≤ 768px)
- Width: `calc(100vw - 32px)` (full width with margin)
- Position: `top-center`
- Offset: `16px` from top

## ♿ Accessibility

### ARIA Labels
```jsx
<div role="alert" aria-live="polite" aria-atomic="true">
  {/* Notification content */}
</div>
```

### Keyboard Navigation
- **Tab**: Focus on action button/close button
- **Enter/Space**: Activate focused button
- **Escape**: Dismiss notification

### Screen Reader
- Announce notification when it appears
- Read title and subtitle
- Announce action button if present
- Announce close button

## 🎯 Best Practices

### DO ✅
- Use simple notification for informational messages
- Use notification with action for external links
- Keep title short and clear (max 50 characters)
- Keep subtitle concise (max 100 characters)
- Use consistent wording across similar notifications
- Provide clear action button text ("Buka di JIRA", not "Click here")
- Auto-dismiss after appropriate duration

### DON'T ❌
- Don't use action button for simple notifications
- Don't use multiple action buttons (max 1)
- Don't use long titles or subtitles
- Don't use inconsistent colors
- Don't block user interaction
- Don't show too many notifications at once (max 3)
- Don't use vague action button text

## 📊 Notification Types Summary

| Type | Use Case | Has Action | Duration | Example |
|------|----------|-----------|----------|---------|
| Success | Login, Save, Update | No | 4s | "Login Berhasil!" |
| Error | Failed action | No | 5s | "Login Gagal!" |
| Info | General info | No | 4s | "Fitur segera hadir" |
| Warning | Caution | No | 4s | "Koneksi tidak stabil" |
| JIRA Export | Export success | Yes | 5s | "Export Berhasil!" + Link |
| Custom | Special actions | Maybe | 4-5s | Varies |

## 🔄 Migration Checklist

When updating existing notifications:

- [ ] Replace old toast colors with pink theme
- [ ] Remove action button from simple notifications
- [ ] Add action button to notifications with external links
- [ ] Update icon backgrounds to `#FF7AD0`
- [ ] Update title color to `#FFFFFF`
- [ ] Update subtitle color to `#FF7AD0`
- [ ] Update border to `#44273D`
- [ ] Update shadow to pink theme
- [ ] Test on desktop and mobile
- [ ] Test with screen reader
- [ ] Test keyboard navigation

---

**Design System Version**: 2.0  
**Last Updated**: 2026-05-01  
**Status**: Active ✅
