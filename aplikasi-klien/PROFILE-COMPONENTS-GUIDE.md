# Profile Page - Component Guide

Dokumentasi lengkap komponen-komponen di halaman Profile untuk memudahkan kustomisasi.

## 📍 Lokasi File
- **Main Component**: `aplikasi-klien/src/pages/Profile.jsx`
- **Avatar Picker**: `aplikasi-klien/src/components/profile/AvatarPicker.jsx`

---

## 🎨 Komponen Utama & Styling

### 1. **Main Container (Profile Card)**
```jsx
className="bg-transparent border border-white/5 rounded-3xl shadow-2xl overflow-hidden"
```
**Apa yang bisa diubah:**
- `bg-transparent` → Background warna (contoh: `bg-[#0a0a0f]`, `bg-gradient-to-br from-purple-500/10 to-pink-500/10`)
- `border-white/5` → Warna & opacity border (contoh: `border-purple-500/20`, `border-white/10`)
- `rounded-3xl` → Radius sudut (contoh: `rounded-2xl`, `rounded-xl`)
- `shadow-2xl` → Ukuran shadow (contoh: `shadow-xl`, `shadow-lg`)

---

### 2. **Decorative Header (Bagian Atas Gradient)**
```jsx
className="relative h-32 bg-transparent overflow-hidden"
```
**Apa yang bisa diubah:**
- `h-32` → Tinggi header (contoh: `h-24`, `h-40`)
- `bg-transparent` → Background (contoh: `bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20`)

**Gradient Effects di dalamnya:**
```jsx
// Gradient 1
className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.15),transparent_50%)]"

// Gradient 2
className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.15),transparent_50%)]"
```
**Apa yang bisa diubah:**
- `rgba(147,51,234,0.15)` → Warna & opacity (purple)
- `rgba(236,72,153,0.15)` → Warna & opacity (pink)
- `circle_at_50%_50%` → Posisi gradient
- `transparent_50%` → Jarak fade gradient

---

### 3. **Avatar Container**
```jsx
className="w-32 h-32 rounded-3xl bg-transparent border-4 border-white/5 shadow-2xl"
```
**Apa yang bisa diubah:**
- `w-32 h-32` → Ukuran avatar (contoh: `w-40 h-40`, `w-28 h-28`)
- `rounded-3xl` → Bentuk sudut (contoh: `rounded-full` untuk bulat penuh)
- `bg-transparent` → Background (contoh: `bg-gradient-to-br from-purple-500/20 to-pink-500/20`)
- `border-4` → Ketebalan border (contoh: `border-2`, `border-8`)
- `border-white/5` → Warna border (contoh: `border-purple-500/30`)

**Avatar Text (Inisial):**
```jsx
className="text-4xl font-bold bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent"
```
**Apa yang bisa diubah:**
- `text-4xl` → Ukuran text (contoh: `text-3xl`, `text-5xl`)
- `from-purple-400 to-pink-400` → Warna gradient text

---

### 4. **Edit Avatar Button (Tombol Pensil)**
```jsx
className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full"
```
**Apa yang bisa diubah:**
- `w-10 h-10` → Ukuran tombol (contoh: `w-8 h-8`, `w-12 h-12`)
- `from-purple-500 to-pink-500` → Warna gradient
- `rounded-full` → Bentuk (sudah bulat penuh)
- `-bottom-2 -right-2` → Posisi (contoh: `-bottom-3 -right-3`)

---

### 5. **Premium User Badge**
```jsx
className="mt-4 px-4 py-1.5 bg-transparent border border-white/5 rounded-full"
```
**Apa yang bisa diubah:**
- `bg-transparent` → Background (contoh: `bg-gradient-to-r from-purple-500/10 to-pink-500/10`)
- `border-white/5` → Border (contoh: `border-purple-500/20`)
- `px-4 py-1.5` → Padding (contoh: `px-6 py-2`)
- `rounded-full` → Bentuk

**Badge Text:**
```jsx
className="text-sm font-medium bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
```
**Apa yang bisa diubah:**
- `text-sm` → Ukuran text (contoh: `text-xs`, `text-base`)
- `from-purple-400 to-pink-400` → Warna gradient

---

### 6. **Form Fields (Input Nama & Email)**

**Label:**
```jsx
className="block text-sm font-medium text-white/70 px-1"
```
**Apa yang bisa diubah:**
- `text-sm` → Ukuran text
- `text-white/70` → Warna & opacity

**Input Field (Editable):**
```jsx
className="w-full px-5 py-4 bg-transparent border border-white/5 rounded-2xl text-white placeholder-white/40"
```
**Apa yang bisa diubah:**
- `bg-transparent` → Background (contoh: `bg-white/5`)
- `border-white/5` → Border
- `rounded-2xl` → Radius sudut
- `px-5 py-4` → Padding
- `text-white` → Warna text
- `placeholder-white/40` → Warna placeholder

**Display Field (Read-only):**
```jsx
className="w-full px-5 py-4 bg-transparent border border-white/5 rounded-2xl text-white/90 text-center text-lg font-medium"
```
**Apa yang bisa diubah:**
- Sama seperti input field
- `text-center` → Alignment text (contoh: `text-left`)
- `text-lg` → Ukuran text

---

### 7. **Buttons**

**Edit Profile Button:**
```jsx
className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-2xl text-white font-medium"
```
**Apa yang bisa diubah:**
- `from-purple-500/20 to-pink-500/20` → Gradient background
- `hover:from-purple-500/30 hover:to-pink-500/30` → Hover state
- `border-purple-500/30` → Border color
- `rounded-2xl` → Radius
- `px-6 py-4` → Padding

**Cancel Button:**
```jsx
className="flex-1 px-6 py-4 bg-transparent hover:bg-white/[0.03] border border-white/5 rounded-2xl text-white/60 hover:text-white/80 font-medium"
```
**Apa yang bisa diubah:**
- `bg-transparent` → Background
- `hover:bg-white/[0.03]` → Hover background
- `border-white/5` → Border
- `text-white/60` → Text color
- `hover:text-white/80` → Hover text color

**Save Changes Button:**
```jsx
className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-2xl text-white font-medium"
```
**Apa yang bisa diubah:**
- Sama seperti Edit Profile Button

---

### 8. **Stats Section**

**Container:**
```jsx
className="mt-8 pt-8 border-t border-white/5"
```
**Apa yang bisa diubah:**
- `mt-8 pt-8` → Margin & padding top
- `border-white/5` → Border color

**Stats Grid:**
```jsx
className="grid grid-cols-3 gap-4"
```
**Apa yang bisa diubah:**
- `grid-cols-3` → Jumlah kolom (contoh: `grid-cols-2`, `grid-cols-4`)
- `gap-4` → Jarak antar item

**Stats Number:**
```jsx
// Chats (Purple-Pink)
className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"

// Projects (Blue-Cyan)
className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"

// Tasks (Emerald-Teal)
className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"
```
**Apa yang bisa diubah:**
- `text-2xl` → Ukuran angka
- `from-purple-400 to-pink-400` → Warna gradient (sesuaikan per stats)

**Stats Label:**
```jsx
className="text-sm text-white/50 mt-1"
```
**Apa yang bisa diubah:**
- `text-sm` → Ukuran text
- `text-white/50` → Warna & opacity

---

## 🎭 Avatar Picker Modal

### Modal Overlay
```jsx
className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
```
**Apa yang bisa diubah:**
- `bg-black/60` → Background overlay (contoh: `bg-black/80`)
- `backdrop-blur-sm` → Blur effect (contoh: `backdrop-blur-md`)

### Modal Container
```jsx
className="bg-transparent border border-white/5 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh]"
```
**Apa yang bisa diubah:**
- `bg-transparent` → Background
- `border-white/5` → Border
- `max-w-2xl` → Lebar maksimal (contoh: `max-w-3xl`, `max-w-xl`)
- `max-h-[80vh]` → Tinggi maksimal

### Category Tabs
```jsx
// Selected
className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white"

// Not Selected
className="bg-transparent border border-white/5 text-white/60 hover:bg-white/[0.03]"
```

### Emoji Grid Items
```jsx
// Selected
className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500/50 shadow-lg"

// Not Selected
className="bg-transparent hover:bg-white/[0.03] border border-white/5"
```
**Apa yang bisa diubah:**
- `text-3xl` → Ukuran emoji (di parent element)
- Grid: `grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2`

---

## 🎨 Color Palette yang Digunakan

### Primary Colors
- **Purple**: `purple-400`, `purple-500` (rgba(147,51,234))
- **Pink**: `pink-400`, `pink-500` (rgba(236,72,153))
- **Blue**: `blue-400` (untuk Projects stats)
- **Cyan**: `cyan-400` (untuk Projects stats)
- **Emerald**: `emerald-400` (untuk Tasks stats)
- **Teal**: `teal-400` (untuk Tasks stats)

### Neutral Colors
- **White**: `white` dengan berbagai opacity (`/5`, `/10`, `/40`, `/50`, `/60`, `/70`, `/80`, `/90`)
- **Black**: `black/60` (untuk modal overlay)

### Opacity Levels
- `/5` = 5% opacity (border utama)
- `/10` = 10% opacity
- `/20` = 20% opacity (background gradient)
- `/30` = 30% opacity (hover state)
- `/40` = 40% opacity (placeholder)
- `/50` = 50% opacity (label stats)
- `/60` = 60% opacity (text secondary)
- `/70` = 70% opacity (label form)
- `/80` = 80% opacity (hover text)
- `/90` = 90% opacity (text primary)

---

## 📝 Tips Kustomisasi Cepat

### Mengubah Tema Warna
Ganti semua `purple-500` dan `pink-500` dengan warna pilihan Anda:
```jsx
// Contoh: Tema Blue-Green
from-purple-500 → from-blue-500
to-pink-500 → to-green-500
```

### Mengubah Transparansi Global
Ganti semua `border-white/5` dengan opacity yang diinginkan:
```jsx
border-white/5 → border-white/10  // Lebih terang
border-white/5 → border-white/3   // Lebih transparan
```

### Mengubah Ukuran Avatar
```jsx
// Avatar container
w-32 h-32 → w-40 h-40  // Lebih besar
w-32 h-32 → w-24 h-24  // Lebih kecil

// Avatar text
text-4xl → text-5xl    // Lebih besar
text-4xl → text-3xl    // Lebih kecil

// Edit button position
-bottom-2 -right-2 → -bottom-3 -right-3  // Sesuaikan dengan ukuran avatar
```

### Mengubah Spacing
```jsx
// Padding form fields
px-5 py-4 → px-6 py-5  // Lebih besar
px-5 py-4 → px-4 py-3  // Lebih kecil

// Gap stats
gap-4 → gap-6  // Lebih lebar
gap-4 → gap-2  // Lebih rapat
```

---

## 🔍 Search & Replace Cepat

Untuk mengubah styling secara konsisten, gunakan find & replace:

1. **Ubah semua border opacity:**
   - Find: `border-white/5`
   - Replace: `border-white/10`

2. **Ubah semua background transparent:**
   - Find: `bg-transparent`
   - Replace: `bg-white/5`

3. **Ubah tema warna purple-pink ke blue-green:**
   - Find: `purple-500`
   - Replace: `blue-500`
   - Find: `pink-500`
   - Replace: `green-500`

---

## 📦 Struktur Component

```
Profile.jsx
├── Main Container (Profile Card)
│   ├── Decorative Header
│   ├── Avatar Section
│   │   ├── Avatar Container
│   │   ├── Edit Button (saat editing)
│   │   └── Premium Badge
│   ├── Form Fields
│   │   ├── Name Field (editable/display)
│   │   └── Email Field (read-only)
│   ├── Action Buttons
│   │   ├── Edit Profile (default)
│   │   ├── Cancel (saat editing)
│   │   └── Save Changes (saat editing)
│   └── Stats Section
│       ├── Chats
│       ├── Projects
│       └── Tasks
└── Modals
    └── AvatarPicker
        ├── Header
        ├── Category Tabs
        ├── Emoji Grid
        └── Footer Buttons
```

---

## 🚀 Quick Start Customization

Untuk mulai kustomisasi, buka file:
1. `aplikasi-klien/src/pages/Profile.jsx` - Main profile page
2. `aplikasi-klien/src/components/profile/AvatarPicker.jsx` - Avatar picker modal

Gunakan guide ini sebagai referensi untuk menemukan dan mengubah styling yang diinginkan!
