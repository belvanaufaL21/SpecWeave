# Username-Based Authentication Implementation

## Overview
Implementasi sistem autentikasi dengan 2 metode terpisah:
1. **Full Name + Password** (Manual authentication)
2. **Google OAuth** (dengan profile setup)

Kedua metode ini **terpisah** dan tidak bisa saling digunakan untuk login.

---

## 🎯 Konsep Utama

### **Separate Authentication Methods**

```
┌─────────────────────────────────────────┐
│  User Manual (Full Name + Password)    │
│  ✓ Login dengan Full Name + Password   │
│  ✗ Tidak bisa login dengan Google      │
│  Database: password = hashed            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  User Google OAuth                      │
│  ✓ Login dengan Google                  │
│  ✗ Tidak bisa login dengan Password    │
│  Database: password = NULL              │
└─────────────────────────────────────────┘
```

---

## 📁 Files Created/Modified

### **New Files:**
1. `src/components/auth/UsernameAuthModal.jsx` - Modal untuk login/signup dengan full name + password
2. `src/pages/ProfileSetup.jsx` - Halaman setup profile untuk Google users
3. `USERNAME-AUTH-IMPLEMENTATION.md` - Dokumentasi ini

### **Modified Files:**
1. `src/pages/LoginSignup.jsx` - Update UI dengan 2 buttons (Login/Sign Up) di atas Google OAuth
2. `src/services/auth/AuthService.js` - Tambah methods untuk username-based auth
3. `src/App.jsx` - Tambah route `/profile-setup`
4. `src/pages/AuthCallback.jsx` - Redirect ke profile setup jika Google user belum set name

---

## 🔐 Authentication Flows

### **Flow 1: Manual Authentication (Full Name + Password)**

#### **Sign Up:**
```
1. User klik button "Sign Up"
2. Modal terbuka dengan form:
   - Full Name
   - Password
3. User input data dan klik "Sign Up"
4. Backend:
   - Generate internal email: "johndoe_1234567890_abc123@specweave.internal"
   - Save to database:
     * email: generated email (unique)
     * full_name: "John Doe" (display name, bisa duplikat)
     * password: hashed password
     * auth_method: "username"
5. User langsung login dan redirect ke /chat
```

#### **Login:**
```
1. User klik button "Login"
2. Modal terbuka dengan form:
   - Full Name
   - Password
3. User input data dan klik "Login"
4. Backend:
   - Cari semua users dengan full_name = "John Doe"
   - Filter hanya yang punya @specweave.internal email (skip Google users)
   - Loop dan cek password hash untuk setiap user
   - Yang match, itu user yang benar
5. Login berhasil, redirect ke /chat
```

---

### **Flow 2: Google OAuth**

#### **Sign Up/Login:**
```
1. User klik "Login/Sign up with Google"
2. Redirect ke Google OAuth
3. User pilih akun Google (email: john@gmail.com)
4. Redirect ke /auth/callback
5. Backend:
   - Save to database:
     * email: john@gmail.com (dari Google, unique)
     * full_name: default dari Google atau email
     * password: NULL
     * auth_method: "google"
6. Check: Apakah full_name sudah di-set?
   - Jika BELUM (name = email): Redirect ke /profile-setup
   - Jika SUDAH: Redirect ke /chat
```

#### **Profile Setup (untuk Google users):**
```
1. User di halaman /profile-setup
2. Form menampilkan:
   - Pre-filled dengan nama dari Google (jika ada)
   - Input Full Name
3. User edit/confirm nama dan klik "Continue"
4. Backend update profile:
   - full_name: "John Doe" (user-defined)
5. Redirect ke /chat
```

---

## 🗄️ Database Structure

### **profiles table:**
```sql
{
  id: uuid (primary key),
  email: string (unique) -- dari Google atau auto-generated
  name: string (display name) -- bisa duplikat
  password: string (hashed) -- NULL untuk Google users
  auth_method: string -- "username" atau "google"
  avatar_url: string,
  role: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

### **Examples:**

**Manual User:**
```json
{
  "email": "johndoe_1234567890_abc123@specweave.internal",
  "name": "John Doe",
  "password": "$2a$10$...", // hashed
  "auth_method": "username"
}
```

**Google User:**
```json
{
  "email": "john@gmail.com",
  "name": "John Doe",
  "password": null,
  "auth_method": "google"
}
```

---

## 🔧 New AuthService Methods

### **1. signUpWithFullName(fullName, password)**
```javascript
// Sign up dengan full name dan password
// Generate internal email untuk uniqueness
const { data, error } = await AuthService.signUpWithFullName(
  "John Doe",
  "password123"
);
```

### **2. signInWithFullName(fullName, password)**
```javascript
// Login dengan full name dan password
// Cari user by full_name, verify password
const { data, error } = await AuthService.signInWithFullName(
  "John Doe",
  "password123"
);
```

### **3. updateProfile(user, updates)**
```javascript
// Update profile (untuk Google users set full name)
const { data, error } = await AuthService.updateProfile(user, {
  name: "John Doe"
});
```

---

## 🎨 UI Components

### **1. LoginSignup Page**

```
┌─────────────────────────────────────┐
│  From User Story to Gherkin        │
│                                     │
│  ┌─────────┐  ┌─────────┐         │
│  │  Login  │  │ Sign Up │         │
│  └─────────┘  └─────────┘         │
│                                     │
│         ─── or ───                 │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ Login/Sign up with Google   │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

### **2. UsernameAuthModal**

```
┌─────────────────────────────────────┐
│  [Tab: Login] [Tab: Sign Up]       │
│                                     │
│  Full Name: [_________________]    │
│  Password:  [_________________] 👁  │
│                                     │
│  ℹ️ Login with your full name and  │
│     password. Google users cannot  │
│     use this method.               │
│                                     │
│  [Login Button]                    │
└─────────────────────────────────────┘
```

### **3. ProfileSetup Page**

```
┌─────────────────────────────────────┐
│         Welcome! 👋                 │
│  Please enter your full name       │
│                                     │
│  Full Name: [_________________]    │
│                                     │
│  This name will be displayed       │
│  throughout the application.       │
│                                     │
│  [Continue Button]                 │
│                                     │
│  Logged in with Google •           │
│  john@gmail.com                    │
└─────────────────────────────────────┘
```

---

## 🔒 Security Features

### **Password Security:**
- Minimum 6 characters
- Hashed dengan bcrypt (Supabase default)
- Show/hide password toggle

### **Email Privacy:**
- Manual users: Email hidden (auto-generated)
- Google users: Email dari Google (tapi tidak ditampilkan di UI)
- Display name (full_name) yang ditampilkan di seluruh aplikasi

### **Authentication Separation:**
- Manual users tidak bisa login dengan Google
- Google users tidak bisa login dengan password
- Clear separation untuk security dan UX

---

## 🎯 User Experience

### **Clear Separation:**
- Info message di modal: "Google users cannot use this method"
- Separate buttons untuk Login dan Sign Up
- Google OAuth tetap prominent (di bawah)

### **Smooth Onboarding:**
- Google users: Langsung ke profile setup
- Manual users: Langsung ke chat setelah signup
- Pre-filled nama dari Google (jika ada)

### **Consistent Display:**
- Seluruh aplikasi menampilkan Full Name
- Email tidak ditampilkan di UI (kecuali di profile setup untuk Google users)
- Avatar dari Google (jika ada)

---

## 🧪 Testing Checklist

### **Manual Authentication:**
- [ ] Sign up dengan full name + password
- [ ] Login dengan full name + password yang benar
- [ ] Login dengan full name + password yang salah
- [ ] Sign up dengan nama yang sudah ada (harus bisa, karena email unique)
- [ ] Password visibility toggle
- [ ] Form validation (nama min 2 char, password min 6 char)
- [ ] Remember me checkbox (UI only)
- [ ] Forgot password link (UI only)

### **Google OAuth:**
- [ ] Login/Sign up dengan Google
- [ ] Redirect ke profile setup jika nama belum di-set
- [ ] Pre-fill nama dari Google metadata
- [ ] Update nama di profile setup
- [ ] Redirect ke chat setelah setup
- [ ] Login ulang dengan Google (skip profile setup)

### **Separation:**
- [ ] Manual user tidak bisa login dengan Google
- [ ] Google user tidak bisa login dengan password
- [ ] Error message yang jelas untuk wrong method

### **Edge Cases:**
- [ ] 2 users dengan nama sama (manual auth)
- [ ] User cancel Google OAuth
- [ ] Network error saat signup/login
- [ ] Duplicate email (seharusnya tidak mungkin)

---

## 📝 Future Enhancements

- [ ] Forgot password functionality untuk manual users
- [ ] Email verification untuk manual users (optional)
- [ ] Allow Google users to set password (optional)
- [ ] Username system (alternative to full name)
- [ ] Social login lainnya (GitHub, Microsoft)
- [ ] 2FA authentication
- [ ] Password strength indicator
- [ ] Account linking (merge Google + manual)

---

## 🚀 Deployment Notes

### **Environment Variables:**
Tidak ada perubahan environment variables yang diperlukan.

### **Database Migration:**
Tidak ada migration yang diperlukan. Struktur `profiles` table sudah support:
- `email` (unique)
- `name` (display name)
- `password` (nullable)

### **Supabase Configuration:**
- Email confirmation: Disabled (untuk manual users)
- OAuth providers: Google enabled
- Password requirements: Min 6 characters

---

## 📚 Related Documentation

- `EMAIL-AUTH-IMPLEMENTATION.md` - Previous email/password implementation (deprecated)
- `ALUR-AUTENTIKASI-LENGKAP.md` - Complete authentication flow
- Supabase Auth Docs: https://supabase.com/docs/guides/auth

---

## ✅ Implementation Status

- [x] UsernameAuthModal component
- [x] ProfileSetup page
- [x] AuthService methods (signUpWithFullName, signInWithFullName)
- [x] LoginSignup page UI update
- [x] Routing for /profile-setup
- [x] AuthCallback redirect logic
- [x] Build successful
- [ ] Testing (pending)
- [ ] Deployment (pending)
