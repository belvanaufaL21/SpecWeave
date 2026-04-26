# Panduan Mengisi Tag pada Template

## 🏷️ Apa itu Tag?

**Tag** adalah label atau kata kunci yang membantu mengkategorikan dan mencari template dengan lebih mudah. Tag berfungsi seperti hashtag yang memudahkan filtering dan pencarian template.

---

## 📝 Cara Mengisi Tag

### **Di Template Editor:**

1. **Ketik tag** di input field "Tags"
2. **Tekan Enter** atau **klik tombol "Add"**
3. Tag akan muncul sebagai badge/chip
4. Untuk menghapus, klik tombol **X** pada tag

### **Format Tag:**
- Gunakan **huruf kecil** (lowercase)
- Pisahkan kata dengan **tanda hubung** (-)
- Contoh: `login`, `authentication`, `user-management`

---

## 💡 Contoh Tag yang Baik

### **1. Authentication Templates**
```
Tags: login, authentication, security, validation, session
```

**Contoh Template:**
- "User Login with Email & Password"
- Tags menjelaskan: fitur login, keamanan, validasi

---

### **2. E-commerce Templates**
```
Tags: product, catalog, ecommerce, search, filter
```

**Contoh Template:**
- "Product Catalog with Search"
- Tags menjelaskan: produk, katalog, pencarian

---

### **3. Payment Templates**
```
Tags: payment, checkout, transaction, gateway, security
```

**Contoh Template:**
- "Payment Processing"
- Tags menjelaskan: pembayaran, transaksi, keamanan

---

### **4. Reporting Templates**
```
Tags: analytics, dashboard, sales, charts, reporting
```

**Contoh Template:**
- "Sales Analytics Dashboard"
- Tags menjelaskan: analitik, laporan, visualisasi

---

## 🎯 Kategori Tag yang Disarankan

### **1. Fitur Utama (Main Feature)**
Tag yang menjelaskan fitur utama template:
- `login`
- `registration`
- `payment`
- `search`
- `cart`
- `checkout`
- `profile`
- `dashboard`
- `notification`
- `reporting`

---

### **2. Teknologi/Metode (Technology/Method)**
Tag yang menjelaskan teknologi atau metode yang digunakan:
- `authentication`
- `authorization`
- `oauth`
- `api`
- `rest`
- `graphql`
- `realtime`
- `websocket`
- `email`
- `sms`

---

### **3. Kategori Bisnis (Business Category)**
Tag yang menjelaskan kategori bisnis:
- `ecommerce`
- `saas`
- `crm`
- `erp`
- `cms`
- `lms`
- `marketplace`
- `booking`
- `inventory`
- `finance`

---

### **4. Aspek Keamanan (Security Aspect)**
Tag yang menjelaskan aspek keamanan:
- `security`
- `encryption`
- `validation`
- `sanitization`
- `csrf`
- `xss`
- `sql-injection`
- `2fa`
- `captcha`

---

### **5. User Experience (UX)**
Tag yang menjelaskan pengalaman pengguna:
- `responsive`
- `mobile`
- `desktop`
- `accessibility`
- `animation`
- `loading`
- `error-handling`
- `feedback`

---

### **6. Data & Analytics**
Tag yang menjelaskan data dan analitik:
- `analytics`
- `tracking`
- `metrics`
- `kpi`
- `charts`
- `graphs`
- `export`
- `import`

---

## 📊 Contoh Lengkap Template dengan Tag

### **Template 1: User Login**
```javascript
{
  title: "User Login with Email & Password",
  description: "Template lengkap untuk sistem login dengan validasi",
  category: "Authentication",
  tags: [
    "login",           // Fitur utama
    "authentication",  // Teknologi
    "security",        // Aspek keamanan
    "validation",      // Metode
    "session"          // Teknologi
  ]
}
```

---

### **Template 2: Product Catalog**
```javascript
{
  title: "Product Catalog with Search",
  description: "Template katalog produk dengan pencarian dan filter",
  category: "E-commerce",
  tags: [
    "product",         // Fitur utama
    "catalog",         // Fitur utama
    "ecommerce",       // Kategori bisnis
    "search",          // Fitur
    "filter"           // Fitur
  ]
}
```

---

### **Template 3: Payment Processing**
```javascript
{
  title: "Payment Processing",
  description: "Template sistem pembayaran dengan multiple gateway",
  category: "E-commerce",
  tags: [
    "payment",         // Fitur utama
    "checkout",        // Fitur
    "transaction",     // Fitur
    "gateway",         // Teknologi
    "security"         // Aspek keamanan
  ]
}
```

---

### **Template 4: Sales Dashboard**
```javascript
{
  title: "Sales Analytics Dashboard",
  description: "Template dashboard analytics dengan visualisasi data",
  category: "Reporting",
  tags: [
    "analytics",       // Fitur utama
    "dashboard",       // Fitur
    "sales",           // Kategori bisnis
    "charts",          // UX
    "reporting"        // Fitur
  ]
}
```

---

## ✅ Best Practices untuk Tag

### **1. Gunakan 3-7 Tag per Template**
- **Terlalu sedikit** (1-2): Sulit ditemukan
- **Optimal** (3-7): Balance antara spesifik dan discoverable
- **Terlalu banyak** (10+): Membingungkan dan tidak fokus

---

### **2. Prioritaskan Tag yang Relevan**
Urutkan tag dari yang paling penting:
1. **Fitur utama** (apa yang dilakukan)
2. **Teknologi** (bagaimana cara kerjanya)
3. **Kategori bisnis** (untuk siapa)
4. **Aspek tambahan** (keamanan, UX, dll)

**Contoh:**
```
✅ BAIK: login, authentication, security, validation, session
❌ BURUK: system, app, feature, function, code
```

---

### **3. Gunakan Kata Kunci yang Umum**
Gunakan istilah yang umum digunakan, bukan jargon internal:

**✅ BAIK:**
- `login` (bukan `signin-module`)
- `payment` (bukan `pay-sys`)
- `search` (bukan `find-feature`)

**❌ BURUK:**
- `internal-auth-v2`
- `legacy-payment-system`
- `old-search-algo`

---

### **4. Konsisten dengan Naming Convention**
- Gunakan **lowercase** (huruf kecil)
- Gunakan **tanda hubung** untuk kata majemuk
- Hindari **spasi** dan **karakter khusus**

**✅ BAIK:**
```
user-management
two-factor-auth
real-time-notification
```

**❌ BURUK:**
```
User Management  (ada spasi)
2FA              (singkatan tidak jelas)
Real_Time        (underscore)
```

---

### **5. Hindari Tag yang Terlalu Umum**
Tag yang terlalu umum tidak membantu pencarian:

**❌ HINDARI:**
- `system`
- `feature`
- `function`
- `app`
- `web`
- `software`

**✅ GUNAKAN:**
- `login-system`
- `search-feature`
- `payment-function`
- `mobile-app`
- `web-api`

---

## 🔍 Cara Tag Digunakan dalam Pencarian

### **1. Filter by Tag**
User dapat memilih tag untuk filter template:
```javascript
// Contoh: User klik tag "login"
filteredTemplates = templates.filter(t => 
  t.tags.includes('login')
);
```

---

### **2. Search by Tag**
User dapat search dengan tag:
```javascript
// Contoh: User ketik "authentication"
searchResults = templates.filter(t =>
  t.tags.some(tag => tag.includes('authentication'))
);
```

---

### **3. Related Templates**
Sistem dapat suggest template serupa berdasarkan tag:
```javascript
// Contoh: Suggest template dengan tag yang sama
relatedTemplates = templates.filter(t =>
  t.tags.some(tag => currentTemplate.tags.includes(tag))
);
```

---

## 📋 Checklist Sebelum Menambahkan Tag

Sebelum menambahkan tag, tanyakan:

- [ ] **Apakah tag ini menjelaskan fitur utama template?**
- [ ] **Apakah tag ini membantu user menemukan template?**
- [ ] **Apakah tag ini spesifik dan relevan?**
- [ ] **Apakah tag ini menggunakan istilah yang umum?**
- [ ] **Apakah tag ini konsisten dengan naming convention?**
- [ ] **Apakah jumlah tag sudah optimal (3-7)?**

---

## 🎨 Contoh Tag untuk Berbagai Kategori

### **Authentication**
```
login, authentication, security, validation, session, 
oauth, 2fa, password, email-verification, token
```

### **E-commerce**
```
product, cart, checkout, payment, order, inventory, 
shipping, discount, coupon, wishlist
```

### **User Management**
```
user, profile, registration, account, settings, 
preferences, avatar, role, permission, access-control
```

### **Communication**
```
notification, email, sms, push, chat, message, 
realtime, websocket, alert, reminder
```

### **Reporting**
```
analytics, dashboard, report, chart, graph, export, 
kpi, metrics, statistics, visualization
```

### **Content Management**
```
cms, content, article, blog, post, media, upload, 
editor, publish, draft
```

### **API Integration**
```
api, rest, graphql, webhook, integration, third-party, 
oauth, authentication, rate-limit, endpoint
```

---

## 💡 Tips Tambahan

### **1. Lihat Template yang Sudah Ada**
Sebelum membuat tag baru, lihat tag yang sudah digunakan di template lain untuk konsistensi.

### **2. Gunakan Tag yang Populer**
Tag yang sering digunakan lebih mudah ditemukan:
- `login` (45 templates)
- `authentication` (41 templates)
- `ecommerce` (32 templates)

### **3. Update Tag Secara Berkala**
Review dan update tag jika:
- Template berubah fungsinya
- Ada istilah baru yang lebih populer
- Tag tidak lagi relevan

### **4. Dokumentasikan Tag Internal**
Untuk tim, buat dokumentasi internal tentang:
- Tag yang direkomendasikan
- Tag yang deprecated
- Naming convention yang digunakan

---

## ❓ FAQ

### **Q: Berapa jumlah tag minimal?**
**A:** Minimal 1 tag, tapi disarankan 3-7 tag untuk hasil optimal.

### **Q: Apakah tag case-sensitive?**
**A:** Tidak, sistem akan convert ke lowercase. Tapi best practice gunakan lowercase dari awal.

### **Q: Bolehkah menggunakan emoji di tag?**
**A:** Tidak disarankan. Gunakan text saja untuk kompatibilitas.

### **Q: Bagaimana jika tag saya typo?**
**A:** Anda bisa edit template dan update tag kapan saja.

### **Q: Apakah tag bisa duplikat dengan template lain?**
**A:** Ya, bahkan disarankan! Tag yang sama membantu grouping template serupa.

---

## 🎯 Kesimpulan

**Tag yang baik:**
- ✅ Spesifik dan relevan
- ✅ Menggunakan istilah umum
- ✅ Konsisten dengan naming convention
- ✅ Jumlah optimal (3-7 tag)
- ✅ Membantu pencarian dan filtering

**Contoh tag yang sempurna:**
```javascript
{
  title: "User Login with Email & Password",
  tags: [
    "login",           // ✅ Fitur utama
    "authentication",  // ✅ Teknologi
    "security",        // ✅ Aspek keamanan
    "validation",      // ✅ Metode
    "session"          // ✅ Teknologi
  ]
}
```

Dengan tag yang baik, template Anda akan:
- 🔍 **Mudah ditemukan** dalam pencarian
- 📊 **Terorganisir** dengan baik
- 🎯 **Relevan** dengan kebutuhan user
- 🚀 **Meningkatkan** usage count
