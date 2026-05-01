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
    TITLE: 'Ubah User Story Menjadi Skenario Testing dalam Hitungan Detik',
    SUBTITLE: 'Platform AI terdepan untuk mengotomatisasi pembuatan skenario Gherkin (Given-When-Then). Hemat 80% waktu QA tim Anda dengan dokumentasi yang terstandarisasi dan akurat.',
    VALUE_PROPS: [
      'Hemat 80% Waktu QA',
      '99% Akurasi AI', 
      'Gratis untuk Semua'
    ],
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