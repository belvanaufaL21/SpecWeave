import { ErrorType } from './errorTypes.js'
import { getUserFriendlyError, GENERIC_ERRORS } from '../localization';

/**
 * Indonesian error messages for user-facing display
 */
export const ErrorMessages = {
  [ErrorType.NETWORK]: {
    CONNECTION_FAILED: 'Koneksi internet bermasalah. Silakan coba lagi.',
    TIMEOUT: 'Koneksi timeout. Silakan periksa koneksi internet Anda.',
    OFFLINE: 'Anda sedang offline. Beberapa fitur mungkin tidak tersedia.',
    SLOW_CONNECTION: 'Koneksi internet lambat. Mohon bersabar.'
  },
  
  [ErrorType.SERVER]: {
    INTERNAL_ERROR: 'Server sedang bermasalah. Tim kami sedang menangani.',
    SERVICE_UNAVAILABLE: 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.',
    MAINTENANCE: 'Server sedang dalam pemeliharaan. Silakan coba lagi nanti.',
    OVERLOADED: 'Server sedang sibuk. Silakan coba lagi dalam beberapa saat.'
  },
  
  [ErrorType.VALIDATION]: {
    INVALID_EMAIL: 'Format email tidak valid',
    WEAK_PASSWORD: 'Password terlalu lemah. Minimal 8 karakter dengan kombinasi huruf dan angka.',
    REQUIRED_FIELD: 'Field ini wajib diisi',
    INVALID_FORMAT: 'Format input tidak valid',
    TOO_LONG: 'Input terlalu panjang',
    TOO_SHORT: 'Input terlalu pendek'
  },
  
  [ErrorType.AUTHENTICATION]: {
    INVALID_CREDENTIALS: 'Email atau password salah',
    EMAIL_NOT_FOUND: 'Email tidak terdaftar',
    ACCOUNT_LOCKED: 'Akun Anda terkunci. Silakan hubungi support.',
    SESSION_EXPIRED: 'Sesi Anda telah berakhir. Silakan login kembali.',
    OAUTH_FAILED: 'Login dengan Google gagal. Silakan coba lagi.',
    REGISTRATION_FAILED: 'Registrasi gagal. Silakan coba lagi.'
  },
  
  [ErrorType.JIRA_INTEGRATION]: {
    CONNECTION_FAILED: 'Koneksi ke JIRA gagal. Periksa URL dan kredensial Anda.',
    INVALID_CREDENTIALS: 'Kredensial JIRA tidak valid',
    PROJECT_NOT_FOUND: 'Project JIRA tidak ditemukan',
    PERMISSION_DENIED: 'Anda tidak memiliki akses ke project ini',
    API_LIMIT_EXCEEDED: 'Batas API JIRA terlampaui. Coba lagi nanti.',
    EXPORT_FAILED: 'Export ke JIRA gagal. Silakan coba lagi.'
  },
  
  [ErrorType.EXPORT]: {
    GENERATION_FAILED: 'Gagal membuat file export. Silakan coba lagi.',
    DOWNLOAD_FAILED: 'Download gagal. Silakan coba lagi.',
    INVALID_DATA: 'Data tidak valid untuk export',
    FILE_TOO_LARGE: 'File terlalu besar untuk di-export',
    FORMAT_ERROR: 'Format export tidak didukung'
  },
  
  [ErrorType.PERMISSION]: {
    ACCESS_DENIED: 'Anda tidak memiliki akses untuk melakukan aksi ini',
    INSUFFICIENT_PRIVILEGES: 'Hak akses tidak mencukupi',
    RESOURCE_FORBIDDEN: 'Akses ke resource ini dilarang'
  },
  
  [ErrorType.UNKNOWN]: {
    GENERIC: 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.',
    UNEXPECTED: 'Terjadi kesalahan tak terduga. Tim kami telah diberitahu.'
  }
}

/**
 * Get user-friendly error message in Indonesian
 */
export function getErrorMessage(error) {
  // Use the enhanced error handler from localization
  return getUserFriendlyError(error) || ErrorMessages[ErrorType.UNKNOWN].GENERIC;
}

/**
 * Get troubleshooting tips for specific error types
 */
export const TroubleshootingTips = {
  [ErrorType.NETWORK]: [
    'Periksa koneksi internet Anda',
    'Coba refresh halaman',
    'Matikan VPN jika sedang aktif',
    'Coba gunakan jaringan yang berbeda'
  ],
  
  [ErrorType.SERVER]: [
    'Tunggu beberapa menit dan coba lagi',
    'Periksa status server di media sosial kami',
    'Hubungi support jika masalah berlanjut'
  ],
  
  [ErrorType.AUTHENTICATION]: [
    'Pastikan email dan password benar',
    'Coba reset password jika lupa',
    'Periksa apakah akun sudah diverifikasi',
    'Hapus cache browser dan coba lagi'
  ],
  
  [ErrorType.JIRA_INTEGRATION]: [
    'Pastikan URL JIRA benar dan dapat diakses',
    'Periksa username dan API token',
    'Pastikan Anda memiliki akses ke project',
    'Coba disconnect dan connect ulang'
  ],
  
  [ErrorType.EXPORT]: [
    'Pastikan data sudah lengkap',
    'Coba export dengan format berbeda',
    'Periksa ruang penyimpanan device',
    'Coba export data yang lebih sedikit'
  ]
}

/**
 * Get troubleshooting tips for error type
 */
export function getTroubleshootingTips(errorType) {
  return TroubleshootingTips[errorType] || []
}