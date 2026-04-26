# OAuth Google - Versi yang Digunakan

## ✅ Jawaban Singkat

**Ya, aplikasi ini menggunakan OAuth 2.0** untuk autentikasi Google.

---

## 🔍 Bukti Implementasi

### 1. **Supabase Auth menggunakan OAuth 2.0**

Aplikasi ini menggunakan **Supabase Auth** sebagai authentication provider, dan Supabase secara native mendukung **OAuth 2.0** untuk semua provider termasuk Google.

### 2. **Kode Implementasi**

**File:** `aplikasi-klien/src/services/auth/AuthService.js`

```javascript
static async signInWithGoogle(mode = 'signup') {
  try {
    // Simpan mode ke sessionStorage untuk validasi nanti
    sessionStorage.setItem('auth_mode', mode);
    
    // Pastikan redirect URL sesuai dengan port yang benar
    const currentPort = window.location.port || '3000';
    const redirectUrl = window.location.hostname === 'localhost' 
      ? `http://localhost:${currentPort}/auth/callback`
      : `${window.location.origin}/auth/callback`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',    // OAuth 2.0 parameter
          prompt: 'consent',          // OAuth 2.0 parameter
        }
      }
    });

    if (error) {
      sessionStorage.removeItem('auth_mode');
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    sessionStorage.removeItem('auth_mode');
    return { data: null, error };
  }
}
```

---

## 📋 Karakteristik OAuth 2.0 yang Digunakan

### 1. **Method: `signInWithOAuth()`**
- Supabase menggunakan method `signInWithOAuth()` yang merupakan implementasi OAuth 2.0
- Bukan OAuth 1.0 yang menggunakan signature-based authentication

### 2. **OAuth 2.0 Parameters**

```javascript
queryParams: {
  access_type: 'offline',  // OAuth 2.0: Request refresh token
  prompt: 'consent',       // OAuth 2.0: Force consent screen
}
```

**Penjelasan:**
- `access_type: 'offline'` - Meminta **refresh token** untuk akses jangka panjang (OAuth 2.0 feature)
- `prompt: 'consent'` - Memaksa tampilan consent screen setiap kali (OAuth 2.0 parameter)

### 3. **Redirect-Based Flow**

OAuth 2.0 menggunakan **redirect-based authorization flow**:

```javascript
redirectTo: redirectUrl  // OAuth 2.0 callback URL
```

**Alur:**
1. User klik "Sign in with Google"
2. Redirect ke Google OAuth 2.0 consent screen
3. User approve permissions
4. Google redirect kembali ke `redirectUrl` dengan authorization code
5. Supabase exchange code untuk access token (OAuth 2.0 flow)

---

## 🔐 OAuth 2.0 Flow yang Digunakan

### **Authorization Code Flow** (OAuth 2.0)

```
┌─────────────────────────────────────────────────────────────┐
│                    OAUTH 2.0 FLOW                           │
└─────────────────────────────────────────────────────────────┘

1. User clicks "Sign in with Google"
   │
   ▼
2. App redirects to Google OAuth 2.0 Authorization Endpoint
   https://accounts.google.com/o/oauth2/v2/auth
   │
   ▼
3. User logs in and grants permissions
   │
   ▼
4. Google redirects back with Authorization Code
   http://localhost:3000/auth/callback?code=AUTHORIZATION_CODE
   │
   ▼
5. Supabase exchanges code for Access Token (backend)
   POST https://oauth2.googleapis.com/token
   │
   ▼
6. Supabase returns session with Access Token & Refresh Token
   │
   ▼
7. App stores tokens and authenticates user
```

---

## 📊 Perbandingan OAuth 1.0 vs OAuth 2.0

| Feature | OAuth 1.0 | OAuth 2.0 (Digunakan) |
|---------|-----------|------------------------|
| **Signature** | Required (HMAC-SHA1) | Not required (uses HTTPS) |
| **Token Types** | Single token | Access Token + Refresh Token |
| **Flow Types** | One flow | Multiple flows (Authorization Code, Implicit, etc.) |
| **Complexity** | Complex (signature calculation) | Simpler (bearer tokens) |
| **Mobile Support** | Limited | Excellent |
| **Refresh Tokens** | No | Yes ✅ |
| **Expiration** | No expiration | Tokens expire ✅ |

**Aplikasi ini menggunakan OAuth 2.0** karena:
- ✅ Menggunakan `access_type: 'offline'` untuk refresh tokens
- ✅ Tidak ada signature calculation
- ✅ Menggunakan bearer tokens
- ✅ Redirect-based flow
- ✅ Supabase hanya support OAuth 2.0

---

## 🔧 Konfigurasi OAuth 2.0

### **Environment Variables**

**Client (.env):**
```env
VITE_SUPABASE_URL=https://nthylrvtkaqqixznrtaj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Server (.env):**
```env
SUPABASE_URL=https://nthylrvtkaqqixznrtaj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Supabase Configuration**

Supabase Dashboard → Authentication → Providers → Google:
- **Client ID**: Google OAuth 2.0 Client ID
- **Client Secret**: Google OAuth 2.0 Client Secret
- **Authorized Redirect URIs**: 
  - `http://localhost:3000/auth/callback` (development)
  - `https://your-domain.com/auth/callback` (production)

---

## 🌐 Google OAuth 2.0 Endpoints

### **Authorization Endpoint**
```
https://accounts.google.com/o/oauth2/v2/auth
```

### **Token Endpoint**
```
https://oauth2.googleapis.com/token
```

### **User Info Endpoint**
```
https://www.googleapis.com/oauth2/v2/userinfo
```

---

## 📝 OAuth 2.0 Scopes

Aplikasi ini meminta scopes berikut dari Google:

```javascript
// Default scopes dari Supabase Google OAuth
scopes: [
  'openid',           // OpenID Connect
  'email',            // User email
  'profile'           // User profile (name, picture)
]
```

**Data yang diperoleh:**
- ✅ User ID
- ✅ Email address
- ✅ Full name
- ✅ Profile picture URL
- ✅ Email verified status

---

## 🔄 Token Management

### **Access Token**
- **Lifetime**: 1 hour (default)
- **Usage**: API authentication
- **Storage**: Memory (session)

### **Refresh Token**
- **Lifetime**: Long-lived (configurable)
- **Usage**: Obtain new access tokens
- **Storage**: Secure HTTP-only cookie (Supabase handles this)

### **Token Refresh Flow**

```javascript
// Supabase automatically refreshes tokens
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Access token refreshed');
    // New access token available in session.access_token
  }
});
```

---

## 🛡️ Security Features (OAuth 2.0)

### 1. **PKCE (Proof Key for Code Exchange)**
Supabase menggunakan PKCE untuk additional security:
- Prevents authorization code interception attacks
- Required for mobile and SPA applications

### 2. **State Parameter**
Supabase automatically handles state parameter:
- Prevents CSRF attacks
- Validates callback authenticity

### 3. **HTTPS Only**
OAuth 2.0 requires HTTPS in production:
- Protects tokens in transit
- Prevents man-in-the-middle attacks

### 4. **Token Expiration**
Access tokens expire after 1 hour:
- Limits exposure window
- Forces token refresh

---

## 📱 Callback Handler

**File:** `aplikasi-klien/src/pages/AuthCallback.jsx`

```javascript
// Handle OAuth 2.0 callback
useEffect(() => {
  const handleCallback = async () => {
    // Supabase automatically exchanges authorization code for tokens
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('OAuth callback error:', error);
      navigate('/?error=oauth_failed');
      return;
    }
    
    if (session) {
      // OAuth 2.0 successful - user authenticated
      navigate('/chat');
    }
  };
  
  handleCallback();
}, []);
```

---

## 🎯 Kesimpulan

### **Versi OAuth: 2.0** ✅

**Bukti:**
1. ✅ Menggunakan `signInWithOAuth()` method (OAuth 2.0)
2. ✅ Parameter `access_type: 'offline'` (OAuth 2.0 feature)
3. ✅ Parameter `prompt: 'consent'` (OAuth 2.0 parameter)
4. ✅ Redirect-based authorization code flow (OAuth 2.0)
5. ✅ Access Token + Refresh Token (OAuth 2.0)
6. ✅ Supabase hanya support OAuth 2.0
7. ✅ Tidak ada signature calculation (OAuth 1.0 requirement)
8. ✅ Bearer token authentication (OAuth 2.0)

### **OAuth 2.0 Flow Type:**
**Authorization Code Flow with PKCE**

### **Provider:**
**Google OAuth 2.0** via **Supabase Auth**

### **Endpoints:**
- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- UserInfo: `https://www.googleapis.com/oauth2/v2/userinfo`

---

## 📚 Referensi

- [OAuth 2.0 Specification (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [PKCE Extension (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
