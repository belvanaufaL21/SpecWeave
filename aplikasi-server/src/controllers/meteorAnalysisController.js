import MeteorService from '../services/meteorService.js';

const meteorService = new MeteorService();

class MeteorAnalysisController {
  
  // Generate detailed analysis report
  async generateDetailedAnalysis(req, res) {
    try {
      const { groundTruthText, generatedText, meteorMetrics } = req.body;

      if (!groundTruthText || !generatedText || !meteorMetrics) {
        return res.status(400).json({
          success: false,
          message: 'Ground truth text, generated text, and METEOR metrics are required'
        });
      }

      // Generate comprehensive analysis using the context format
      const analysisPrompt = this.buildAnalysisPrompt(groundTruthText, generatedText, meteorMetrics);
      
      // For now, return structured analysis. In production, this would call an LLM
      const analysis = this.generateStructuredAnalysis(groundTruthText, generatedText, meteorMetrics);

      res.json({
        success: true,
        data: {
          analysis,
          prompt: analysisPrompt, // For debugging/development
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error generating detailed analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate detailed analysis'
      });
    }
  }

  // Generate improvement suggestions
  async generateSuggestions(req, res) {
    try {
      const { groundTruthText, generatedText, meteorMetrics } = req.body;

      const suggestions = this.generateImprovementSuggestions(groundTruthText, generatedText, meteorMetrics);

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate suggestions'
      });
    }
  }

  // Generate improved scenario
  async generateImprovedScenario(req, res) {
    try {
      const { groundTruthText, generatedText, meteorMetrics } = req.body;

      const improvedScenario = this.generateImprovedGherkin(groundTruthText, generatedText, meteorMetrics);

      res.json({
        success: true,
        data: {
          improvedScenario,
          originalScore: meteorMetrics.meteorScore,
          improvements: this.identifyImprovements(groundTruthText, generatedText)
        }
      });
    } catch (error) {
      console.error('Error generating improved scenario:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate improved scenario'
      });
    }
  }

  // Build analysis prompt following the specified format
  buildAnalysisPrompt(groundTruth, generated, metrics) {
    return `Konteks: Kamu adalah asisten teknis di dalam sebuah aplikasi internal yang digunakan tim pengembang untuk mengevaluasi kualitas skenario Gherkin yang dihasilkan oleh sistem berbasis Large Language Model (LLM).

GROUND_TRUTH:
${groundTruth}

GENERATED:
${generated}

PRECISION: ${metrics.precision || 0}
RECALL: ${metrics.recall || 0}
FSCORE: ${metrics.fScore || 0}
METEOR: ${metrics.meteorScore || 0}

Berikan analisis lengkap sesuai format yang telah ditentukan dalam bahasa Indonesia.`;
  }

  // Generate structured analysis
  generateStructuredAnalysis(groundTruth, generated, metrics) {
    const meteorScore = metrics.meteorScore || 0;
    
    // 1. Ringkasan singkat
    const summary = this.generateSummary(meteorScore);
    
    // 2. Penjelasan metrik
    const metricsExplanation = this.explainMetrics(metrics);
    
    // 3. Analisis perbedaan
    const differences = this.analyzeDifferences(groundTruth, generated);
    
    // 4. Rekomendasi perbaikan
    const recommendations = this.generateRecommendations(groundTruth, generated, meteorScore);
    
    // 5. Skenario hasil revisi
    const revisedScenario = this.generateRevisedScenario(groundTruth, generated);

    return {
      summary,
      metricsExplanation,
      differences,
      recommendations,
      revisedScenario,
      overallAssessment: this.getOverallAssessment(meteorScore)
    };
  }

  generateSummary(meteorScore) {
    if (meteorScore >= 0.8) {
      return `Skenario yang dihasilkan menunjukkan kualitas sangat baik dengan skor METEOR ${(meteorScore * 100).toFixed(1)}%, menandakan kemiripan tinggi dengan standar referensi perusahaan.`;
    } else if (meteorScore >= 0.6) {
      return `Skenario memiliki kualitas cukup baik dengan skor METEOR ${(meteorScore * 100).toFixed(1)}%, namun masih terdapat beberapa perbedaan penting yang perlu diperbaiki.`;
    } else {
      return `Skenario menunjukkan kemiripan rendah dengan skor METEOR ${(meteorScore * 100).toFixed(1)}%, memerlukan perbaikan signifikan untuk memenuhi standar kualitas.`;
    }
  }

  explainMetrics(metrics) {
    return {
      precision: {
        value: (metrics.precision || 0) * 100,
        explanation: `Precision ${((metrics.precision || 0) * 100).toFixed(1)}% menunjukkan ${
          (metrics.precision || 0) >= 0.8 ? 'akurasi sangat tinggi' :
          (metrics.precision || 0) >= 0.6 ? 'akurasi cukup baik' : 'akurasi rendah'
        } dalam menghasilkan langkah-langkah yang relevan.`
      },
      recall: {
        value: (metrics.recall || 0) * 100,
        explanation: `Recall ${((metrics.recall || 0) * 100).toFixed(1)}% menunjukkan ${
          (metrics.recall || 0) >= 0.8 ? 'kelengkapan sangat baik' :
          (metrics.recall || 0) >= 0.6 ? 'kelengkapan cukup baik' : 'banyak informasi penting yang hilang'
        } dalam mencakup semua aspek dari referensi.`
      },
      fScore: {
        value: (metrics.fScore || 0) * 100,
        explanation: `F-Score ${((metrics.fScore || 0) * 100).toFixed(1)}% menunjukkan ${
          (metrics.fScore || 0) >= 0.8 ? 'keseimbangan sangat baik' :
          (metrics.fScore || 0) >= 0.6 ? 'keseimbangan cukup baik' : 'ketidakseimbangan'
        } antara akurasi dan kelengkapan.`
      },
      meteor: {
        value: (metrics.meteorScore || 0) * 100,
        explanation: `METEOR ${((metrics.meteorScore || 0) * 100).toFixed(1)}% mengukur kemiripan semantik keseluruhan, ${
          (metrics.meteorScore || 0) >= 0.8 ? 'menunjukkan kualitas sangat baik untuk standar pengujian' :
          (metrics.meteorScore || 0) >= 0.6 ? 'menunjukkan kualitas memadai namun masih bisa ditingkatkan' :
          'menunjukkan kualitas di bawah standar yang diharapkan'
        }.`
      }
    };
  }

  analyzeDifferences(groundTruth, generated) {
    const gtLines = groundTruth.split('\n').filter(line => line.trim());
    const genLines = generated.split('\n').filter(line => line.trim());

    const differences = {
      structural: [],
      content: [],
      missing: [],
      extra: []
    };

    // Check structural elements
    if (!generated.includes('Feature:')) differences.structural.push('Tidak ada deklarasi Feature');
    if (!generated.includes('Scenario:')) differences.structural.push('Tidak ada deklarasi Scenario');
    if (!generated.includes('Given')) differences.structural.push('Tidak ada langkah Given');
    if (!generated.includes('When')) differences.structural.push('Tidak ada langkah When');
    if (!generated.includes('Then')) differences.structural.push('Tidak ada langkah Then');

    // Basic content analysis
    const gtKeywords = this.extractKeywords(groundTruth);
    const genKeywords = this.extractKeywords(generated);

    const missingKeywords = gtKeywords.filter(kw => !genKeywords.includes(kw));
    const extraKeywords = genKeywords.filter(kw => !gtKeywords.includes(kw));

    if (missingKeywords.length > 0) {
      differences.missing.push(`Kata kunci penting yang hilang: ${missingKeywords.join(', ')}`);
    }

    if (extraKeywords.length > 0) {
      differences.extra.push(`Kata kunci tambahan: ${extraKeywords.join(', ')}`);
    }

    return differences;
  }

  generateRecommendations(groundTruth, generated, meteorScore) {
    const recommendations = [];

    if (meteorScore < 0.4) {
      recommendations.push('Restructure skenario menggunakan format Given-When-Then yang jelas');
      recommendations.push('Pastikan semua langkah penting dari referensi tercakup');
    }

    if (meteorScore < 0.6) {
      recommendations.push('Sesuaikan terminologi dengan standar yang digunakan dalam referensi');
      recommendations.push('Perjelas kondisi awal (Given) dan hasil yang diharapkan (Then)');
    }

    if (meteorScore < 0.8) {
      recommendations.push('Periksa konsistensi format dan gaya penulisan');
      recommendations.push('Pastikan urutan langkah-langkah logis dan mudah diikuti');
    }

    recommendations.push('Validasi skenario dengan tim untuk memastikan relevansi bisnis');

    return recommendations;
  }

  generateRevisedScenario(groundTruth, generated) {
    // This is a simplified version. In production, this would use more sophisticated NLP
    const gtLines = groundTruth.split('\n').filter(line => line.trim());
    const feature = gtLines.find(line => line.includes('Feature:')) || 'Feature: Revised Scenario';
    
    return `${feature}

Scenario: Skenario yang telah diperbaiki
  Given kondisi awal yang jelas dan spesifik
  When aksi utama dilakukan sesuai dengan alur bisnis
  Then hasil yang diharapkan tercapai dengan kriteria yang terukur
  And sistem memberikan feedback yang sesuai`;
  }

  extractKeywords(text) {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return [...new Set(words)];
  }

  getOverallAssessment(meteorScore) {
    if (meteorScore >= 0.8) {
      return {
        level: 'Sangat Baik',
        color: 'green',
        message: 'Skenario memenuhi standar kualitas tinggi dan siap untuk digunakan.'
      };
    } else if (meteorScore >= 0.6) {
      return {
        level: 'Cukup Baik',
        color: 'yellow',
        message: 'Skenario memiliki kualitas memadai namun masih bisa ditingkatkan.'
      };
    } else {
      return {
        level: 'Perlu Perbaikan',
        color: 'red',
        message: 'Skenario memerlukan perbaikan signifikan sebelum dapat digunakan.'
      };
    }
  }

  generateImprovementSuggestions(groundTruth, generated, metrics) {
    const suggestions = [];
    
    if (metrics.precision < 0.6) {
      suggestions.push({
        type: 'precision',
        title: 'Tingkatkan Akurasi',
        description: 'Fokus pada langkah-langkah yang benar-benar relevan dengan skenario',
        priority: 'high'
      });
    }

    if (metrics.recall < 0.6) {
      suggestions.push({
        type: 'recall',
        title: 'Lengkapi Informasi',
        description: 'Tambahkan langkah-langkah penting yang hilang dari referensi',
        priority: 'high'
      });
    }

    return suggestions;
  }

  generateImprovedGherkin(groundTruth, generated, metrics) {
    // Simplified improvement logic
    return `Feature: Improved Scenario
  As a user
  I want to perform an action
  So that I can achieve a goal

Scenario: Improved scenario based on analysis
  Given the system is in a known state
  When I perform the required action
  Then the expected outcome is achieved
  And the system provides appropriate feedback`;
  }

  identifyImprovements(groundTruth, generated) {
    return [
      'Struktur Given-When-Then diperjelas',
      'Terminologi disesuaikan dengan referensi',
      'Langkah-langkah yang hilang ditambahkan',
      'Konsistensi format diperbaiki'
    ];
  }
}

export default new MeteorAnalysisController();