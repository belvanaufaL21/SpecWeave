/**
 * Indonesian Error Messages
 * Comprehensive error messages in Indonesian with helpful and actionable information
 */

// Authentication Errors
export const AUTH_ERRORS = {
  // Login Errors
  INVALID_CREDENTIALS: 'Email atau password salah. Periksa kembali data Anda.',
  EMAIL_NOT_CONFIRMED: 'Silakan periksa email dan klik link konfirmasi sebelum masuk.',
  TOO_MANY_REQUESTS: 'Terlalu banyak percobaan masuk. Tunggu beberapa menit.',
  ACCOUNT_LOCKED: 'Akun Anda terkunci sementara. Silakan coba lagi dalam 15 menit.',
  
  // Registration Errors
  EMAIL_ALREADY_EXISTS: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun yang ada.',
  INVALID_EMAIL_FORMAT: 'Format email tidak valid. Contoh: nama@perusahaan.com',
  WEAK_PASSWORD: 'Password terlalu lemah. Gunakan kombinasi huruf besar, kecil, dan angka.',
  PASSWORD_TOO_SHORT: 'Password minimal 8 karakter.',
  PASSWORD_MISMATCH: 'Konfirmasi password tidak cocok.',
  NAME_REQUIRED: 'Nama lengkap wajib diisi.',
  NAME_TOO_SHORT: 'Nama minimal 2 karakter.',
  
  // Session Errors
  SESSION_EXPIRED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  UNAUTHORIZED: 'Anda tidak memiliki akses. Silakan masuk terlebih dahulu.',
  TOKEN_INVALID: 'Token tidak valid. Silakan masuk kembali.',
  
  // OAuth Errors
  OAUTH_CANCELLED: 'Proses Google dibatalkan. Silakan coba lagi jika Anda ingin melanjutkan.',
  OAUTH_ACCESS_DENIED: 'Akses ditolak oleh Google. Berikan izin untuk melanjutkan dengan akun Google Anda.',
  OAUTH_POPUP_BLOCKED: 'Pop-up diblokir browser. Izinkan pop-up untuk situs ini dan coba lagi.',
  OAUTH_TIMEOUT: 'Proses Google memakan waktu terlalu lama. Periksa koneksi internet dan coba lagi.',
  OAUTH_INVALID_REQUEST: 'Permintaan tidak valid. Silakan refresh halaman dan coba lagi.',
  OAUTH_NETWORK_ERROR: 'Masalah koneksi internet. Periksa koneksi Anda dan coba lagi.',
  OAUTH_GENERIC_ERROR: 'Terjadi kesalahan saat masuk dengan Google. Coba gunakan email sebagai alternatif.'
};

// Network and Connection Errors
export const NETWORK_ERRORS = {
  CONNECTION_FAILED: 'Koneksi internet bermasalah. Silakan coba lagi.',
  TIMEOUT: 'Permintaan memakan waktu terlalu lama. Periksa koneksi internet Anda.',
  SERVER_ERROR: 'Server sedang bermasalah. Tim kami sedang menangani.',
  SERVICE_UNAVAILABLE: 'Layanan sedang tidak tersedia. Silakan coba lagi dalam beberapa menit.',
  RATE_LIMITED: 'Terlalu banyak permintaan. Tunggu sebentar sebelum mencoba lagi.',
  OFFLINE: 'Anda sedang offline. Periksa koneksi internet Anda.',
  DNS_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi internet atau coba lagi nanti.'
};

// Validation Errors
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: 'Field ini wajib diisi.',
  INVALID_FORMAT: 'Format tidak valid.',
  TOO_SHORT: 'Terlalu pendek. Minimal {min} karakter.',
  TOO_LONG: 'Terlalu panjang. Maksimal {max} karakter.',
  INVALID_EMAIL: 'Format email tidak valid.',
  INVALID_URL: 'Format URL tidak valid. Contoh: https://example.com',
  INVALID_PHONE: 'Format nomor telepon tidak valid.',
  INVALID_DATE: 'Format tanggal tidak valid.',
  INVALID_NUMBER: 'Harus berupa angka.',
  OUT_OF_RANGE: 'Nilai harus antara {min} dan {max}.',
  
  // Password specific
  PASSWORD_REQUIREMENTS: 'Password harus memiliki minimal 8 karakter, huruf besar, huruf kecil, dan angka.',
  PASSWORD_COMMON: 'Password terlalu umum. Gunakan kombinasi yang lebih unik.',
  PASSWORD_PERSONAL: 'Jangan gunakan informasi personal dalam password.',
  
  // File validation
  FILE_TOO_LARGE: 'File terlalu besar. Maksimal {maxSize}.',
  INVALID_FILE_TYPE: 'Jenis file tidak didukung. Gunakan {allowedTypes}.',
  FILE_CORRUPTED: 'File rusak atau tidak dapat dibaca.'
};

// JIRA Integration Errors
export const JIRA_ERRORS = {
  CONNECTION_FAILED: 'Gagal terhubung ke JIRA. Periksa URL dan kredensial Anda.',
  INVALID_URL: 'URL JIRA tidak valid. Contoh: https://perusahaan.atlassian.net',
  INVALID_CREDENTIALS: 'Username atau token JIRA salah. Periksa kembali kredensial Anda.',
  UNAUTHORIZED: 'Tidak memiliki akses ke JIRA. Periksa permission akun Anda.',
  PROJECT_NOT_FOUND: 'Proyek JIRA tidak ditemukan. Periksa kunci proyek.',
  EPIC_NOT_FOUND: 'Epic tidak ditemukan atau tidak dapat diakses.',
  PERMISSION_DENIED: 'Tidak memiliki permission untuk mengakses resource ini di JIRA.',
  QUOTA_EXCEEDED: 'Kuota API JIRA terlampaui. Coba lagi nanti.',
  
  // Setup specific
  SETUP_INCOMPLETE: 'Setup JIRA belum lengkap. Lengkapi semua field yang diperlukan.',
  TEST_CONNECTION_FAILED: 'Tes koneksi gagal. Periksa URL, username, dan token.',
  INVALID_TOKEN: 'Token JIRA tidak valid atau sudah kedaluwarsa.',
  
  // Export specific
  EXPORT_FAILED: 'Gagal mengekspor ke JIRA. Periksa koneksi dan permission.',
  TICKET_CREATION_FAILED: 'Gagal membuat tiket JIRA. Periksa konfigurasi proyek.',
  
  // Troubleshooting tips
  TROUBLESHOOTING: {
    CHECK_URL: 'Pastikan URL JIRA benar dan dapat diakses',
    CHECK_CREDENTIALS: 'Verifikasi username dan token API',
    CHECK_PERMISSIONS: 'Pastikan akun memiliki permission yang diperlukan',
    CHECK_PROJECT: 'Verifikasi kunci proyek dan akses ke proyek',
    CONTACT_ADMIN: 'Hubungi administrator JIRA jika masalah berlanjut'
  }
};

// Chat and AI Errors
export const CHAT_ERRORS = {
  GENERATION_FAILED: 'Gagal menghasilkan skenario. Silakan coba lagi.',
  INVALID_INPUT: 'Input tidak valid. Pastikan user story sesuai format.',
  EMPTY_INPUT: 'Silakan masukkan user story terlebih dahulu.',
  TOO_LONG_INPUT: 'User story terlalu panjang. Maksimal 2000 karakter.',
  AI_SERVICE_ERROR: 'Layanan AI sedang bermasalah. Coba lagi dalam beberapa menit.',
  CONTEXT_LOST: 'Konteks percakapan hilang. Mulai chat baru.',
  RATE_LIMITED: 'Terlalu banyak permintaan. Tunggu sebentar sebelum mengirim lagi.',
  
  // Template errors
  TEMPLATE_NOT_FOUND: 'Template tidak ditemukan.',
  TEMPLATE_LOAD_FAILED: 'Gagal memuat template. Silakan coba lagi.',
  INVALID_TEMPLATE: 'Format template tidak valid.',
  
  // Export errors
  EXPORT_NO_DATA: 'Tidak ada data untuk diekspor. Buat skenario terlebih dahulu.',
  EXPORT_FAILED: 'Gagal mengekspor data. Silakan coba lagi.',
  FILE_GENERATION_FAILED: 'Gagal membuat file. Coba format lain atau hubungi support.'
};

// File and Upload Errors
export const FILE_ERRORS = {
  UPLOAD_FAILED: 'Gagal mengunggah file. Silakan coba lagi.',
  DOWNLOAD_FAILED: 'Gagal mengunduh file. Periksa koneksi internet.',
  FILE_NOT_FOUND: 'File tidak ditemukan.',
  FILE_CORRUPTED: 'File rusak atau tidak dapat dibaca.',
  UNSUPPORTED_FORMAT: 'Format file tidak didukung.',
  FILE_TOO_LARGE: 'File terlalu besar. Maksimal {maxSize} MB.',
  STORAGE_FULL: 'Penyimpanan penuh. Hapus beberapa file lama.',
  PERMISSION_DENIED: 'Tidak memiliki permission untuk mengakses file.'
};

// Database and Storage Errors
export const STORAGE_ERRORS = {
  SAVE_FAILED: 'Gagal menyimpan data. Silakan coba lagi.',
  LOAD_FAILED: 'Gagal memuat data. Refresh halaman dan coba lagi.',
  DELETE_FAILED: 'Gagal menghapus data. Silakan coba lagi.',
  SYNC_FAILED: 'Gagal sinkronisasi data. Periksa koneksi internet.',
  QUOTA_EXCEEDED: 'Kuota penyimpanan terlampaui. Hapus data lama.',
  CORRUPTION_DETECTED: 'Data rusak terdeteksi. Backup dan restore diperlukan.',
  MIGRATION_FAILED: 'Gagal migrasi data. Hubungi support untuk bantuan.'
};

// Permission and Access Errors
export const PERMISSION_ERRORS = {
  ACCESS_DENIED: 'Akses ditolak. Anda tidak memiliki permission.',
  INSUFFICIENT_PRIVILEGES: 'Permission tidak mencukupi untuk operasi ini.',
  ACCOUNT_SUSPENDED: 'Akun Anda ditangguhkan. Hubungi support.',
  FEATURE_DISABLED: 'Fitur ini dinonaktifkan untuk akun Anda.',
  SUBSCRIPTION_REQUIRED: 'Fitur ini memerlukan langganan premium.',
  TRIAL_EXPIRED: 'Masa trial telah berakhir. Upgrade akun Anda.'
};

// Generic Error Messages
export const GENERIC_ERRORS = {
  SOMETHING_WRONG: 'Terjadi kesalahan. Silakan coba lagi.',
  UNEXPECTED_ERROR: 'Kesalahan tidak terduga. Refresh halaman dan coba lagi.',
  MAINTENANCE: 'Sistem sedang dalam pemeliharaan. Coba lagi nanti.',
  FEATURE_UNAVAILABLE: 'Fitur sedang tidak tersedia. Coba lagi nanti.',
  CONTACT_SUPPORT: 'Jika masalah berlanjut, hubungi tim support.',
  
  // User actions
  PLEASE_TRY_AGAIN: 'Silakan coba lagi.',
  REFRESH_PAGE: 'Refresh halaman dan coba lagi.',
  CHECK_CONNECTION: 'Periksa koneksi internet Anda.',
  WAIT_AND_RETRY: 'Tunggu sebentar dan coba lagi.'
};

// Success Messages (for contrast with errors)
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Data berhasil disimpan!',
  DELETE_SUCCESS: 'Data berhasil dihapus!',
  EXPORT_SUCCESS: 'Data berhasil diekspor!',
  CONNECTION_SUCCESS: 'Koneksi berhasil!',
  UPLOAD_SUCCESS: 'File berhasil diunggah!',
  SYNC_SUCCESS: 'Data berhasil disinkronisasi!',
  
  // Authentication
  LOGIN_SUCCESS: 'Berhasil masuk! Selamat datang kembali.',
  REGISTER_SUCCESS: 'Akun berhasil dibuat! Silakan periksa email untuk verifikasi.',
  LOGOUT_SUCCESS: 'Berhasil keluar. Sampai jumpa lagi!',
  
  // JIRA
  JIRA_CONNECTED: 'JIRA berhasil terhubung!',
  JIRA_EXPORT_SUCCESS: 'Skenario berhasil diekspor ke JIRA!',
  
  // Templates
  TEMPLATE_CREATED: 'Template berhasil dibuat!',
  TEMPLATE_UPDATED: 'Template berhasil diperbarui!',
  
  // Chat
  SCENARIO_GENERATED: 'Skenario berhasil dibuat!',
  MESSAGE_SENT: 'Pesan berhasil dikirim!'
};

// Warning Messages
export const WARNING_MESSAGES = {
  UNSAVED_CHANGES: 'Ada perubahan yang belum disimpan. Yakin ingin keluar?',
  DATA_LOSS_WARNING: 'Tindakan ini akan menghapus data. Yakin ingin melanjutkan?',
  IRREVERSIBLE_ACTION: 'Tindakan ini tidak dapat dibatalkan.',
  BETA_FEATURE: 'Ini adalah fitur beta. Mungkin ada bug atau ketidakstabilan.',
  EXPERIMENTAL: 'Fitur eksperimental. Gunakan dengan hati-hati.',
  
  // Connection warnings
  SLOW_CONNECTION: 'Koneksi lambat terdeteksi. Proses mungkin memakan waktu lebih lama.',
  UNSTABLE_CONNECTION: 'Koneksi tidak stabil. Data mungkin tidak tersinkronisasi.',
  
  // Usage warnings
  QUOTA_WARNING: 'Mendekati batas kuota. Pertimbangkan untuk upgrade.',
  PERFORMANCE_WARNING: 'Performa mungkin menurun dengan data sebanyak ini.'
};

// Utility function to format error with parameters
export const formatError = (errorTemplate, params = {}) => {
  let formattedError = errorTemplate;
  
  Object.keys(params).forEach(key => {
    const placeholder = `{${key}}`;
    formattedError = formattedError.replace(new RegExp(placeholder, 'g'), params[key]);
  });
  
  return formattedError;
};

// Utility function to get user-friendly error message
export const getUserFriendlyError = (error) => {
  // Handle different error types and return appropriate Indonesian message
  if (!error) return GENERIC_ERRORS.SOMETHING_WRONG;
  
  const errorMessage = error.message || error.toString();
  const errorCode = error.code || error.status;
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return NETWORK_ERRORS.CONNECTION_FAILED;
  }
  
  if (errorMessage.includes('timeout')) {
    return NETWORK_ERRORS.TIMEOUT;
  }
  
  // Authentication errors
  if (errorMessage.includes('Invalid login credentials')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }
  
  if (errorMessage.includes('Email not confirmed')) {
    return AUTH_ERRORS.EMAIL_NOT_CONFIRMED;
  }
  
  if (errorMessage.includes('already registered')) {
    return AUTH_ERRORS.EMAIL_ALREADY_EXISTS;
  }
  
  // JIRA errors
  if (errorMessage.includes('JIRA') || errorMessage.includes('jira')) {
    if (errorMessage.includes('connection')) {
      return JIRA_ERRORS.CONNECTION_FAILED;
    }
    if (errorMessage.includes('unauthorized')) {
      return JIRA_ERRORS.UNAUTHORIZED;
    }
    return JIRA_ERRORS.CONNECTION_FAILED;
  }
  
  // Server errors
  if (errorCode >= 500) {
    return NETWORK_ERRORS.SERVER_ERROR;
  }
  
  if (errorCode === 429) {
    return NETWORK_ERRORS.RATE_LIMITED;
  }
  
  if (errorCode === 401) {
    return AUTH_ERRORS.UNAUTHORIZED;
  }
  
  if (errorCode === 403) {
    return PERMISSION_ERRORS.ACCESS_DENIED;
  }
  
  // Default fallback
  return GENERIC_ERRORS.SOMETHING_WRONG;
};