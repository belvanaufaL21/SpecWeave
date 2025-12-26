-- Insert default system templates with proper JSONB casting
-- Run this AFTER the main schema has been created

INSERT INTO templates (name, category, description, template_content, variables, is_system, tags) VALUES
('User Authentication Login', 'Authentication', 'Standard login flow with email and password', 
 'Sebagai {role}, saya ingin login menggunakan {login_method} agar dapat mengakses {target_system}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "login_method", "type": "select", "options": ["email dan password", "Google OAuth", "SSO"], "default": "email dan password"}, {"name": "target_system", "type": "text", "default": "dashboard aplikasi"}]'::jsonb, 
 true, ARRAY['authentication', 'login', 'security']),

('User Registration', 'Authentication', 'User registration and account creation', 
 'Sebagai {role}, saya ingin mendaftar akun baru dengan {registration_method} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "calon pengguna"}, {"name": "registration_method", "type": "select", "options": ["email dan password", "Google OAuth", "nomor telepon"], "default": "email dan password"}, {"name": "benefit", "type": "text", "default": "menggunakan layanan aplikasi"}]'::jsonb, 
 true, ARRAY['authentication', 'registration', 'onboarding']),

('CRUD Operations - Create', 'CRUD Operations', 'Create new entity in the system', 
 'Sebagai {role}, saya ingin membuat {entity} baru agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "entity", "type": "text", "default": "data"}, {"name": "benefit", "type": "text", "default": "mengelola informasi dengan lebih baik"}]'::jsonb, 
 true, ARRAY['crud', 'create', 'data-management']),

('CRUD Operations - Read', 'CRUD Operations', 'View and search existing entities', 
 'Sebagai {role}, saya ingin melihat daftar {entity} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "entity", "type": "text", "default": "data"}, {"name": "benefit", "type": "text", "default": "memantau dan mengelola informasi"}]'::jsonb, 
 true, ARRAY['crud', 'read', 'view', 'list']),

('CRUD Operations - Update', 'CRUD Operations', 'Edit existing entity information', 
 'Sebagai {role}, saya ingin mengedit {entity} yang sudah ada agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "entity", "type": "text", "default": "data"}, {"name": "benefit", "type": "text", "default": "memperbaiki atau memperbarui informasi"}]'::jsonb, 
 true, ARRAY['crud', 'update', 'edit']),

('CRUD Operations - Delete', 'CRUD Operations', 'Remove entity from the system', 
 'Sebagai {role}, saya ingin menghapus {entity} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "entity", "type": "text", "default": "data yang tidak diperlukan"}, {"name": "benefit", "type": "text", "default": "menjaga kebersihan sistem"}]'::jsonb, 
 true, ARRAY['crud', 'delete', 'remove']),

('API Integration', 'API Integration', 'Integrate with external API services', 
 'Sebagai {role}, saya ingin mengintegrasikan sistem dengan {api_service} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "developer"}, {"name": "api_service", "type": "text", "default": "layanan eksternal"}, {"name": "benefit", "type": "text", "default": "meningkatkan fungsionalitas aplikasi"}]'::jsonb, 
 true, ARRAY['api', 'integration', 'external-service']),

('File Upload', 'File Management', 'Upload and manage files', 
 'Sebagai {role}, saya ingin mengunggah {file_type} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "file_type", "type": "select", "options": ["dokumen", "gambar", "video", "file"], "default": "file"}, {"name": "benefit", "type": "text", "default": "menyimpan dan mengelola konten"}]'::jsonb, 
 true, ARRAY['file-upload', 'storage', 'media']),

('Search and Filter', 'UI Components', 'Search and filter functionality', 
 'Sebagai {role}, saya ingin mencari dan memfilter {content} berdasarkan {criteria} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "content", "type": "text", "default": "data"}, {"name": "criteria", "type": "text", "default": "kategori atau kata kunci"}, {"name": "benefit", "type": "text", "default": "menemukan informasi dengan cepat"}]'::jsonb, 
 true, ARRAY['search', 'filter', 'ui', 'navigation']),

('Notification System', 'Communication', 'Send and receive notifications', 
 'Sebagai {role}, saya ingin menerima notifikasi tentang {event} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "event", "type": "text", "default": "aktivitas penting"}, {"name": "benefit", "type": "text", "default": "tetap terinformasi tentang perubahan"}]'::jsonb, 
 true, ARRAY['notification', 'communication', 'alerts']),

('Dashboard Analytics', 'Analytics', 'View metrics and analytics', 
 'Sebagai {role}, saya ingin melihat {metrics} di dashboard agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "admin"}, {"name": "metrics", "type": "text", "default": "metrik kinerja"}, {"name": "benefit", "type": "text", "default": "memantau dan menganalisis data"}]'::jsonb, 
 true, ARRAY['dashboard', 'analytics', 'metrics', 'reporting']),

('Shopping Cart', 'E-commerce', 'Add items to cart and checkout', 
 'Sebagai {role}, saya ingin menambahkan {item} ke keranjang belanja agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "customer"}, {"name": "item", "type": "text", "default": "produk"}, {"name": "benefit", "type": "text", "default": "melakukan pembelian"}]'::jsonb, 
 true, ARRAY['e-commerce', 'shopping-cart', 'checkout']),

-- Additional Authentication Templates
('Password Reset', 'Authentication', 'Reset forgotten password functionality', 
 'Sebagai {role}, saya ingin mereset password yang lupa melalui {reset_method} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "reset_method", "type": "select", "options": ["email", "SMS", "security questions"], "default": "email"}, {"name": "benefit", "type": "text", "default": "mengakses kembali akun saya"}]'::jsonb, 
 true, ARRAY['authentication', 'password-reset', 'security']),

('Two-Factor Authentication', 'Authentication', 'Enable 2FA for enhanced security', 
 'Sebagai {role}, saya ingin mengaktifkan autentikasi dua faktor menggunakan {method} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "method", "type": "select", "options": ["SMS", "authenticator app", "email"], "default": "authenticator app"}, {"name": "benefit", "type": "text", "default": "meningkatkan keamanan akun"}]'::jsonb, 
 true, ARRAY['authentication', '2fa', 'security']),

-- User Management Templates
('User Profile Management', 'User Management', 'Manage user profile information', 
 'Sebagai {role}, saya ingin mengelola {profile_section} di profil saya agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "profile_section", "type": "select", "options": ["informasi pribadi", "foto profil", "preferensi", "pengaturan privasi"], "default": "informasi pribadi"}, {"name": "benefit", "type": "text", "default": "menjaga informasi tetap akurat dan terkini"}]'::jsonb, 
 true, ARRAY['user-management', 'profile', 'settings']),

('Role-Based Access Control', 'User Management', 'Manage user roles and permissions', 
 'Sebagai {role}, saya ingin mengelola {permission_type} untuk {target_user} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "admin"}, {"name": "permission_type", "type": "select", "options": ["role pengguna", "hak akses", "izin khusus"], "default": "role pengguna"}, {"name": "target_user", "type": "text", "default": "pengguna lain"}, {"name": "benefit", "type": "text", "default": "mengontrol akses sistem dengan tepat"}]'::jsonb, 
 true, ARRAY['user-management', 'rbac', 'permissions', 'admin']),

-- API Integration Templates
('Payment Gateway Integration', 'API Integration', 'Integrate with payment processing services', 
 'Sebagai {role}, saya ingin mengintegrasikan {payment_provider} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "developer"}, {"name": "payment_provider", "type": "select", "options": ["Stripe", "PayPal", "Midtrans", "Xendit"], "default": "Stripe"}, {"name": "benefit", "type": "text", "default": "memproses pembayaran dengan aman"}]'::jsonb, 
 true, ARRAY['api', 'payment', 'integration', 'e-commerce']),

('Social Media Integration', 'API Integration', 'Connect with social media platforms', 
 'Sebagai {role}, saya ingin mengintegrasikan {social_platform} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "social_platform", "type": "select", "options": ["Facebook", "Twitter", "Instagram", "LinkedIn"], "default": "Facebook"}, {"name": "benefit", "type": "text", "default": "berbagi konten dan terhubung dengan teman"}]'::jsonb, 
 true, ARRAY['api', 'social-media', 'integration', 'sharing']),

-- UI Components Templates
('Data Table with Pagination', 'UI Components', 'Display data in paginated table format', 
 'Sebagai {role}, saya ingin melihat {data_type} dalam tabel dengan pagination agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "data_type", "type": "text", "default": "data"}, {"name": "benefit", "type": "text", "default": "menjelajahi data dalam jumlah besar dengan mudah"}]'::jsonb, 
 true, ARRAY['ui', 'table', 'pagination', 'data-display']),

('Modal Dialog', 'UI Components', 'Display content in modal overlay', 
 'Sebagai {role}, saya ingin melihat {content} dalam modal dialog agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "content", "type": "text", "default": "detail informasi"}, {"name": "benefit", "type": "text", "default": "fokus pada informasi tanpa meninggalkan halaman"}]'::jsonb, 
 true, ARRAY['ui', 'modal', 'dialog', 'overlay']),

('Form Validation', 'UI Components', 'Validate user input in forms', 
 'Sebagai {role}, saya ingin mendapat validasi saat mengisi {form_type} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "form_type", "type": "text", "default": "formulir"}, {"name": "benefit", "type": "text", "default": "memastikan data yang dimasukkan valid"}]'::jsonb, 
 true, ARRAY['ui', 'form', 'validation', 'input']),

-- E-commerce Templates
('Product Catalog', 'E-commerce', 'Browse and search products', 
 'Sebagai {role}, saya ingin menjelajahi katalog {product_type} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "customer"}, {"name": "product_type", "type": "text", "default": "produk"}, {"name": "benefit", "type": "text", "default": "menemukan produk yang diinginkan"}]'::jsonb, 
 true, ARRAY['e-commerce', 'catalog', 'products', 'search']),

('Order Management', 'E-commerce', 'Track and manage orders', 
 'Sebagai {role}, saya ingin mengelola {order_aspect} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "customer"}, {"name": "order_aspect", "type": "select", "options": ["pesanan saya", "status pengiriman", "riwayat pembelian"], "default": "pesanan saya"}, {"name": "benefit", "type": "text", "default": "memantau dan mengelola transaksi"}]'::jsonb, 
 true, ARRAY['e-commerce', 'orders', 'tracking', 'management']),

('Inventory Management', 'E-commerce', 'Manage product inventory', 
 'Sebagai {role}, saya ingin mengelola {inventory_aspect} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "admin"}, {"name": "inventory_aspect", "type": "select", "options": ["stok produk", "harga", "kategori produk"], "default": "stok produk"}, {"name": "benefit", "type": "text", "default": "menjaga ketersediaan produk"}]'::jsonb, 
 true, ARRAY['e-commerce', 'inventory', 'stock', 'admin']),

-- Testing Templates
('Unit Testing', 'Testing', 'Create unit tests for components', 
 'Sebagai {role}, saya ingin membuat unit test untuk {component} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "developer"}, {"name": "component", "type": "text", "default": "fungsi atau komponen"}, {"name": "benefit", "type": "text", "default": "memastikan kode berfungsi dengan benar"}]'::jsonb, 
 true, ARRAY['testing', 'unit-test', 'quality-assurance']),

('Integration Testing', 'Testing', 'Test integration between components', 
 'Sebagai {role}, saya ingin melakukan integration test untuk {integration_point} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "QA engineer"}, {"name": "integration_point", "type": "text", "default": "integrasi antar modul"}, {"name": "benefit", "type": "text", "default": "memastikan sistem bekerja secara keseluruhan"}]'::jsonb, 
 true, ARRAY['testing', 'integration-test', 'quality-assurance']),

-- Reporting Templates
('Data Export', 'Reporting', 'Export data in various formats', 
 'Sebagai {role}, saya ingin mengekspor {data_type} dalam format {format} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "data_type", "type": "text", "default": "data"}, {"name": "format", "type": "select", "options": ["CSV", "Excel", "PDF", "JSON"], "default": "CSV"}, {"name": "benefit", "type": "text", "default": "menganalisis data di luar sistem"}]'::jsonb, 
 true, ARRAY['reporting', 'export', 'data', 'analytics']),

('Scheduled Reports', 'Reporting', 'Generate and send automated reports', 
 'Sebagai {role}, saya ingin menjadwalkan laporan {report_type} secara {frequency} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "manager"}, {"name": "report_type", "type": "text", "default": "kinerja"}, {"name": "frequency", "type": "select", "options": ["harian", "mingguan", "bulanan"], "default": "mingguan"}, {"name": "benefit", "type": "text", "default": "memantau progress secara otomatis"}]'::jsonb, 
 true, ARRAY['reporting', 'automation', 'scheduling', 'analytics']),

-- Communication Templates
('Real-time Chat', 'Communication', 'Enable real-time messaging', 
 'Sebagai {role}, saya ingin berkomunikasi secara real-time dengan {target} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "pengguna"}, {"name": "target", "type": "select", "options": ["pengguna lain", "customer service", "tim"], "default": "pengguna lain"}, {"name": "benefit", "type": "text", "default": "berkolaborasi dan berkomunikasi dengan efektif"}]'::jsonb, 
 true, ARRAY['communication', 'chat', 'real-time', 'messaging']),

('Email Notifications', 'Communication', 'Send email notifications to users', 
 'Sebagai {role}, saya ingin mengirim notifikasi email tentang {event} agar dapat {benefit}.', 
 '[{"name": "role", "type": "text", "default": "sistem"}, {"name": "event", "type": "text", "default": "aktivitas penting"}, {"name": "benefit", "type": "text", "default": "menginformasikan pengguna tentang perubahan"}]'::jsonb, 
 true, ARRAY['communication', 'email', 'notifications', 'alerts'])

;