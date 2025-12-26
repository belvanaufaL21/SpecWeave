/**
 * Konstanta untuk METEOR Analysis Service
 */

export const METEOR_CONSTANTS = {
  // Threshold skor kualitas
  QUALITY_THRESHOLDS: {
    EXCELLENT: 0.8,
    GOOD: 0.6,
    FAIR: 0.4,
    POOR: 0.0
  },

  // Level kualitas
  QUALITY_LEVELS: {
    EXCELLENT: 'excellent',
    GOOD: 'good', 
    FAIR: 'fair',
    POOR: 'poor'
  },

  // Warna untuk UI
  QUALITY_COLORS: {
    EXCELLENT: 'green',
    GOOD: 'yellow',
    FAIR: 'orange', 
    POOR: 'red'
  },

  // Struktur Gherkin yang diperlukan
  GHERKIN_STRUCTURE: {
    FEATURE: 'Feature:',
    SCENARIO: 'Scenario:',
    GIVEN: 'Given',
    WHEN: 'When',
    THEN: 'Then'
  },

  // Pesan kualitas
  QUALITY_MESSAGES: {
    EXCELLENT: 'Skenario menunjukkan kemiripan tinggi dengan best practices dan memiliki struktur yang optimal.',
    GOOD: 'Skenario memiliki kualitas baik dengan struktur yang solid, namun masih ada ruang untuk perbaikan minor.',
    FAIR: 'Skenario memenuhi standar dasar namun perlu perbaikan dalam hal kejelasan atau kelengkapan.',
    POOR: 'Skenario memerlukan perbaikan fundamental dalam struktur atau konten.'
  },

  // Rekomendasi berdasarkan level
  RECOMMENDATIONS: {
    EXCELLENT: [
      'Pertahankan kualitas saat ini',
      'Gunakan sebagai referensi untuk skenario lain'
    ],
    GOOD: [
      'Periksa kelengkapan langkah-langkah',
      'Sesuaikan terminologi dengan standar perusahaan',
      'Pastikan konsistensi format'
    ],
    FAIR: [
      'Tambahkan langkah-langkah yang hilang',
      'Perjelas kondisi awal (Given)',
      'Spesifikasikan hasil yang diharapkan (Then)',
      'Periksa urutan logis langkah-langkah'
    ],
    POOR: [
      'Restructure menggunakan format Given-When-Then yang benar',
      'Tambahkan konteks yang hilang',
      'Perjelas aksi dan hasil yang diharapkan',
      'Konsultasikan dengan ground truth reference',
      'Pertimbangkan untuk memecah menjadi beberapa skenario'
    ]
  },

  // Interpretasi metrik
  METRIC_INTERPRETATIONS: {
    PRECISION: {
      HIGH: 'Sangat akurat',
      MEDIUM: 'Cukup akurat', 
      LOW: 'Perlu perbaikan akurasi'
    },
    RECALL: {
      HIGH: 'Sangat lengkap',
      MEDIUM: 'Cukup lengkap',
      LOW: 'Banyak informasi yang hilang'
    },
    F_SCORE: {
      HIGH: 'Keseimbangan sangat baik',
      MEDIUM: 'Keseimbangan cukup baik',
      LOW: 'Keseimbangan perlu diperbaiki'
    }
  },

  // Threshold untuk interpretasi metrik
  METRIC_THRESHOLDS: {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.0
  }
};