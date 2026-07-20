import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import supabaseService from './supabaseService.js';

// ============================================================================
// Setup: __dirname, Python command, library paths
// ============================================================================

let __dirname;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  // Fallback for CommonJS / Jest environments
  __dirname = path.resolve(process.cwd(), 'src/services');
}

// Pilih command Python: env var > python3 (Linux/Mac) > python (Windows)
const PYTHON_COMMAND =
  process.env.PYTHON_PATH ||
  (process.platform === 'win32' ? 'python' : 'python3');

// Timeout default untuk Python script (ms). Sentence-BERT bisa lama saat
// model belum di-cache (~30-60s download), METEOR jauh lebih cepat.
const PYTHON_TIMEOUT_MS = parseInt(process.env.PYTHON_TIMEOUT_MS || '180000', 10);

/**
 * Cari path nix store untuk lib native (libstdc++, libz, dll).
 * Critical untuk Railway/Nixpacks supaya numpy/torch bisa load.
 */
function getNixLibPath() {
  try {
    const result = execSync(
      `find /nix/store -maxdepth 4 \\( -name 'libstdc++.so.6' -o -name 'libz.so.1' -o -name 'libgcc_s.so.1' -o -name 'libm.so.6' \\) -exec dirname {} \\; 2>/dev/null | sort -u | paste -sd ':' -`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();
    if (result) {
      console.log('🔧 [NIX-LIB-PATH] Found:', result.substring(0, 200) + '...');
    }
    return result;
  } catch (e) {
    console.warn('⚠️ [NIX-LIB-PATH] Not on nixpacks?', e.message);
    return '';
  }
}

const NIX_LIB_PATH = getNixLibPath();

function getPythonEnv() {
  const env = { ...process.env };
  if (NIX_LIB_PATH) {
    env.LD_LIBRARY_PATH = NIX_LIB_PATH + ':' + (process.env.LD_LIBRARY_PATH || '');
  }
  // Pastikan Python output UTF-8 (penting untuk teks Indonesia)
  env.PYTHONIOENCODING = 'utf-8';
  return env;
}

// ============================================================================
// Python script runner (single helper, dipakai semua method)
// ============================================================================

/**
 * Robust JSON extraction dari stdout Python.
 * Coba parse keseluruhan dulu; kalau gagal, parse line terakhir yang valid.
 */
function extractJSON(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error('Empty stdout');

  try {
    return JSON.parse(trimmed);
  } catch {
    // Cari JSON di line terakhir (kasus: Python print warning sebelum JSON)
    const lines = trimmed.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          return JSON.parse(line);
        } catch { /* coba line sebelumnya */ }
      }
    }
    // Show both first & last chunks: kadang JSON valid ada di awal stdout
    // tapi diikuti warning/log; kadang sebaliknya. Both views membantu debug.
    throw new Error(
      `No valid JSON in stdout.\n` +
      `First 200 chars: ${trimmed.substring(0, 200)}\n` +
      `Last 200 chars: ${trimmed.slice(-200)}`
    );
  }
}

/**
 * @callback ProgressCallback
 * @param {string} stage - Stage name (mis. 'precision', 'attention', atau dengan prefix 'meteor:precision')
 * @param {number} progress - Persentase progress (0-100)
 * @param {{message?: string}} details - Detail tambahan (saat ini hanya pesan)
 */

/**
 * FUNGSI KUNCI: Spawn Python script dan handle komunikasi dengan Node.js
 * 
 * Fungsi ini adalah "jembatan" antara Node.js backend dan Python script.
 * 
 * @param {string} scriptName - Nama file Python (mis. 'meteor_calculator.py')
 * @param {string[]} args - Argumen yang dikirim ke Python (generated_text, reference_text)
 * @param {object} [opts] - Opsi tambahan (timeout, progress callback, label)
 * @returns {Promise<object>} Hasil parsed JSON dari Python
 * 
 * Cara kerja:
 * 1. Spawn Python process dengan child_process.spawn()
 * 2. Kirim argumen melalui command line
 * 3. Tangkap stdout (hasil JSON) dan stderr (progress/log)
 * 4. Parse JSON result dan return ke caller
 */
function runPythonScript(scriptName, args, opts = {}) {
  const { onProgress, timeoutMs = PYTHON_TIMEOUT_MS, label = scriptName } = opts;

  return new Promise((resolve, reject) => {
    // Path ke Python script di folder ../python
    const scriptPath = path.join(__dirname, '../python', scriptName);

    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`[${label}] Script not found: ${scriptPath}`));
      return;
    }

    let pythonProcess;
    try {
      // SPAWN PYTHON PROCESS - ini yang menjalankan script Python
      // Command: python meteor_calculator.py "generated_text" "reference_text"
      pythonProcess = spawn(PYTHON_COMMAND, [scriptPath, ...args], {
        env: getPythonEnv(),  // Set environment variables (UTF-8, library paths)
      });
    } catch (err) {
      reject(new Error(`[${label}] Failed to spawn Python (${PYTHON_COMMAND}): ${err.message}`));
      return;
    }

    let stdout = '';  // Untuk menampung output JSON dari Python
    let stderr = '';  // Untuk menampung progress/log dari Python
    let timedOut = false;
    let settled = false;

    const safeReject = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const safeResolve = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      try { pythonProcess.kill('SIGKILL'); } catch { /* ignore */ }
      safeReject(new Error(`[${label}] Timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // TANGKAP STDOUT - ini tempat Python kirim hasil JSON
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString('utf-8');
    });

    // TANGKAP STDERR - ini tempat Python kirim progress update
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString('utf-8');
      stderr += output;

      // Parse PROGRESS:{...} lines untuk real-time progress
      if (onProgress) {
        for (const line of output.split('\n')) {
          if (line.startsWith('PROGRESS:')) {
            try {
              const progress = JSON.parse(line.substring(9));
              if (progress.type === 'progress') {
                // Forward progress ke frontend (untuk progress bar)
                onProgress(progress.stage, progress.progress, { message: progress.message });
              }
            } catch { /* ignore parse errors */ }
          } else if (line.trim()) {
            console.error(`🐍 [${label}] stderr:`, line);
          }
        }
      }
    });

    // HANDLE PROCESS CLOSE - Python script selesai
    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) return;

      if (code !== 0) {
        safeReject(new Error(
          `[${label}] Python exited with code ${code}. ` +
          `stderr (last 500 chars): ${stderr.slice(-500)}`
        ));
        return;
      }

      try {
        // PARSE JSON dari stdout Python
        const result = extractJSON(stdout);
        if (result.success === false || result.error) {
          safeReject(new Error(`[${label}] ${result.error || 'Unknown error'}`));
          return;
        }
        console.log(`✅ [${label}] Score: ${result.score}`);
        safeResolve(result);  // Return hasil ke caller
      } catch (err) {
        safeReject(new Error(`[${label}] Parse failed: ${err.message}`));
      }
    });

    pythonProcess.on('error', (err) => {
      clearTimeout(timeout);
      safeReject(new Error(
        `[${label}] Failed to start Python (${PYTHON_COMMAND}): ${err.message}. ` +
        `Pastikan Python terpasang dan accessible.`
      ));
    });
  });
}

// ============================================================================
// TestingService - Wrapper functions untuk memanggil Python scripts
// ============================================================================

class TestingService {

  // ============ METEOR WRAPPERS ============
  
  /**
   * WRAPPER METEOR: Panggil meteor_calculator.py
   * Digunakan untuk testing manual (user klik button test)
   */
  static async calculateMeteorScore(generatedText, referenceText) {
    return runPythonScript('meteor_calculator.py', [generatedText, referenceText], {
      label: 'METEOR',
    });
  }

  /**
   * WRAPPER METEOR + PROGRESS: Panggil meteor_calculator.py dengan progress callback
   * Digunakan untuk SSE/WebSocket real-time updates
   */
  static async calculateMeteorScoreWithProgress(generatedText, referenceText, onProgress) {
    return runPythonScript('meteor_calculator.py', [generatedText, referenceText], {
      label: 'METEOR',
      onProgress,  // Callback untuk kirim progress ke frontend
    });
  }

  // ============ SENTENCE-BERT WRAPPERS ============

  /**
   * WRAPPER SENTENCE-BERT: Panggil sentence_bert_calculator.py
   * Digunakan untuk testing manual (user klik button test)
   */
  static async calculateSentenceBertScore(generatedText, referenceText) {
    return runPythonScript('sentence_bert_calculator.py', [generatedText, referenceText], {
      label: 'SBERT',
    });
  }

  /**
   * WRAPPER SENTENCE-BERT + PROGRESS: Panggil sentence_bert_calculator.py dengan progress callback
   * Digunakan untuk SSE/WebSocket real-time updates
   */
  static async calculateSentenceBertScoreWithProgress(generatedText, referenceText, onProgress) {
    return runPythonScript('sentence_bert_calculator.py', [generatedText, referenceText], {
      label: 'SBERT',
      onProgress,  // Callback untuk kirim progress ke frontend
    });
  }

  // -------- Save results to DB --------

  /**
   * Simpan hasil METEOR ke meteor_test_results.
   * Catatan: meteorResult.score sekarang dari NLTK full-text (Banerjee & Lavie 2005),
   * bukan rata-rata section. Per-section computation sudah dihapus untuk efisiensi.
   */
  static async saveMeteorResult(userId, scenarioId, generatedText, referenceText, meteorResult) {
    try {
      const detailedMetrics = meteorResult.detailed_metrics || {};

      // Pakai ?? bukan || supaya nilai 0 (legitimate) tidak di-coerce ke null
      const meteorData = {
        user_id: userId,
        scenario_id: scenarioId,
        meteor_score: meteorResult.score ?? 0,
        
        // Overall metrics (dari full-text evaluation)
        precision: detailedMetrics.precision ?? null,
        recall: detailedMetrics.recall ?? null,
        f_mean: detailedMetrics.f_mean ?? null,
        penalty: detailedMetrics.penalty ?? null,
        chunks: detailedMetrics.chunks ?? null,
        matches: detailedMetrics.matches ?? null,
        generated_tokens: detailedMetrics.generated_tokens ?? null,
        reference_tokens: detailedMetrics.reference_tokens ?? null,

        generated_text: generatedText,
        reference_text: referenceText,
        translation_info: meteorResult.translation_info || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseService.getClient()
        .from('meteor_test_results')
        .insert(meteorData)
        .select()
        .single();

      if (error) throw new Error(`Failed to save METEOR result: ${error.message}`);

      console.log('💾 Saved METEOR result:', data.id);
      return data;
    } catch (error) {
      throw new Error(`Failed to save METEOR result: ${error.message}`);
    }
  }

  /**
   * Simpan hasil Sentence-BERT ke sentence_bert_test_results.
   * Catatan: similarity_score sekarang dari cosine similarity teks utuh
   * (Reimers & Gurevych 2019), bukan rata-rata section.
   * Per-section computation sudah dihapus untuk efisiensi.
   */
  static async saveSentenceBertResult(userId, scenarioId, generatedText, referenceText, sentenceBertResult) {
    try {
      const details = sentenceBertResult.details || {};

      const sbertData = {
        user_id: userId,
        scenario_id: scenarioId,
        similarity_score: sentenceBertResult.score ?? 0,

        generated_text: generatedText,
        reference_text: referenceText,

        details: {
          embedding_dimension: details.embedding_dimension,
          model: details.model,
          method: details.method,
          overall_embeddings: details.overall_embeddings || null,
          dot_product: details.dot_product,
          magnitude_a: details.magnitude_a,
          magnitude_b: details.magnitude_b,
        },

        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseService.getClient()
        .from('sentence_bert_test_results')
        .insert(sbertData)
        .select()
        .single();

      if (error) throw new Error(`Failed to save Sentence-BERT result: ${error.message}`);

      console.log('💾 Saved Sentence-BERT result:', data.id);
      return data;
    } catch (error) {
      throw new Error(`Failed to save Sentence-BERT result: ${error.message}`);
    }
  }

  /**
   * Legacy: simpan ke table 'test_results' lama. Kept for backward compat.
   * Untuk kode baru, pakai saveMeteorResult / saveSentenceBertResult.
   */
  static async saveTestResult(testData) {
    try {
      const dataToSave = {
        user_id: testData.userId,
        scenario_id: testData.scenarioId,
        test_type: testData.testType,
        score: testData.score,
        generated_text: testData.generatedText,
        reference_text: testData.referenceText,
        test_details: testData.testDetails || {},
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseService.getClient()
        .from('test_results')
        .upsert([dataToSave], {
          onConflict: 'user_id,scenario_id,test_type',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) throw new Error(`Database error: ${error.message}`);
      return data;
    } catch (error) {
      throw new Error(`Failed to save test result: ${error.message}`);
    }
  }

  // -------- Dual evaluation --------

  /**
   * Run METEOR + Sentence-BERT secara paralel, simpan ke tabel terpisah.
   */
  static async runDualEvaluation(generatedText, referenceText, scenarioId, userId) {
    try {
      const [meteorResult, sentenceBertResult] = await Promise.all([
        this.calculateMeteorScore(generatedText, referenceText),
        this.calculateSentenceBertScore(generatedText, referenceText),
      ]);

      const timestamp = new Date().toISOString();

      await Promise.all([
        this.saveMeteorResult(userId, scenarioId, generatedText, referenceText, meteorResult),
        this.saveSentenceBertResult(userId, scenarioId, generatedText, referenceText, sentenceBertResult),
      ]);

      console.log('✅ Saved DUAL test results to separate tables');

      return {
        success: true,
        timestamp,
        meteor: {
          success: meteorResult.success,
          score: meteorResult.score,
          details: meteorResult.detailed_metrics || meteorResult.details,
          translation_info: meteorResult.translation_info,
        },
        sentence_bert: {
          success: sentenceBertResult.success,
          score: sentenceBertResult.score,
          details: sentenceBertResult.details,
        },
        generatedText,
        referenceText,
      };
    } catch (error) {
      throw new Error(`Dual evaluation failed: ${error.message}`);
    }
  }

  /**
   * Variant dengan progress callback untuk SSE/websocket.
   * Progress METEOR & SBERT di-merge dengan prefix supaya frontend bisa bedakan.
   */
  static async runDualEvaluationWithProgress(generatedText, referenceText, scenarioId, userId, onProgress) {
    try {
      const wrapProgress = (prefix) => (stage, progress, details) => {
        if (onProgress) onProgress(`${prefix}:${stage}`, progress, details);
      };

      const [meteorResult, sentenceBertResult] = await Promise.all([
        this.calculateMeteorScoreWithProgress(generatedText, referenceText, wrapProgress('meteor')),
        this.calculateSentenceBertScoreWithProgress(generatedText, referenceText, wrapProgress('sbert')),
      ]);

      const timestamp = new Date().toISOString();

      await Promise.all([
        this.saveMeteorResult(userId, scenarioId, generatedText, referenceText, meteorResult),
        this.saveSentenceBertResult(userId, scenarioId, generatedText, referenceText, sentenceBertResult),
      ]);

      return {
        success: true,
        timestamp,
        meteor: {
          success: meteorResult.success,
          score: meteorResult.score,
          details: meteorResult.detailed_metrics || meteorResult.details,
          translation_info: meteorResult.translation_info,
        },
        sentence_bert: {
          success: sentenceBertResult.success,
          score: sentenceBertResult.score,
          details: sentenceBertResult.details,
        },
        generatedText,
        referenceText,
      };
    } catch (error) {
      throw new Error(`Dual evaluation failed: ${error.message}`);
    }
  }

  // -------- Read results --------

  /**
   * Get test results untuk satu scenario, gabung dari tabel baru + tabel lama.
   *
   * Catatan tentang overall metrics (precision/recall/f_mean):
   * Setelah refactor, METEOR score utama = NLTK pada teks utuh (Banerjee & Lavie 2005).
   * Tapi DB schema hanya simpan per-section, jadi overall di-rekonstruksi sebagai
   * RATA-RATA section. Ini bisa sedikit beda dari formula score = f_mean × (1 − penalty)
   * pada teks utuh. Anggap nilai overall ini sebagai aproksimasi untuk display saja.
   */
  static async getTestResultsByScenario(scenarioId, userId) {
    try {
      const [meteorResults, sbertResults] = await Promise.all([
        supabaseService.getClient()
          .from('meteor_test_results')
          .select('*')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabaseService.getClient()
          .from('sentence_bert_test_results')
          .select('*')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      const { data: oldResults, error: oldError } = await supabaseService.getClient()
        .from('test_results')
        .select('*')
        .eq('scenario_id', scenarioId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (meteorResults.error) console.warn('⚠️ meteor_test_results:', meteorResults.error.message);
      if (sbertResults.error) console.warn('⚠️ sentence_bert_test_results:', sbertResults.error.message);
      if (oldError) console.warn('⚠️ test_results (legacy):', oldError.message);

      const transformedMeteor = (meteorResults.data || []).map(this._transformMeteorRow);
      const transformedSbert = (sbertResults.data || []).map(this._transformSbertRow);

      const oldMeteor = (oldResults || []).filter(r => r.test_type === 'meteor').map(this._transformLegacyRow);
      const oldSbert = (oldResults || []).filter(r => r.test_type === 'sentence_bert').map(this._transformLegacyRow);
      const oldDual = (oldResults || []).filter(r => r.test_type === 'dual').map(this._transformLegacyRow);

      const allMeteor = [...transformedMeteor, ...oldMeteor]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const allSbert = [...transformedSbert, ...oldSbert]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Dual: gabungkan METEOR & SBERT yang waktu-nya berdekatan (≤5 detik)
      const dualResults = [...oldDual];
      allMeteor.forEach(meteorResult => {
        const matchingSbert = allSbert.find(sbertResult =>
          Math.abs(new Date(sbertResult.created_at) - new Date(meteorResult.created_at)) < 5000
        );
        if (matchingSbert) {
          dualResults.push({
            id: meteorResult.id,
            user_id: meteorResult.user_id,
            scenario_id: meteorResult.scenario_id,
            test_type: 'dual',
            score: meteorResult.score,
            test_details: {
              meteor: { score: meteorResult.score, ...meteorResult.test_details },
              sentence_bert: { score: matchingSbert.score, ...matchingSbert.test_details },
            },
            generated_text: meteorResult.generated_text,
            reference_text: meteorResult.reference_text,
            created_at: meteorResult.created_at,
          });
        }
      });
      dualResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return { meteor: allMeteor, sentence_bert: allSbert, dual: dualResults };
    } catch (error) {
      throw new Error(`Failed to get test results: ${error.message}`);
    }
  }

  /**
   * Helper: transform row dari meteor_test_results jadi format yang dipakai frontend.
   * Menggunakan overall metrics dari database (full-text evaluation).
   */
  static _transformMeteorRow(result) {
    // Overall metrics dari full-text evaluation
    let overallMetrics = {
      precision: result.precision ?? 0,
      recall: result.recall ?? 0,
      f_mean: result.f_mean ?? 0,
      penalty: result.penalty ?? 0,
      chunks: result.chunks ?? 0,
      matches: result.matches ?? 0,
      generated_tokens: result.generated_tokens ?? 0,
      reference_tokens: result.reference_tokens ?? 0,
    };

    // FALLBACK: Jika generated_tokens atau reference_tokens = 0 (data lama),
    // hitung dari teks dengan tokenisasi sederhana
    if (overallMetrics.generated_tokens === 0 && result.generated_text) {
      // Tokenisasi sederhana: split by whitespace, filter empty
      const tokens = result.generated_text.toLowerCase()
        .split(/\s+/)
        .filter(t => t.trim().length > 0 && /[a-z0-9]/i.test(t));
      overallMetrics.generated_tokens = tokens.length;
    }

    if (overallMetrics.reference_tokens === 0 && result.reference_text) {
      const tokens = result.reference_text.toLowerCase()
        .split(/\s+/)
        .filter(t => t.trim().length > 0 && /[a-z0-9]/i.test(t));
      overallMetrics.reference_tokens = tokens.length;
    }

    return {
      id: result.id,
      user_id: result.user_id,
      scenario_id: result.scenario_id,
      test_type: 'meteor',
      score: result.meteor_score,
      test_details: {
        ...overallMetrics,
        translation_info: result.translation_info,
      },
      generated_text: result.generated_text,
      reference_text: result.reference_text,
      created_at: result.created_at,
    };
  }

  static _transformSbertRow(result) {
    return {
      id: result.id,
      user_id: result.user_id,
      scenario_id: result.scenario_id,
      test_type: 'sentence_bert',
      score: result.similarity_score,
      test_details: {
        cosine_similarity: result.similarity_score,
        ...(result.details || {}),
      },
      generated_text: result.generated_text,
      reference_text: result.reference_text,
      created_at: result.created_at,
    };
  }

  static _transformLegacyRow(result) {
    return {
      id: result.id,
      user_id: result.user_id,
      scenario_id: result.scenario_id,
      test_type: result.test_type,
      score: result.score,
      test_details: result.test_details || {},
      generated_text: result.generated_text,
      reference_text: result.reference_text,
      created_at: result.created_at,
    };
  }

  /**
   * NOTE: query gabungan dari tabel baru + lama.
   * Sebelumnya hanya query 'test_results' (lama) → result baru tidak muncul.
   */
  static async getTestResultsByUser(userId, options = {}) {
    try {
      const queries = [];

      // Tabel baru — kalau filter testType, skip yang tidak relevan
      if (!options.testType || options.testType === 'meteor') {
        queries.push(
          supabaseService.getClient()
            .from('meteor_test_results')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        );
      }
      if (!options.testType || options.testType === 'sentence_bert') {
        queries.push(
          supabaseService.getClient()
            .from('sentence_bert_test_results')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        );
      }

      // Tabel lama (legacy)
      let oldQuery = supabaseService.getClient()
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (options.testType) oldQuery = oldQuery.eq('test_type', options.testType);
      queries.push(oldQuery);

      const responses = await Promise.all(queries);
      const all = [];

      // Transform berdasarkan source table
      let idx = 0;
      if (!options.testType || options.testType === 'meteor') {
        all.push(...(responses[idx]?.data || []).map(TestingService._transformMeteorRow));
        idx++;
      }
      if (!options.testType || options.testType === 'sentence_bert') {
        all.push(...(responses[idx]?.data || []).map(TestingService._transformSbertRow));
        idx++;
      }
      all.push(...(responses[idx]?.data || []).map(TestingService._transformLegacyRow));

      // Sort gabungan, apply limit/offset
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const offset = options.offset || 0;
      const limit = options.limit;
      return limit ? all.slice(offset, offset + limit) : all.slice(offset);
    } catch (error) {
      throw new Error(`Failed to get user test results: ${error.message}`);
    }
  }

  static async deleteTestResult(testId, userId) {
    try {
      const { error } = await supabaseService.getClient()
        .from('test_results')
        .delete()
        .eq('id', testId)
        .eq('user_id', userId);
      if (error) throw new Error(`Database error: ${error.message}`);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete test result: ${error.message}`);
    }
  }

  static async updateTestResult(testId, userId, updateData) {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('test_results')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', testId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw new Error(`Database error: ${error.message}`);
      return data;
    } catch (error) {
      throw new Error(`Failed to update test result: ${error.message}`);
    }
  }

  /**
   * Statistik gabungan dari tabel baru + lama.
   */
  static async getTestStatistics(userId) {
    try {
      const [meteorRes, sbertRes, oldRes] = await Promise.all([
        supabaseService.getClient()
          .from('meteor_test_results')
          .select('meteor_score, created_at')
          .eq('user_id', userId),
        supabaseService.getClient()
          .from('sentence_bert_test_results')
          .select('similarity_score, created_at')
          .eq('user_id', userId),
        supabaseService.getClient()
          .from('test_results')
          .select('test_type, score, created_at')
          .eq('user_id', userId),
      ]);

      const meteorScores = [
        ...(meteorRes.data || []).map(r => r.meteor_score),
        ...(oldRes.data || []).filter(r => r.test_type === 'meteor').map(r => r.score),
      ].filter(s => s != null);

      const sbertScores = [
        ...(sbertRes.data || []).map(r => r.similarity_score),
        ...(oldRes.data || []).filter(r => r.test_type === 'sentence_bert').map(r => r.score),
      ].filter(s => s != null);

      const statsFor = (scores) => {
        if (scores.length === 0) {
          return { count: 0, average: 0, highest: 0, lowest: 0 };
        }
        return {
          count: scores.length,
          average: scores.reduce((a, b) => a + b, 0) / scores.length,
          highest: Math.max(...scores),
          lowest: Math.min(...scores),
        };
      };

      const meteorStats = statsFor(meteorScores);
      const sbertStats = statsFor(sbertScores);

      return {
        total_tests: meteorStats.count + sbertStats.count,
        meteor_tests: meteorStats.count,
        sentence_bert_tests: sbertStats.count,
        average_meteor_score: meteorStats.average,
        average_sentence_bert_score: sbertStats.average,
        highest_meteor_score: meteorStats.highest,
        highest_sentence_bert_score: sbertStats.highest,
        lowest_meteor_score: meteorStats.lowest,
        lowest_sentence_bert_score: sbertStats.lowest,
      };
    } catch (error) {
      throw new Error(`Failed to get test statistics: ${error.message}`);
    }
  }

  // -------- Scenario references --------

  static async saveScenarioReference(referenceData) {
    try {
      const { data: existingData } = await supabaseService.getClient()
        .from('test_scenario_references')
        .select('id, usage_count')
        .eq('user_id', referenceData.userId)
        .eq('reference_text', referenceData.referenceText)
        .single();

      if (existingData) {
        const { data, error } = await supabaseService.getClient()
          .from('test_scenario_references')
          .update({
            usage_count: existingData.usage_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingData.id)
          .select()
          .single();
        if (error) throw new Error(`Database error: ${error.message}`);
        return data;
      }

      const { data, error } = await supabaseService.getClient()
        .from('test_scenario_references')
        .insert([{
          user_id: referenceData.userId,
          reference_text: referenceData.referenceText,
          description: referenceData.description || null,
          tags: referenceData.tags || [],
          usage_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (error) throw new Error(`Database error: ${error.message}`);
      return data;
    } catch (error) {
      throw new Error(`Failed to save scenario reference: ${error.message}`);
    }
  }

  static async getScenarioReferences(userId, options = {}) {
    try {
      let query = supabaseService.getClient()
        .from('test_scenario_references')
        .select('*')
        .eq('user_id', userId);
      if (options.searchText) {
        query = query.ilike('reference_text', `%${options.searchText}%`);
      }
      if (options.tags && options.tags.length > 0) {
        query = query.overlaps('tags', options.tags);
      }
      if (options.limit) query = query.limit(options.limit);
      query = query.order('usage_count', { ascending: false })
                   .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw new Error(`Database error: ${error.message}`);
      return data || [];
    } catch (error) {
      throw new Error(`Failed to get scenario references: ${error.message}`);
    }
  }

  static async getLastUsedReference(scenarioId, userId) {
    try {
      // Cek ke tabel baru (METEOR & SBERT) dulu, lalu tabel lama
      const queries = await Promise.all([
        supabaseService.getClient()
          .from('meteor_test_results')
          .select('reference_text, created_at')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabaseService.getClient()
          .from('sentence_bert_test_results')
          .select('reference_text, created_at')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabaseService.getClient()
          .from('test_results')
          .select('reference_text, created_at')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const candidates = queries
        .map(q => q.data?.[0])
        .filter(Boolean);
      if (candidates.length === 0) return null;

      // Ambil reference dari record paling baru
      candidates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return candidates[0].reference_text;
    } catch (error) {
      throw new Error(`Failed to get last used reference: ${error.message}`);
    }
  }

  /**
   * Cross-test data: METEOR + SBERT terbaru untuk satu scenario.
   * Sekarang query dari tabel baru, fallback ke tabel lama.
   */
  static async getCrossTestData(scenarioId, userId) {
    try {
      const [meteorRes, sbertRes, oldRes] = await Promise.all([
        supabaseService.getClient()
          .from('meteor_test_results')
          .select('*')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabaseService.getClient()
          .from('sentence_bert_test_results')
          .select('*')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabaseService.getClient()
          .from('test_results')
          .select('*')
          .eq('scenario_id', scenarioId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      // Ambil hasil terbaru: prefer tabel baru, fallback ke lama
      let meteorResult = meteorRes.data?.[0]
        ? TestingService._transformMeteorRow(meteorRes.data[0])
        : null;
      let sentenceBertResult = sbertRes.data?.[0]
        ? TestingService._transformSbertRow(sbertRes.data[0])
        : null;

      if (!meteorResult) {
        const oldMeteor = (oldRes.data || []).find(r => r.test_type === 'meteor');
        if (oldMeteor) meteorResult = TestingService._transformLegacyRow(oldMeteor);
      }
      if (!sentenceBertResult) {
        const oldSbert = (oldRes.data || []).find(r => r.test_type === 'sentence_bert');
        if (oldSbert) sentenceBertResult = TestingService._transformLegacyRow(oldSbert);
      }

      return {
        meteor: meteorResult,
        sentence_bert: sentenceBertResult,
        hasResults: !!(meteorResult || sentenceBertResult),
        hasBothResults: !!(meteorResult && sentenceBertResult),
        sharedReferenceText:
          meteorResult?.reference_text || sentenceBertResult?.reference_text || null,
      };
    } catch (error) {
      throw new Error(`Failed to get cross-test data: ${error.message}`);
    }
  }
}

export default TestingService;