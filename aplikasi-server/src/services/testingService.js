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
// model belum di-cache (~30-60s download).
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
 * @param {string} stage - Stage name (mis. 'attention', 'pooling', dll)
 * @param {number} progress - Persentase progress (0-100)
 * @param {{message?: string}} details - Detail tambahan (saat ini hanya pesan)
 */

/**
 * FUNGSI KUNCI: Spawn Python script dan handle komunikasi dengan Node.js
 * 
 * Fungsi ini adalah "jembatan" antara Node.js backend dan Python script.
 * 
 * @param {string} scriptName - Nama file Python (mis. 'sentence_bert_calculator.py')
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
      // Command: python sentence_bert_calculator.py "generated_text" "reference_text"
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
   * Untuk kode baru, pakai saveSentenceBertResult.
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

  // -------- Single evaluation (Sentence-BERT only) --------

  /**
   * Run Sentence-BERT evaluation dan simpan ke tabel.
   * Menggantikan dual evaluation (METEOR dihapus).
   */
  static async runSingleEvaluation(generatedText, referenceText, scenarioId, userId) {
    try {
      const sentenceBertResult = await this.calculateSentenceBertScore(generatedText, referenceText);
      const timestamp = new Date().toISOString();

      await this.saveSentenceBertResult(userId, scenarioId, generatedText, referenceText, sentenceBertResult);

      console.log('✅ Saved Sentence-BERT test result');

      return {
        success: true,
        timestamp,
        sentence_bert: {
          success: sentenceBertResult.success,
          score: sentenceBertResult.score,
          details: sentenceBertResult.details,
        },
        generatedText,
        referenceText,
      };
    } catch (error) {
      throw new Error(`Evaluation failed: ${error.message}`);
    }
  }

  /**
   * Variant dengan progress callback untuk SSE/websocket.
   */
  static async runSingleEvaluationWithProgress(generatedText, referenceText, scenarioId, userId, onProgress) {
    try {
      const sentenceBertResult = await this.calculateSentenceBertScoreWithProgress(
        generatedText, 
        referenceText, 
        onProgress
      );

      const timestamp = new Date().toISOString();

      await this.saveSentenceBertResult(userId, scenarioId, generatedText, referenceText, sentenceBertResult);

      return {
        success: true,
        timestamp,
        sentence_bert: {
          success: sentenceBertResult.success,
          score: sentenceBertResult.score,
          details: sentenceBertResult.details,
        },
        generatedText,
        referenceText,
      };
    } catch (error) {
      throw new Error(`Evaluation failed: ${error.message}`);
    }
  }

  // -------- Read results --------

  /**
   * Get test results untuk satu scenario, hanya dari tabel Sentence-BERT + tabel lama.
   */
  static async getTestResultsByScenario(scenarioId, userId) {
    try {
      const [sbertResults] = await Promise.all([
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

      if (sbertResults.error) console.warn('⚠️ sentence_bert_test_results:', sbertResults.error.message);
      if (oldError) console.warn('⚠️ test_results (legacy):', oldError.message);

      const transformedSbert = (sbertResults.data || []).map(this._transformSbertRow);

      const oldSbert = (oldResults || []).filter(r => r.test_type === 'sentence_bert').map(this._transformLegacyRow);

      const allSbert = [...transformedSbert, ...oldSbert]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return { sentence_bert: allSbert };
    } catch (error) {
      throw new Error(`Failed to get test results: ${error.message}`);
    }
  }

  // Helper untuk transform row (hanya Sentence-BERT yang tersisa)

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
   * NOTE: query hanya dari tabel Sentence-BERT + lama.
   */
  static async getTestResultsByUser(userId, options = {}) {
    try {
      const queries = [];

      // Tabel baru — kalau filter testType, skip yang tidak relevan
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
   * Statistik hanya dari Sentence-BERT + tabel lama.
   */
  static async getTestStatistics(userId) {
    try {
      const [sbertRes, oldRes] = await Promise.all([
        supabaseService.getClient()
          .from('sentence_bert_test_results')
          .select('similarity_score, created_at')
          .eq('user_id', userId),
        supabaseService.getClient()
          .from('test_results')
          .select('test_type, score, created_at')
          .eq('user_id', userId),
      ]);

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

      const sbertStats = statsFor(sbertScores);

      return {
        total_tests: sbertStats.count,
        sentence_bert_tests: sbertStats.count,
        average_sentence_bert_score: sbertStats.average,
        highest_sentence_bert_score: sbertStats.highest,
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
      // Cek ke tabel Sentence-BERT dulu, lalu tabel lama
      const queries = await Promise.all([
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
   * Cross-test data: Hanya Sentence-BERT untuk satu scenario.
   * (METEOR sudah dihapus)
   */
  static async getCrossTestData(scenarioId, userId) {
    try {
      const [sbertRes, oldRes] = await Promise.all([
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
      let sentenceBertResult = sbertRes.data?.[0]
        ? TestingService._transformSbertRow(sbertRes.data[0])
        : null;

      if (!sentenceBertResult) {
        const oldSbert = (oldRes.data || []).find(r => r.test_type === 'sentence_bert');
        if (oldSbert) sentenceBertResult = TestingService._transformLegacyRow(oldSbert);
      }

      return {
        sentence_bert: sentenceBertResult,
        hasResults: !!sentenceBertResult,
        sharedReferenceText: sentenceBertResult?.reference_text || null,
      };
    } catch (error) {
      throw new Error(`Failed to get cross-test data: ${error.message}`);
    }
  }
}

export default TestingService;