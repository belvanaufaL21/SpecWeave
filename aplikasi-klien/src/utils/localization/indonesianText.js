/**
 * Indonesian Text Localization
 * Consistent Indonesian text and terminology for SpecWeave application
 */

// Button Labels and Actions
export const BUTTON_LABELS = {
  // Authentication
  LOGIN: 'Masuk',
  SIGNUP: 'Daftar',
  REGISTER: 'Daftar',
  SUBMIT: 'Kirim',
  CANCEL: 'Batal',
  SAVE: 'Simpan',
  DELETE: 'Hapus',
  EDIT: 'Edit',
  UPDATE: 'Perbarui',
  
  // Navigation
  BACK: 'Kembali',
  NEXT: 'Selanjutnya',
  PREVIOUS: 'Sebelumnya',
  CONTINUE: 'Lanjutkan',
  CLOSE: 'Tutup',
  
  // Actions
  EXPORT: 'Ekspor',
  IMPORT: 'Impor',
  DOWNLOAD: 'Unduh',
  UPLOAD: 'Unggah',
  CONNECT: 'Hubungkan',
  DISCONNECT: 'Putuskan',
  REFRESH: 'Muat Ulang',
  RETRY: 'Coba Lagi',
  
  // Chat Actions
  NEW_CHAT: 'Chat Baru',
  SEND: 'Kirim',
  CLEAR: 'Bersihkan',
  COPY: 'Salin',
  
  // Templates
  TEMPLATES: 'Template',
  SELECT_TEMPLATE: 'Pilih Template',
  CREATE_TEMPLATE: 'Buat Template',
  
  // JIRA
  SELECT_EPIC: 'Pilih Epic',
  CHANGE_EPIC: 'Ganti Epic',
  SETUP_JIRA: 'Setup JIRA',
  CONNECT_JIRA: 'Hubungkan JIRA',
  CONTINUE_WITHOUT_EPIC: 'Lanjutkan Tanpa Epic',
  CONFIRM_EPIC_SELECTION: 'Konfirmasi Pilihan Epic',
  BACK_TO_EPIC_LIST: 'Kembali ke Daftar Epic',
  GO_TO_JIRA_MANAGEMENT: 'Ke Manajemen Proyek JIRA',
  CHECK_AGAIN: 'Periksa Lagi',
  CLEAR_SEARCH: 'Hapus Pencarian',
  
  // Testing
  TEST_WITH_METEOR: 'Tes dengan Meteor',
  RUN_TEST: 'Jalankan Tes',
  
  // Scenario Generation
  GENERATE_MORE_SCENARIOS: 'Generate Skenario Tambahan',
  GENERATING_SCENARIOS: 'Menghasilkan Skenario...',
  EXPAND_SCENARIOS: 'Lihat Skenario Tambahan',
  COLLAPSE_SCENARIOS: 'Sembunyikan Skenario Tambahan',
  
  // General
  START_NOW: 'Mulai Sekarang',
  GET_STARTED: 'Mulai',
  LEARN_MORE: 'Pelajari Lebih Lanjut',
  VIEW_ALL: 'Lihat Semua',
  SHOW_MORE: 'Tampilkan Lebih Banyak',
  SHOW_LESS: 'Tampilkan Lebih Sedikit'
};

// Page Titles and Headers
export const PAGE_TITLES = {
  DASHBOARD: 'Dashboard',
  CHAT: 'Chat',
  TEMPLATES: 'Template',
  SETTINGS: 'Pengaturan',
  PROFILE: 'Profil',
  HELP: 'Bantuan',
  SELECT_EPIC: 'Pilih JIRA Epic',
  EPIC_SELECTION: 'Pemilihan Epic'
};

// Form Labels
export const FORM_LABELS = {
  EMAIL: 'Email',
  PASSWORD: 'Password',
  CONFIRM_PASSWORD: 'Konfirmasi Password',
  NAME: 'Nama',
  FULL_NAME: 'Nama Lengkap',
  FIRST_NAME: 'Nama Depan',
  LAST_NAME: 'Nama Belakang',
  PHONE: 'Nomor Telepon',
  ADDRESS: 'Alamat',
  COMPANY: 'Perusahaan',
  POSITION: 'Jabatan',
  
  // JIRA Fields
  JIRA_URL: 'URL JIRA',
  JIRA_USERNAME: 'Username JIRA',
  JIRA_TOKEN: 'Token JIRA',
  PROJECT_KEY: 'Kunci Proyek',
  EPIC_NAME: 'Nama Epic',
  
  // Template Fields
  TEMPLATE_NAME: 'Nama Template',
  TEMPLATE_DESCRIPTION: 'Deskripsi Template',
  TEMPLATE_CONTENT: 'Konten Template',
  TEMPLATE_CATEGORY: 'Kategori Template'
};

// Status Messages
export const STATUS_MESSAGES = {
  // Loading States
  LOADING: 'Memuat...',
  PROCESSING: 'Memproses...',
  SAVING: 'Menyimpan...',
  DELETING: 'Menghapus...',
  CONNECTING: 'Menghubungkan...',
  UPLOADING: 'Mengunggah...',
  DOWNLOADING: 'Mengunduh...',
  GENERATING: 'Menghasilkan...',
  
  // Success States
  SUCCESS: 'Berhasil!',
  SAVED: 'Tersimpan!',
  DELETED: 'Terhapus!',
  CONNECTED: 'Terhubung!',
  UPLOADED: 'Terunggah!',
  DOWNLOADED: 'Terunduh!',
  SENT: 'Terkirim!',
  
  // Progress States
  PLEASE_WAIT: 'Mohon tunggu...',
  ALMOST_DONE: 'Hampir selesai...',
  FINALIZING: 'Menyelesaikan...'
};

// Navigation and Menu Items
export const NAVIGATION = {
  HOME: 'Beranda',
  DASHBOARD: 'Dashboard',
  CHAT: 'Chat',
  TEMPLATES: 'Template',
  HISTORY: 'Riwayat',
  SETTINGS: 'Pengaturan',
  PROFILE: 'Profil',
  HELP: 'Bantuan',
  LOGOUT: 'Keluar',
  
  // Quick Actions
  REFERENCE_LIBRARY: 'Perpustakaan Referensi',
  JIRA_INTEGRATION: 'Integrasi JIRA',
  USER_GUIDE: 'Panduan Pengguna'
};

// Welcome and Greeting Messages
export const GREETINGS = {
  WELCOME: 'Selamat datang',
  WELCOME_BACK: 'Selamat datang kembali',
  GOOD_MORNING: 'Selamat pagi',
  GOOD_AFTERNOON: 'Selamat siang',
  GOOD_EVENING: 'Selamat malam',
  HELLO: 'Halo',
  
  // Context-specific greetings
  WELCOME_TO_SPECWEAVE: 'Selamat datang di SpecWeave',
  WELCOME_NEW_USER: 'Selamat datang! Mari mulai dengan SpecWeave',
  WELCOME_BACK_USER: 'Selamat datang kembali! Lanjutkan pekerjaan Anda'
};

// Descriptions and Help Text
export const DESCRIPTIONS = {
  // App Description
  SPECWEAVE_TAGLINE: 'Buat Skenario Gherkin Profesional dengan AI',
  SPECWEAVE_DESCRIPTION: 'Konversi user story Anda menjadi skenario testing yang berkualitas tinggi dengan bantuan AI yang canggih',
  
  // Feature Descriptions
  TEMPLATES_DESC: 'Template skenario siap pakai untuk pengembangan yang lebih cepat dan kualitas yang konsisten',
  REFERENCE_LIBRARY_DESC: 'Kelola referensi scenario dan konfigurasi auto reference system untuk generation yang lebih akurat',
  JIRA_INTEGRATION_DESC: 'Hubungkan dengan JIRA untuk mempermudah workflow dan manajemen proyek',
  JIRA_CONNECTED_DESC: 'Buat tiket otomatis dan sinkronisasi dengan proyek JIRA Anda',
  SELECT_EPIC_DESCRIPTION: 'Pilih Epic untuk mengorganisir user story dan skenario Anda',
  
  // Help Text
  EMAIL_HELP: 'Masukkan alamat email yang valid',
  PASSWORD_HELP: 'Password minimal 8 karakter dengan kombinasi huruf dan angka',
  JIRA_URL_HELP: 'Contoh: https://perusahaan.atlassian.net',
  JIRA_TOKEN_HELP: 'Token API JIRA Anda untuk autentikasi'
};

// Confirmation Messages
export const CONFIRMATIONS = {
  DELETE_ITEM: 'Apakah Anda yakin ingin menghapus item ini?',
  DELETE_TEMPLATE: 'Apakah Anda yakin ingin menghapus template ini?',
  DELETE_CHAT: 'Apakah Anda yakin ingin menghapus chat ini?',
  LOGOUT: 'Apakah Anda yakin ingin keluar?',
  DISCONNECT_JIRA: 'Apakah Anda yakin ingin memutuskan koneksi JIRA?',
  CLEAR_CHAT: 'Apakah Anda yakin ingin menghapus semua pesan?',
  RESET_SETTINGS: 'Apakah Anda yakin ingin mereset pengaturan ke default?',
  CONFIRM_EPIC_SELECTION: 'Konfirmasi Pilihan Epic'
};

// Placeholders
export const PLACEHOLDERS = {
  EMAIL: 'nama@perusahaan.com',
  PASSWORD: '••••••••',
  NAME: 'Nama lengkap Anda',
  SEARCH: 'Cari...',
  SEARCH_TEMPLATES: 'Cari template...',
  SEARCH_CHATS: 'Cari chat...',
  SEARCH_EPICS: 'Cari Epic berdasarkan nama, key, atau deskripsi...',
  USER_STORY: 'Masukkan user story Anda di sini...',
  JIRA_URL: 'https://perusahaan.atlassian.net',
  TEMPLATE_NAME: 'Nama template baru',
  NOTES: 'Catatan tambahan...'
};

// Tooltips
export const TOOLTIPS = {
  NEW_CHAT: 'Mulai percakapan baru',
  EXPORT: 'Ekspor skenario ke Excel',
  TEST_WITH_METEOR: 'Jalankan analisis kualitas pada skenario',
  TEMPLATES: 'Jelajahi template user story',
  SELECT_EPIC: 'Pilih JIRA Epic untuk konteks',
  GENERATE_MORE_SCENARIOS: 'Generate skenario tambahan untuk user story ini',
  COPY: 'Salin ke clipboard',
  DELETE: 'Hapus item ini',
  EDIT: 'Edit item ini',
  REFRESH: 'Muat ulang data',
  SETTINGS: 'Buka pengaturan',
  PROFILE: 'Lihat profil',
  HELP: 'Buka bantuan',
  LOGOUT: 'Keluar dari akun'
};

// Time and Date Related
export const TIME_LABELS = {
  TODAY: 'Hari ini',
  YESTERDAY: 'Kemarin',
  THIS_WEEK: 'Minggu ini',
  LAST_WEEK: 'Minggu lalu',
  THIS_MONTH: 'Bulan ini',
  LAST_MONTH: 'Bulan lalu',
  OLDER: 'Lebih lama',
  
  // Relative time
  JUST_NOW: 'Baru saja',
  MINUTES_AGO: 'menit yang lalu',
  HOURS_AGO: 'jam yang lalu',
  DAYS_AGO: 'hari yang lalu',
  WEEKS_AGO: 'minggu yang lalu',
  MONTHS_AGO: 'bulan yang lalu'
};

// Statistics and Numbers
export const STATS_LABELS = {
  TOTAL: 'Total',
  COUNT: 'Jumlah',
  SCENARIOS: 'Skenario',
  CHATS: 'Chat',
  MESSAGES: 'Pesan',
  TEMPLATES: 'Template',
  CONNECTIONS: 'Koneksi',
  
  // Quality metrics
  QUALITY_SCORE: 'Skor Kualitas',
  AVERAGE_SCORE: 'Skor Rata-rata',
  HIGH_QUALITY: 'Kualitas Tinggi',
  GENERATION_TIME: 'Waktu Generasi',
  
  // Time periods
  LAST_30_DAYS: '30 Hari Terakhir',
  THIS_MONTH: 'Bulan Ini',
  ALL_TIME: 'Sepanjang Waktu'
};

// Empty States
export const EMPTY_STATES = {
  NO_CHATS: 'Belum ada chat',
  NO_TEMPLATES: 'Belum ada template',
  NO_SCENARIOS: 'Belum ada skenario',
  NO_CONNECTIONS: 'Belum ada koneksi',
  NO_RESULTS: 'Tidak ada hasil ditemukan',
  NO_DATA: 'Tidak ada data',
  NO_EPICS: 'Tidak Ada Epic',
  NO_MATCHING_EPICS: 'Tidak Ada Epic yang Cocok',
  NO_ACTIVE_PROJECT: 'Tidak Ada Proyek Aktif',
  
  // Empty state descriptions
  NO_CHATS_DESC: 'Mulai chat pertama Anda untuk membuat skenario Gherkin',
  NO_TEMPLATES_DESC: 'Buat template pertama Anda untuk mempercepat workflow',
  NO_SCENARIOS_DESC: 'Belum ada skenario yang dibuat. Mulai dengan chat baru',
  NO_SEARCH_RESULTS: 'Tidak ada hasil yang cocok dengan pencarian Anda',
  NO_EPICS_DESC: 'tidak memiliki Epic issues',
  NO_MATCHING_EPICS_DESC: 'Coba sesuaikan kata kunci pencarian Anda',
  NO_ACTIVE_PROJECT_DESC: 'Silakan atur proyek aktif untuk chat ini di Manajemen Proyek JIRA terlebih dahulu, kemudian kembali ke sini untuk memilih Epic.'
};

// Categories and Tags
export const CATEGORIES = {
  GENERAL: 'Umum',
  AUTHENTICATION: 'Autentikasi',
  USER_MANAGEMENT: 'Manajemen Pengguna',
  E_COMMERCE: 'E-Commerce',
  API: 'API',
  MOBILE: 'Mobile',
  WEB: 'Web',
  TESTING: 'Testing',
  INTEGRATION: 'Integrasi',
  SECURITY: 'Keamanan'
};

// File and Export Related
export const FILE_LABELS = {
  EXPORT_EXCEL: 'Ekspor ke Excel',
  DOWNLOAD_FILE: 'Unduh File',
  FILE_SIZE: 'Ukuran File',
  FILE_TYPE: 'Jenis File',
  LAST_MODIFIED: 'Terakhir Diubah',
  CREATED_DATE: 'Tanggal Dibuat'
};

// Epic and JIRA Related
export const EPIC_LABELS = {
  EPIC_NAME: 'Nama Epic',
  EPIC_KEY: 'Key Epic',
  EPIC_STATUS: 'Status Epic',
  EPIC_ASSIGNEE: 'Assignee',
  EPIC_CREATED: 'Dibuat',
  EPIC_UPDATED: 'Diperbarui',
  EPIC_PROJECT: 'Proyek',
  EPIC_ISSUE_TYPE: 'Tipe Issue',
  ACTIVE_PROJECT: 'Proyek Aktif',
  EPIC_CONTEXT: 'Konteks Epic',
  EPIC_CONTEXT_DESC: 'Semua user story dan skenario yang dibuat dalam sesi chat ini akan dikaitkan dengan Epic ini. Anda dapat mengubah pilihan Epic nanti jika diperlukan.',
  PROJECT_MISMATCH: 'Ketidakcocokan Proyek',
  CONNECTION_ISSUE: 'Masalah Koneksi',
  LOADING_EPICS: 'Memuat Epic...',
  LOADING_EPICS_FROM: 'Memuat Epic dari',
  SHOWING_RESULTS: 'Menampilkan',
  OF_TOTAL: 'dari',
  EPIC_PLURAL: 'Epic'
};

// Utility function to get greeting based on time
export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return GREETINGS.GOOD_MORNING;
  } else if (hour < 17) {
    return GREETINGS.GOOD_AFTERNOON;
  } else {
    return GREETINGS.GOOD_EVENING;
  }
};

// Utility function to format relative time in Indonesian
export const formatRelativeTime = (date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return TIME_LABELS.JUST_NOW;
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} ${TIME_LABELS.MINUTES_AGO}`;
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} ${TIME_LABELS.HOURS_AGO}`;
  } else if (diffInMinutes < 10080) { // 7 days
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} ${TIME_LABELS.DAYS_AGO}`;
  } else if (diffInMinutes < 43200) { // 30 days
    const weeks = Math.floor(diffInMinutes / 10080);
    return `${weeks} ${TIME_LABELS.WEEKS_AGO}`;
  } else {
    const months = Math.floor(diffInMinutes / 43200);
    return `${months} ${TIME_LABELS.MONTHS_AGO}`;
  }
};