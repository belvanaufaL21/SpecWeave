import supabaseService from '../services/supabaseService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { formatPaginationMeta } from '../middlewares/shared/responseFormatter.js';

/**
 * Template Controller
 * Handles template management operations
 */

/**
 * Get all templates (system + user's own)
 */
export const getTemplates = async (req, res, next) => {
  try {
    const { 
      category, 
      search, 
      tags, 
      is_system, 
      sort_by = 'usage_count', 
      sort_order = 'desc', 
      limit = 50, 
      offset = 0 
    } = req.query;
    const userId = req.user?.id;

    console.log('📋 [TEMPLATE-CONTROLLER] Getting templates with params:', {
      category,
      search,
      tags,
      is_system,
      sort_by,
      sort_order,
      limit,
      offset,
      userId
    });

    // Build query
    let query = supabaseService.admin.from('templates').select('*');
    
    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,template_content.ilike.%${search}%`);
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query = query.overlaps('tags', tagArray);
    }
    
    if (is_system !== undefined) {
      query = query.eq('is_system', is_system === 'true');
    } else if (userId) {
      // Show system templates OR user's own templates
      query = query.or(`is_system.eq.true,created_by.eq.${userId}`);
    } else {
      // Show only system templates for unauthenticated users
      query = query.eq('is_system', true);
    }
    
    // Apply sorting
    const validSortColumns = ['name', 'category', 'usage_count', 'created_at', 'updated_at'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'usage_count';
    const sortAscending = sort_order === 'asc';
    
    query = query.order(sortColumn, { ascending: sortAscending });
    
    // Apply pagination
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100
    const offsetNum = parseInt(offset) || 0;
    
    query = query.range(offsetNum, offsetNum + limitNum - 1);
    
    const { data: templates, error } = await query;
    
    if (error) {
      console.error('❌ [TEMPLATE-CONTROLLER] Supabase error:', error);
      throw new AppError('Failed to get templates', 500);
    }

    console.log('✅ [TEMPLATE-CONTROLLER] Retrieved templates:', templates?.length || 0);

    const paginationMeta = formatPaginationMeta(
      Math.floor(offsetNum / limitNum) + 1,
      limitNum,
      templates?.length || 0
    );

    res.paginated(templates || [], paginationMeta.pagination);
  } catch (error) {
    console.error('❌ [TEMPLATE-CONTROLLER] Error getting templates:', error);
    next(error);
  }
};

/**
 * Get system templates only (public endpoint)
 */
export const getSystemTemplates = async (req, res, next) => {
  try {
    const { 
      category, 
      search, 
      tags, 
      sort_by = 'usage_count', 
      sort_order = 'desc', 
      limit = 50, 
      offset = 0 
    } = req.query;

    console.log('📋 [TEMPLATE-CONTROLLER] Getting system templates with params:', {
      category,
      search,
      tags,
      sort_by,
      sort_order,
      limit,
      offset
    });

    // Build query for system templates only
    let query = supabaseService.admin
      .from('templates')
      .select('*')
      .eq('is_system', true);
    
    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,template_content.ilike.%${search}%`);
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query = query.overlaps('tags', tagArray);
    }
    
    // Apply sorting
    const validSortColumns = ['name', 'category', 'usage_count', 'created_at', 'updated_at'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'usage_count';
    const sortAscending = sort_order === 'asc';
    
    query = query.order(sortColumn, { ascending: sortAscending });
    
    // Apply pagination
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100
    const offsetNum = parseInt(offset) || 0;
    
    query = query.range(offsetNum, offsetNum + limitNum - 1);
    
    const { data: templates, error } = await query;
    
    if (error) {
      console.error('❌ [TEMPLATE-CONTROLLER] Supabase error:', error);
      throw new AppError('Failed to get system templates', 500);
    }

    console.log('✅ [TEMPLATE-CONTROLLER] Retrieved system templates:', templates?.length || 0);

    const paginationMeta = formatPaginationMeta(
      Math.floor(offsetNum / limitNum) + 1,
      limitNum,
      templates?.length || 0
    );

    res.paginated(templates || [], paginationMeta.pagination);
  } catch (error) {
    console.error('❌ [TEMPLATE-CONTROLLER] Error getting system templates:', error);
    next(error);
  }
};

/**
 * Get template by ID
 */
export const getTemplateById = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = req.user?.id;

    // Get template with access control
    const { data: template, error } = await supabaseService.admin
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .or(`is_system.eq.true,created_by.eq.${userId}`)
      .single();

    if (error) {
      throw new AppError('Template not found', 404);
    }

    res.success(template);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new template (user only)
 */
export const createTemplate = async (req, res, next) => {
  try {
    const { name, category, description, template_content, variables, tags } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name || !category || !template_content) {
      throw new AppError('Name, category, and template content are required', 400);
    }

    // Validate variables format if provided
    if (variables && !Array.isArray(variables)) {
      throw new AppError('Variables must be an array', 400);
    }

    const templateData = {
      name: name.trim(),
      category: category.trim(),
      description: description?.trim() || null,
      template_content: template_content.trim(),
      variables: variables || [],
      is_system: false,
      created_by: userId,
      tags: tags || []
    };

    const newTemplate = await supabaseService.createTemplate(templateData);

    res.created(newTemplate, 'Template created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update template (user's own only)
 */
export const updateTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { name, category, description, template_content, variables, tags } = req.body;
    const userId = req.user.id;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (template_content !== undefined) updates.template_content = template_content.trim();
    if (variables !== undefined) updates.variables = variables;
    if (tags !== undefined) updates.tags = tags;

    const updatedTemplate = await supabaseService.updateTemplate(templateId, userId, updates);

    res.updated(updatedTemplate, 'Template updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete template (user's own only)
 */
export const deleteTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseService.admin
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('created_by', userId)
      .eq('is_system', false);

    if (error) {
      throw new AppError('Failed to delete template or template not found', 404);
    }

    res.deleted('Template deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Apply template with variables
 */
export const applyTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { variables } = req.body;
    const userId = req.user?.id;

    // Get template
    const { data: template, error } = await supabaseService.admin
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .or(`is_system.eq.true,created_by.eq.${userId}`)
      .single();

    if (error) {
      throw new AppError('Template not found', 404);
    }

    // Apply variables to template content
    let appliedContent = template.template_content;
    
    if (variables && typeof variables === 'object') {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        appliedContent = appliedContent.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    // Increment usage count
    await supabaseService.incrementTemplateUsage(templateId);

    res.success({
      template_id: templateId,
      template_name: template.name,
      applied_content: appliedContent,
      variables_used: variables || {}
    }, 'Template applied successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get template categories
 */
export const getTemplateCategories = async (req, res, next) => {
  try {
    const { data: categories, error } = await supabaseService.admin
      .from('templates')
      .select('category')
      .order('category');

    if (error) {
      throw new AppError('Failed to get template categories', 500);
    }

    // Get unique categories
    const uniqueCategories = [...new Set(categories.map(c => c.category))];

    res.success(uniqueCategories);
  } catch (error) {
    next(error);
  }
};

/**
 * Setup default system templates (public endpoint for initialization)
 */
export const setupDefaultTemplates = async (req, res, next) => {
  try {
    console.log('🔄 Setting up default templates...');
    
    const defaultTemplates = [
      {
        name: 'User Login with Email & Password',
        category: 'Authentication',
        description: 'Template lengkap untuk sistem login dengan validasi email dan password, termasuk error handling',
        template_content: `Sebagai pengguna terdaftar, saya ingin login ke aplikasi menggunakan email dan password saya agar dapat mengakses dashboard dan fitur-fitur yang tersedia.

Kriteria Penerimaan:
- Pengguna dapat memasukkan email dan password di form login
- Sistem memvalidasi format email yang benar
- Password minimal 8 karakter dengan kombinasi huruf dan angka
- Jika kredensial benar, pengguna diarahkan ke dashboard
- Jika kredensial salah, tampilkan pesan error yang jelas
- Setelah 3 kali gagal login, akun dikunci sementara selama 15 menit
- Tersedia opsi "Remember Me" untuk menyimpan session lebih lama
- Tersedia link "Forgot Password" untuk reset password

Skenario Tambahan:
- Login dengan akun yang belum diverifikasi email
- Login dengan akun yang sudah dinonaktifkan
- Handling untuk session timeout`,
        variables: [],
        is_system: true,
        usage_count: 0,
        tags: ['login', 'authentication', 'security', 'validation', 'session']
      },
      {
        name: 'User Registration with Email Verification',
        category: 'Authentication',
        description: 'Template registrasi pengguna baru dengan verifikasi email dan validasi data lengkap',
        template_content: `Sebagai calon pengguna, saya ingin mendaftar akun baru dengan email dan password agar dapat menggunakan semua fitur aplikasi.

Kriteria Penerimaan:
- Form registrasi berisi: nama lengkap, email, password, konfirmasi password
- Validasi email harus unik dan format yang benar
- Password minimal 8 karakter dengan kombinasi huruf besar, kecil, angka, dan simbol
- Konfirmasi password harus sama dengan password
- Nama lengkap minimal 2 kata
- Setelah registrasi berhasil, kirim email verifikasi
- Pengguna harus verifikasi email sebelum dapat login
- Link verifikasi berlaku selama 24 jam
- Tersedia opsi untuk mengirim ulang email verifikasi

Skenario Tambahan:
- Registrasi dengan email yang sudah terdaftar
- Verifikasi email yang sudah expired
- Registrasi dengan data yang tidak lengkap
- Handling untuk email yang tidak valid`,
        variables: [],
        is_system: true,
        usage_count: 0,
        tags: ['registration', 'signup', 'authentication', 'email-verification', 'validation']
      },
      {
        name: 'Password Reset with Security Questions',
        category: 'Authentication',
        description: 'Template reset password dengan multiple security layers dan notifikasi keamanan',
        template_content: `Sebagai pengguna yang lupa password, saya ingin mereset password saya melalui email dan pertanyaan keamanan agar dapat mengakses kembali akun saya dengan aman.

Kriteria Penerimaan:
- Pengguna memasukkan email di halaman "Forgot Password"
- Sistem kirim email reset password jika email terdaftar
- Email berisi link reset yang berlaku 1 jam
- Halaman reset password meminta password baru dan konfirmasi
- Password baru harus berbeda dari 3 password terakhir
- Setelah reset berhasil, kirim notifikasi ke email tentang perubahan password
- Semua session aktif di device lain akan di-logout
- Log aktivitas reset password untuk audit keamanan

Skenario Tambahan:
- Reset password dengan email yang tidak terdaftar
- Menggunakan link reset yang sudah expired
- Reset password berkali-kali dalam waktu singkat
- Verifikasi identitas dengan pertanyaan keamanan
- Two-factor authentication untuk reset password`,
        variables: [],
        is_system: true,
        usage_count: 0,
        tags: ['password', 'reset', 'recovery', 'security', 'email', 'audit']
      },
      {
        name: 'Product Catalog with Advanced Filtering',
        category: 'E-commerce',
        description: 'Template katalog produk dengan sistem filter, pencarian, dan sorting yang canggih',
        template_content: `Sebagai customer, saya ingin menjelajahi katalog produk dengan berbagai filter dan opsi pencarian agar dapat menemukan produk yang sesuai dengan kebutuhan dan budget saya.

Kriteria Penerimaan:
- Tampilan grid/list produk dengan foto, nama, harga, rating
- Filter berdasarkan: kategori, harga, brand, rating, availability
- Pencarian produk dengan autocomplete dan suggestion
- Sorting: harga (rendah-tinggi), popularitas, rating, terbaru
- Pagination dengan lazy loading untuk performa
- Quick view produk tanpa pindah halaman
- Wishlist untuk menyimpan produk favorit
- Compare produk (maksimal 3 produk)
- Filter harga dengan range slider
- Badge untuk produk: New, Sale, Best Seller, Out of Stock

Skenario Tambahan:
- Pencarian dengan typo atau kata kunci tidak tepat
- Filter kombinasi yang tidak menghasilkan produk
- Loading state saat fetch data produk
- Responsive design untuk mobile dan tablet
- SEO-friendly URLs untuk setiap kategori dan produk`,
        variables: [],
        is_system: true,
        usage_count: 0,
        tags: ['product', 'catalog', 'ecommerce', 'filter', 'search', 'pagination', 'wishlist']
      },
      {
        name: 'Shopping Cart with Inventory Validation',
        category: 'E-commerce',
        description: 'Template keranjang belanja dengan validasi stok real-time dan perhitungan otomatis',
        template_content: `Sebagai customer, saya ingin mengelola keranjang belanja saya dengan mudah, termasuk mengubah quantity, melihat total harga, dan memastikan produk masih tersedia sebelum checkout.

Kriteria Penerimaan:
- Tampilkan semua item di keranjang dengan foto, nama, harga, quantity
- Update quantity dengan input number atau +/- button
- Hapus item individual atau clear semua keranjang
- Validasi stok real-time saat mengubah quantity
- Perhitungan otomatis: subtotal, pajak, ongkir, total
- Estimasi ongkir berdasarkan alamat pengiriman
- Kode promo/voucher dengan validasi dan perhitungan diskon
- Save for later untuk item yang tidak jadi dibeli
- Persistent cart (tersimpan meski logout)
- Notifikasi jika ada perubahan harga atau stok

Skenario Tambahan:
- Item di keranjang sudah out of stock
- Harga produk berubah saat di keranjang
- Quantity melebihi stok yang tersedia
- Kode promo expired atau tidak valid
- Minimum order untuk free shipping`,
        variables: [],
        is_system: true,
        usage_count: 0,
        tags: ['cart', 'shopping', 'ecommerce', 'inventory', 'validation', 'promo', 'shipping']
      },
      {
        name: 'Multi-Payment Gateway Integration',
        category: 'E-commerce',
        description: 'Template sistem pembayaran dengan multiple gateway dan fraud detection',
        template_content: `Sebagai customer, saya ingin melakukan pembayaran dengan berbagai metode yang aman dan mudah agar dapat menyelesaikan pembelian sesuai preferensi saya.

Kriteria Penerimaan:
- Pilihan metode pembayaran: Credit Card, Debit Card, E-wallet, Bank Transfer, COD
- Integration dengan payment gateway: Midtrans, Xendit, DOKU
- Form pembayaran yang aman dengan SSL encryption
- Validasi kartu kredit real-time (Luhn algorithm)
- 3D Secure untuk transaksi kartu kredit
- QR Code untuk pembayaran e-wallet (GoPay, OVO, DANA)
- Virtual account untuk bank transfer
- Installment options untuk pembelian besar
- Fraud detection dan risk scoring
- Payment confirmation otomatis via webhook

Skenario Tambahan:
- Pembayaran gagal atau ditolak
- Timeout saat proses pembayaran
- Refund untuk pembayaran yang sudah berhasil
- Partial payment untuk pre-order
- Recurring payment untuk subscription
- Multi-currency support untuk international customers`,
        variables: [],
        is_system: true,
        usage_count: 0,
        tags: ['payment', 'checkout', 'transaction', 'gateway', 'security', 'fraud-detection', 'multi-currency']
      },
      {
        name: 'Advanced Analytics Dashboard with Export',
        category: 'Reporting',
        description: 'Template dashboard analytics dengan visualisasi data interaktif dan export ke berbagai format',
        template_content: `Sebagai business manager, saya ingin melihat analytics dan insights bisnis melalui dashboard interaktif agar dapat membuat keputusan strategis berdasarkan data yang akurat.

Kriteria Penerimaan:
- Dashboard dengan KPI cards: revenue, orders, customers, conversion rate
- Charts interaktif: line chart (trend), bar chart (comparison), pie chart (distribution)
- Filter berdasarkan: date range, product category, customer segment, region
- Real-time data updates setiap 5 menit
- Drill-down capability untuk detail analysis
- Custom date range picker dengan preset options
- Export data ke PDF, Excel, CSV dengan formatting
- Scheduled reports via email (daily, weekly, monthly)
- Comparison dengan periode sebelumnya (YoY, MoM, WoW)
- Goal tracking dengan progress indicators

Skenario Tambahan:
- Dashboard loading dengan skeleton screens
- Error handling untuk data yang tidak tersedia
- Mobile-responsive charts dan tables
- User permissions untuk different dashboard views
- Custom dashboard builder untuk advanced users
- Integration dengan Google Analytics dan Facebook Pixel`,
        variables: [],
        is_system: true,
        usage_count: 0,
        tags: ['report', 'analytics', 'business', 'dashboard', 'charts', 'export', 'kpi', 'visualization']
      },
      {
        name: 'Real-time Notification System with Preferences',
        category: 'Communication',
        description: 'Template sistem notifikasi multi-channel dengan personalisasi dan preference management',
        template_content: `Sebagai pengguna, saya ingin menerima notifikasi yang relevan melalui berbagai channel sesuai preferensi saya agar tetap terinformasi tanpa merasa terganggu.

Kriteria Penerimaan:
- Multiple notification channels: in-app, email, SMS, push notification
- Notification categories: Order Updates, Promotions, System Alerts, Social
- User preference settings untuk setiap category dan channel
- Real-time in-app notifications dengan badge counter
- Notification history dengan mark as read/unread
- Bulk actions: mark all as read, delete selected
- Smart notification grouping untuk menghindari spam
- Quiet hours setting untuk tidak mengganggu
- Priority levels: High, Medium, Low dengan different styling
- Rich notifications dengan images, actions, deep links

Skenario Tambahan:
- Notification delivery failure handling
- Retry mechanism untuk failed notifications
- A/B testing untuk notification content
- Notification analytics: open rate, click rate, conversion
- Template management untuk different notification types
- Integration dengan external services (Slack, Discord, Telegram)`,
        variables: [],
        is_system: true,
        usage_count: 0,
        tags: ['notification', 'realtime', 'communication', 'preferences', 'multi-channel', 'personalization', 'analytics']
      }
    ];

    // Check existing templates
    const { data: existingTemplates, error: checkError } = await supabaseService.admin
      .from('templates')
      .select('name')
      .eq('is_system', true);
    
    if (checkError) {
      console.error('Error checking existing templates:', checkError);
      throw new AppError('Failed to check existing templates', 500);
    }
    
    const existingNames = existingTemplates?.map(t => t.name) || [];
    const newTemplates = defaultTemplates.filter(t => !existingNames.includes(t.name));
    
    if (newTemplates.length === 0) {
      return res.success({
        existing_count: existingNames.length,
        new_count: 0
      }, 'All default templates already exist');
    }
    
    // Insert new templates
    const { data: insertedTemplates, error: insertError } = await supabaseService.admin
      .from('templates')
      .insert(newTemplates)
      .select('id, name, category');
    
    if (insertError) {
      console.error('Error inserting templates:', insertError);
      throw new AppError('Failed to insert default templates', 500);
    }
    
    console.log('✅ Default templates setup completed');
    
    res.success({
      existing_count: existingNames.length,
      new_count: insertedTemplates.length,
      inserted_templates: insertedTemplates
    }, 'Default templates setup completed');
  } catch (error) {
    console.error('Error setting up default templates:', error);
    next(error);
  }
};

/**
 * Get template usage statistics (admin only)
 */
export const getTemplateStats = async (req, res, next) => {
  try {
    const { data: stats, error } = await supabaseService.admin
      .from('template_usage_stats')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) {
      throw new AppError('Failed to get template statistics', 500);
    }

    res.success(stats);
  } catch (error) {
    next(error);
  }
};