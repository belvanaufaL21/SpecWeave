/**
 * Landing Page Constants
 * Centralized configuration for landing page content and settings
 */

// Animation and UI Constants
export const LANDING_CONSTANTS = {
  ANIMATION: {
    SCROLL_THRESHOLD: 0.1,
    SCROLL_ROOT_MARGIN: '0px 0px -50px 0px',
    COUNTER_DURATION: 2000,
    TRANSITION_DELAYS: {
      HERO: 200,
      STATS: 400,
      WHAT_IS: 600,
      CARA_KERJA: 800,
      KEUNTUNGAN: 1000
    }
  },
  
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },

  TIMEOUTS: {
    FORM_SUBMISSION: 30000,
    GOOGLE_AUTH: 15000
  }
};

// Content Constants
export const LANDING_CONTENT = {
  HERO: {
    BADGE_TEXT: 'Versi 2.0 Kini Tersedia',
    TITLE: 'Transformasi User Story ke Gherkin Backlog',
    SUBTITLE: 'Otomatisasi pembuatan skenario testing (Given-When-Then) dengan AI canggih. Hemat waktu QA tim Anda hingga 80% dengan dokumentasi yang terstandarisasi.',
    STATS: {
      ACCURACY: 99,
      SPEED: '<10s',
      USERS: 500
    }
  },

  FEATURES: [
    'Template Gherkin yang dapat dikustomisasi penuh',
    'Export langsung ke Excel / Spreadsheet', 
    'Analisis kelayakan user story otomatis'
  ],

  WHAT_IS: {
    USER_STORY: {
      TITLE: 'User Story Format',
      DESCRIPTION: 'Narasi sederhana yang menjelaskan fitur dari perspektif pengguna akhir. Menjadi dasar komunikasi antara stakeholder dan tim development.',
      FEATURES: [
        { title: 'Template yang Fleksibel', desc: 'Sesuaikan format agar sesuai dengan gaya agile tim Anda' },
        { title: 'Standar Industri Global', desc: 'Format yang digunakan oleh tim engineering top dunia' },
        { title: 'Kejelasan Komunikasi', desc: 'Mengurangi ambiguitas antara PM, Designer, dan Developer' }
      ]
    },
    GHERKIN: {
      TITLE: 'Format Gherkin',
      DESCRIPTION: 'Bahasa domain-specific yang menjembatani spesifikasi teknis dengan bahasa manusia. Memungkinkan otomatisasi testing (BDD) berjalan mulus.',
      FEATURES: [
        { title: 'Konversi AI Instan', desc: 'Ubah narasi menjadi logika Given-When-Then dalam detik' },
        { title: 'Integrasi Test Suite', desc: 'Langsung dapat digunakan pada Cucumber, SpecFlow, dll' },
        { title: 'Dokumentasi Hidup', desc: 'Spesifikasi yang selalu update dengan kode program' }
      ]
    }
  },

  CARA_KERJA: {
    TITLE: 'Cara Kerja',
    SUBTITLE: 'Tiga langkah sederhana untuk mengkonversi user story menjadi Gherkin backlog',
    STEPS: [
      {
        number: '01',
        title: 'Input User Story',
        description: 'Masukkan satu atau banyak user story sekaligus. Kami mendukung format teks bebas maupun template standar.',
        icon: 'edit'
      },
      {
        number: '02', 
        title: 'AI Processing',
        description: 'Engine AI kami menganalisis konteks, peran, dan tujuan untuk menghasilkan skenario Gherkin yang valid.',
        icon: 'filter'
      },
      {
        number: '03',
        title: 'Review & Export', 
        description: 'Dapatkan hasilnya secara instan. Salin ke clipboard atau export ke file Excel/CSV untuk dokumentasi tim.',
        icon: 'check'
      }
    ]
  },

  KEUNTUNGAN: {
    TITLE: 'Keuntungan SpecWeave',
    SUBTITLE: 'Tingkatkan produktivitas tim QA Anda dengan fitur-fitur unggulan kami yang dirancang untuk kecepatan dan akurasi.',
    BENEFITS: [
      {
        title: 'Hemat Waktu',
        description: 'Otomatisasi proses manual yang memakan waktu, hasilkan skenario dalam hitungan detik.',
        icon: 'clock',
        color: 'purple'
      },
      {
        title: 'Konsistensi Tinggi',
        description: 'Pastikan setiap backlog mengikuti format standar industri yang sama tanpa kesalahan manusia.',
        icon: 'check-circle',
        color: 'purple'
      },
      {
        title: 'Template Custom',
        description: 'Fleksibilitas penuh untuk menyesuaikan struktur output dengan kebutuhan unik tim Anda.',
        icon: 'layout',
        color: 'pink'
      },
      {
        title: 'Export Mudah',
        description: 'Unduh hasil konversi langsung ke format Excel atau CSV untuk dokumentasi instan.',
        icon: 'download',
        color: 'pink'
      }
    ]
  },

  FOOTER: {
    DESCRIPTION: 'Konversi user story menjadi format Gherkin (Given-When-Then) secara otomatis dengan AI.',
    QUICK_LINKS: [
      { text: 'Get Started', href: '#get-started' },
      { text: 'What is?', href: '#what-is' },
      { text: 'Cara Kerja', href: '#cara-kerja' },
      { text: 'Keuntungan', href: '#keuntungan' }
    ],
    COPYRIGHT: '© 2025 SpecWeave Inc. All rights reserved.',
    LEGAL_LINKS: [
      { text: 'Privacy Policy', href: '#' },
      { text: 'Terms of Service', href: '#' }
    ]
  }
};

// Form Constants
export const FORM_CONSTANTS = {
  FIELDS: {
    NAME: {
      LABEL: 'Nama Lengkap',
      PLACEHOLDER: 'Nama lengkap Anda',
      REQUIRED: true
    },
    EMAIL: {
      LABEL: 'Email',
      PLACEHOLDER: 'nama@perusahaan.com',
      REQUIRED: true
    },
    PASSWORD: {
      LABEL: 'Password',
      PLACEHOLDER: '••••••••',
      REQUIRED: true,
      HELP_TEXT: 'Minimal 8 karakter dengan huruf besar, kecil, dan angka'
    },
    CONFIRM_PASSWORD: {
      LABEL: 'Konfirmasi Password',
      PLACEHOLDER: '••••••••',
      REQUIRED: true
    }
  },

  MESSAGES: {
    SIGNUP: {
      TITLE: 'Buat Akun',
      SUBTITLE: 'Bergabung dengan SpecWeave sekarang',
      SUBMIT_TEXT: 'Buat Akun',
      SUBMITTING_TEXT: 'Membuat Akun...'
    },
    LOGIN: {
      TITLE: 'Mulai Sekarang',
      SUBTITLE: 'Gratis untuk semua pengguna. Tanpa ribet!!',
      SUBMIT_TEXT: 'Mulai',
      SUBMITTING_TEXT: 'Masuk...'
    },
    GOOGLE_AUTH: 'Continue with Google',
    DIVIDER: 'atau lanjutkan dengan',
    REMEMBER_ME: 'Remember me',
    FORGOT_PASSWORD: 'Lupa password?'
  },

  VALIDATION_MESSAGES: {
    NAME_REQUIRED: 'Name is required',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
    PASSWORDS_DONT_MATCH: 'Passwords do not match',
    INVALID_EMAIL: 'Please enter a valid email address',
    GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
    GOOGLE_AUTH_ERROR: 'Google sign in failed. Please try again.'
  }
};

// Animation and Visual Constants
export const VISUAL_CONSTANTS = {
  GRADIENTS: {
    HERO_TITLE: 'from-purple-400 via-pink-400 to-purple-300',
    CARD_PURPLE: 'from-purple-500/20 to-purple-900/5',
    CARD_PINK: 'from-pink-500/20 to-pink-900/5',
    BUTTON_PRIMARY: 'from-purple-600 to-pink-600',
    BACKGROUND_AMBIENT: [
      'from-purple-500/20 to-transparent',
      'from-pink-500/15 to-transparent',
      'from-purple-600/10 to-transparent'
    ]
  },

  ICONS: {
    EDIT: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    FILTER: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    CHECK: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    CLOCK: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    CHECK_CIRCLE: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    LAYOUT: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
    DOWNLOAD: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  }
};