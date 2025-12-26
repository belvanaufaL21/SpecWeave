import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * METEOR Evaluation Service
 * Integrates with Python METEOR evaluator script to assess quality of generated Gherkin scenarios
 */
class MeteorService {
  constructor() {
    // Force use 'python' command for Windows
    this.pythonPath = 'python';
    this.scriptPath = path.join(__dirname, '../../scripts/meteor_evaluator.py');
    this.qualityThreshold = 0.7;
    
    console.log("🐍 METEOR Service initialized with Python path:", this.pythonPath);
    console.log("📄 Script path:", this.scriptPath);
  }

  /**
   * Evaluate a generated scenario against a reference using METEOR
   * @param {string} candidate - Generated Gherkin scenario text
   * @param {string} reference - Reference scenario text for comparison
   * @returns {Promise<Object>} METEOR evaluation results
   */
  async evaluateScenario(candidate, reference) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      console.log("🚀 METEOR Service: Starting evaluation...");
      console.log("📝 Candidate:", candidate.substring(0, 100) + "...");
      console.log("📋 Reference:", reference.substring(0, 100) + "...");
      console.log("🐍 Python path:", this.pythonPath);
      console.log("📄 Script path:", this.scriptPath);
      
      try {
        // Prepare input data for Python script
        const inputData = JSON.stringify({
          candidate: candidate,
          reference: reference
        });

        // Spawn Python process
        const pythonProcess = spawn(this.pythonPath, [this.scriptPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        // Collect output
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        // Handle process completion
        pythonProcess.on('close', (code) => {
          const evaluationTime = Date.now() - startTime;
          
          if (code !== 0) {
            console.error('METEOR evaluation failed:', stderr);
            reject(new Error(`METEOR evaluation failed with code ${code}: ${stderr}`));
            return;
          }

          try {
            const result = JSON.parse(stdout);
            
            // Add evaluation metadata
            result.evaluation_time_ms = evaluationTime;
            result.timestamp = new Date().toISOString();
            
            console.log(`✅ METEOR evaluation completed in ${evaluationTime}ms, score: ${result.meteor_score}`);
            resolve(result);
          } catch (parseError) {
            console.error('Failed to parse METEOR result:', parseError);
            reject(new Error(`Failed to parse METEOR result: ${parseError.message}`));
          }
        });

        // Handle process errors
        pythonProcess.on('error', (error) => {
          console.error('Failed to start METEOR evaluation process:', error);
          reject(new Error(`Failed to start METEOR evaluation: ${error.message}`));
        });

        // Send input data to Python script
        pythonProcess.stdin.write(inputData);
        pythonProcess.stdin.end();

      } catch (error) {
        console.error('METEOR evaluation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Get quality assessment based on METEOR score with context-aware evaluation
   * @param {number} meteorScore - METEOR score (0-1)
   * @param {Object} additionalContext - Additional context for assessment
   * @returns {Object} Quality assessment with level and recommendations
   */
  getQualityAssessment(meteorScore, additionalContext = {}) {
    const assessments = {
      excellent: {
        level: 'excellent',
        description: 'Skenario Gherkin berkualitas sangat tinggi dengan struktur yang jelas, lengkap, dan mengikuti best practices BDD',
        action: 'no_action',
        recommendation: 'Skenario siap digunakan untuk development dan testing',
        details: 'Skenario memiliki Given-When-Then yang jelas, coverage yang baik, dan mudah dipahami oleh tim'
      },
      good: {
        level: 'good',
        description: 'Skenario Gherkin berkualitas baik dengan struktur yang solid dan coverage yang memadai',
        action: 'monitor',
        recommendation: 'Skenario dapat digunakan, pertimbangkan minor improvements',
        details: 'Skenario sudah baik namun mungkin bisa ditingkatkan dengan edge cases atau detail tambahan'
      },
      acceptable: {
        level: 'acceptable',
        description: 'Skenario Gherkin berkualitas cukup dengan struktur dasar yang benar namun bisa diperbaiki',
        action: 'review',
        recommendation: 'Review skenario untuk memastikan kelengkapan dan kejelasan',
        details: 'Skenario memenuhi requirement dasar namun mungkin kurang detail atau coverage'
      },
      poor: {
        level: 'poor',
        description: 'Skenario Gherkin berkualitas rendah dengan struktur yang kurang jelas atau tidak lengkap',
        action: 'regenerate',
        recommendation: 'Regenerasi skenario dengan prompt yang lebih spesifik',
        details: 'Skenario memiliki masalah dalam struktur, kejelasan, atau coverage yang perlu diperbaiki'
      },
      very_poor: {
        level: 'very_poor',
        description: 'Skenario Gherkin berkualitas sangat rendah dengan masalah struktural atau konten yang signifikan',
        action: 'manual_review',
        recommendation: 'Diperlukan review manual dan regenerasi dengan pendekatan berbeda',
        details: 'Skenario tidak memenuhi standar BDD atau memiliki masalah fundamental yang perlu diperbaiki'
      }
    };

    // Adjusted thresholds for Gherkin scenario evaluation
    // More realistic thresholds based on METEOR characteristics for structured text
    let assessment;
    if (meteorScore >= 0.65) assessment = assessments.excellent;
    else if (meteorScore >= 0.50) assessment = assessments.good;
    else if (meteorScore >= 0.35) assessment = assessments.acceptable;
    else if (meteorScore >= 0.20) assessment = assessments.poor;
    else assessment = assessments.very_poor;

    // Add score-specific insights
    assessment.score_insight = this.getScoreInsight(meteorScore);
    
    return assessment;
  }

  /**
   * Get specific insights based on METEOR score range
   * @param {number} meteorScore - METEOR score (0-1)
   * @returns {string} Specific insight about the score
   */
  getScoreInsight(meteorScore) {
    if (meteorScore >= 0.75) {
      return 'Skenario menunjukkan kemiripan tinggi dengan best practices Gherkin dan memiliki struktur yang optimal';
    } else if (meteorScore >= 0.60) {
      return 'Skenario memiliki kualitas baik dengan struktur Gherkin yang solid, minor improvements bisa meningkatkan kualitas';
    } else if (meteorScore >= 0.45) {
      return 'Skenario memenuhi standar dasar namun bisa diperbaiki dalam hal kejelasan atau kelengkapan';
    } else if (meteorScore >= 0.25) {
      return 'Skenario memiliki masalah dalam struktur atau konten yang mempengaruhi kualitas secara signifikan';
    } else {
      return 'Skenario memerlukan perbaikan fundamental dalam struktur Given-When-Then atau konten';
    }
  }

  /**
   * Check if METEOR score meets quality threshold
   * @param {number} meteorScore - METEOR score to check
   * @returns {boolean} True if score meets threshold
   */
  meetsQualityThreshold(meteorScore) {
    return meteorScore >= this.qualityThreshold;
  }

  /**
   * Generate reference text based on AI output analysis
   * Analyzes the generated Gherkin to determine scenario type and provides appropriate reference
   * @param {Object} parsedGherkin - Parsed Gherkin JSON from AI
   * @returns {string} Reference text for comparison
   */
  generateReferenceText(parsedGherkin) {
    try {
      // Analyze the generated content to determine scenario type
      const scenarioType = this.detectScenarioType(parsedGherkin);
      
      // High-quality reference templates based on best practices
      const referenceTemplates = {
        authentication: `
          Given pengguna berada di halaman login sistem
          When pengguna memasukkan email dan password yang valid
          Then sistem memverifikasi kredensial dan mengarahkan pengguna ke dashboard utama
          Given pengguna memasukkan kredensial yang salah
          When pengguna menekan tombol login
          Then sistem menampilkan pesan error dan tetap di halaman login
        `,
        user_management: `
          Given admin memiliki akses ke sistem manajemen pengguna
          When admin menambahkan pengguna baru dengan data yang lengkap
          Then sistem menyimpan data pengguna dan menampilkan konfirmasi berhasil
          Given admin mencoba menghapus pengguna yang sedang aktif
          When admin mengkonfirmasi penghapusan
          Then sistem mencegah penghapusan dan menampilkan peringatan
        `,
        crud_operations: `
          Given pengguna memiliki akses ke sistem
          When pengguna membuat data baru dengan informasi yang valid
          Then sistem menyimpan data dan menampilkan konfirmasi
          Given pengguna ingin mengubah data yang sudah ada
          When pengguna memperbarui informasi dan menyimpan perubahan
          Then sistem memperbarui data dan menampilkan status berhasil
        `,
        password_reset: `
          Given pengguna lupa password dan berada di halaman reset
          When pengguna memasukkan email yang terdaftar
          Then sistem mengirim link reset password ke email pengguna
          Given pengguna mengklik link reset yang valid
          When pengguna memasukkan password baru yang memenuhi kriteria
          Then sistem memperbarui password dan mengkonfirmasi perubahan
        `,
        shopping_cart: `
          Given pengguna melihat produk yang tersedia
          When pengguna menambahkan produk ke keranjang belanja
          Then sistem memperbarui keranjang dan menampilkan jumlah item
          Given pengguna memiliki item di keranjang
          When pengguna melanjutkan ke proses checkout
          Then sistem menampilkan ringkasan pesanan dan form pembayaran
        `,
        api_integration: `
          Given sistem API tersedia dan dapat diakses
          When klien mengirim request dengan format yang benar
          Then API memproses request dan mengembalikan response yang sesuai
          Given klien mengirim request dengan data yang tidak valid
          When API memvalidasi request
          Then API mengembalikan error message dengan kode status yang tepat
        `,
        default: `
          Given kondisi awal sistem telah disiapkan dengan benar
          When pengguna melakukan aksi sesuai dengan alur yang dirancang
          Then sistem merespons dengan hasil yang diharapkan dan memberikan feedback yang jelas
          Given terjadi kondisi error atau input yang tidak valid
          When sistem memproses kondisi tersebut
          Then sistem menangani error dengan graceful dan memberikan pesan yang informatif
        `
      };

      return referenceTemplates[scenarioType] || referenceTemplates.default;
    } catch (error) {
      console.error('Error generating reference text:', error);
      return referenceTemplates.default;
    }
  }

  /**
   * Detect scenario type from generated Gherkin content
   * @param {Object} parsedGherkin - Parsed Gherkin JSON
   * @returns {string} Detected scenario type
   */
  detectScenarioType(parsedGherkin) {
    try {
      const content = JSON.stringify(parsedGherkin).toLowerCase();
      
      // Authentication scenarios
      if (content.includes('login') || content.includes('password') || content.includes('kredensial') || 
          content.includes('masuk') || content.includes('authentication') || content.includes('signin')) {
        if (content.includes('reset') || content.includes('lupa')) {
          return 'password_reset';
        }
        return 'authentication';
      }
      
      // User management scenarios
      if (content.includes('admin') || content.includes('user') || content.includes('pengguna') || 
          content.includes('manajemen') || content.includes('management') || content.includes('kelola')) {
        return 'user_management';
      }
      
      // Shopping/E-commerce scenarios
      if (content.includes('cart') || content.includes('keranjang') || content.includes('checkout') || 
          content.includes('produk') || content.includes('product') || content.includes('belanja')) {
        return 'shopping_cart';
      }
      
      // API scenarios
      if (content.includes('api') || content.includes('endpoint') || content.includes('request') || 
          content.includes('response') || content.includes('integration')) {
        return 'api_integration';
      }
      
      // CRUD operations
      if (content.includes('create') || content.includes('update') || content.includes('delete') || 
          content.includes('tambah') || content.includes('ubah') || content.includes('hapus') || 
          content.includes('edit') || content.includes('simpan')) {
        return 'crud_operations';
      }
      
      return 'default';
    } catch (error) {
      console.error('Error detecting scenario type:', error);
      return 'default';
    }
  }

  /**
   * Extract scenario text from Gherkin JSON for evaluation
   * Focuses on the actual Gherkin scenarios (Given-When-Then) for quality assessment
   * @param {Object} scenarioJson - Gherkin scenario in JSON format
   * @returns {string} Concatenated scenario text optimized for METEOR evaluation
   */
  extractScenarioText(scenarioJson) {
    try {
      if (typeof scenarioJson === 'string') {
        // Try to parse if it's a JSON string
        try {
          scenarioJson = JSON.parse(scenarioJson);
        } catch {
          return scenarioJson;
        }
      }

      let extractedText = '';

      // Extract feature description for context
      if (scenarioJson.description) {
        extractedText += `${scenarioJson.description} `;
      }

      // Extract scenarios with proper Gherkin structure
      if (scenarioJson.scenarios && Array.isArray(scenarioJson.scenarios)) {
        const scenarioTexts = scenarioJson.scenarios.map((scenario, index) => {
          // Format each scenario with Gherkin keywords for better evaluation
          let scenarioText = '';
          
          if (scenario.given) {
            scenarioText += `Given ${scenario.given.replace(/^(Given|Ketika|Maka)\s*/i, '')} `;
          }
          
          if (scenario.when) {
            scenarioText += `When ${scenario.when.replace(/^(Given|When|Then|Ketika|Maka)\s*/i, '')} `;
          }
          
          if (scenario.then) {
            scenarioText += `Then ${scenario.then.replace(/^(Given|When|Then|Ketika|Maka)\s*/i, '')}`;
          }
          
          return scenarioText.trim();
        });
        
        extractedText += scenarioTexts.join(' ');
      }

      // Handle single scenario object
      else if (scenarioJson.given && scenarioJson.when && scenarioJson.then) {
        extractedText += `Given ${scenarioJson.given} When ${scenarioJson.when} Then ${scenarioJson.then}`;
      }

      // Fallback: extract any meaningful text from the JSON
      else {
        const jsonString = JSON.stringify(scenarioJson);
        // Extract text content, removing JSON syntax
        extractedText = jsonString
          .replace(/[{}"\[\],]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Clean up the extracted text
      extractedText = extractedText
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/^\s+|\s+$/g, '')  // Trim
        .toLowerCase();  // Normalize case for better METEOR comparison

      console.log(`📝 Extracted scenario text (${extractedText.length} chars): ${extractedText.substring(0, 100)}...`);
      
      return extractedText || 'No valid scenario content found';
    } catch (error) {
      console.error('Error extracting scenario text:', error);
      return 'Error extracting scenario content';
    }
  }

  /**
   * Evaluate multiple scenarios and return aggregated metrics
   * @param {Array} candidates - Array of candidate scenarios
   * @param {Array} references - Array of reference scenarios
   * @returns {Promise<Object>} Aggregated METEOR metrics
   */
  async evaluateMultipleScenarios(candidates, references) {
    try {
      const evaluations = [];
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const reference = references[i] || references[0]; // Use first reference if not enough
        
        const result = await this.evaluateScenario(candidate, reference);
        evaluations.push(result);
      }

      // Calculate aggregated metrics
      const avgMeteorScore = evaluations.reduce((sum, evaluation) => sum + evaluation.meteor_score, 0) / evaluations.length;
      const avgPrecision = evaluations.reduce((sum, evaluation) => sum + evaluation.precision, 0) / evaluations.length;
      const avgRecall = evaluations.reduce((sum, evaluation) => sum + evaluation.recall, 0) / evaluations.length;
      const totalEvaluationTime = evaluations.reduce((sum, evaluation) => sum + evaluation.evaluation_time_ms, 0);

      return {
        aggregated_metrics: {
          avg_meteor_score: Math.round(avgMeteorScore * 10000) / 10000,
          avg_precision: Math.round(avgPrecision * 10000) / 10000,
          avg_recall: Math.round(avgRecall * 10000) / 10000,
          total_evaluation_time_ms: totalEvaluationTime,
          scenario_count: evaluations.length
        },
        individual_evaluations: evaluations,
        quality_assessment: this.getQualityAssessment(avgMeteorScore),
        meets_threshold: this.meetsQualityThreshold(avgMeteorScore)
      };
    } catch (error) {
      console.error('Error in multiple scenario evaluation:', error);
      throw error;
    }
  }
}

export default MeteorService;