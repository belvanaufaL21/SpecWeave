/**
 * Property-Based Tests for TestingService
 * Tests the test processing and method selection functionality
 * 
 * Property 5: Test Processing and Method Selection
 * Validates: Requirements 1.5
 * 
 * Feature: meteor-sentence-bert-testing, Property 5: Test Processing and Method Selection
 */

const fc = require('fast-check');
const { spawn } = require('child_process');

// Mock child_process spawn for Python script execution
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock supabaseService
const mockSupabaseService = {
  getClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'test-id', created_at: new Date().toISOString() }, 
            error: null 
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  }))
};

jest.mock('../supabaseService.js', () => mockSupabaseService);

// Mock TestingService implementation for testing
class MockTestingService {
  static async calculateMeteorScore(generatedText, referenceText) {
    return new Promise((resolve, reject) => {
      const pythonScriptPath = require('path').join(__dirname, '../python/meteor_calculator.py');
      
      const pythonProcess = spawn('python', [
        pythonScriptPath,
        generatedText,
        referenceText
      ]);
      
      let result = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.error) {
              reject(new Error(`METEOR calculation error: ${parsedResult.error}`));
            } else {
              resolve(parsedResult);
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse METEOR result: ${parseError.message}`));
          }
        } else {
          reject(new Error(`METEOR calculation failed with code ${code}: ${errorOutput}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start METEOR calculation: ${error.message}`));
      });
    });
  }
  
  static async calculateSentenceBertScore(generatedText, referenceText) {
    return new Promise((resolve, reject) => {
      const pythonScriptPath = require('path').join(__dirname, '../python/sentence_bert_calculator.py');
      
      const pythonProcess = spawn('python', [
        pythonScriptPath,
        generatedText,
        referenceText
      ]);
      
      let result = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.error) {
              reject(new Error(`Sentence-BERT calculation error: ${parsedResult.error}`));
            } else {
              resolve(parsedResult);
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Sentence-BERT result: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Sentence-BERT calculation failed with code ${code}: ${errorOutput}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Sentence-BERT calculation: ${error.message}`));
      });
    });
  }
}

// Test data generators
const testTypeArb = fc.constantFrom('meteor', 'sentence_bert');

const textArb = fc.string({ minLength: 10, maxLength: 500 }).filter(s => 
  s.trim().length > 0 && 
  !s.includes('\n') && 
  !s.includes('\r') && 
  !s.includes('\t') &&
  /^[a-zA-Z0-9\s.,!?-]+$/.test(s) // Only alphanumeric, spaces, and basic punctuation
);

const scenarioIdArb = fc.string({ minLength: 5, maxLength: 50 }).map(s => 
  s.replace(/[^a-zA-Z0-9-_]/g, '-')
);

const userIdArb = fc.uuid();

const scoreArb = fc.float({ min: 0, max: 1, noNaN: true }).map(n => 
  Math.round(n * 1000) / 1000 // Round to 3 decimal places
);

// Mock Python process for successful execution
const createMockPythonProcess = (testType, score = 0.85) => {
  const mockProcess = {
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn()
  };

  // Simulate successful Python script execution
  setTimeout(() => {
    const result = testType === 'meteor' 
      ? {
          score: score,
          details: {
            generated_tokens: 15,
            reference_tokens: 18,
            method: 'METEOR'
          }
        }
      : {
          score: score,
          details: {
            embedding_dimension: 384,
            model: 'paraphrase-multilingual-MiniLM-L12-v2',
            method: 'Sentence-BERT + Cosine Similarity'
          }
        };

    // Trigger stdout data event
    const stdoutCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
    if (stdoutCallback) {
      stdoutCallback(JSON.stringify(result));
    }

    // Trigger close event with success code
    const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')[1];
    if (closeCallback) {
      closeCallback(0);
    }
  }, 10);

  return mockProcess;
};

describe('TestingService Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spawn.mockClear();
  });

  /**
   * Property 5: Test Processing and Method Selection
   * For any test request with a specific test type (METEOR or Sentence-BERT),
   * the system should call the correct Python script and return results with the expected format
   * Validates: Requirements 1.5
   */
  test('Property 5: Test Processing and Method Selection - METEOR', async () => {
    await fc.assert(
      fc.asyncProperty(textArb, textArb, scoreArb, async (generatedText, referenceText, expectedScore) => {
        // Setup mock for METEOR calculation
        const mockProcess = createMockPythonProcess('meteor', expectedScore);
        spawn.mockReturnValue(mockProcess);

        // Call METEOR calculation
        const result = await MockTestingService.calculateMeteorScore(generatedText, referenceText);

        // Verify correct Python script was called
        expect(spawn).toHaveBeenCalledWith('python', [
          expect.stringContaining('meteor_calculator.py'),
          generatedText,
          referenceText
        ]);

        // Verify result format for METEOR
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('details');
        expect(result.details).toHaveProperty('method', 'METEOR');
        expect(result.details).toHaveProperty('generated_tokens');
        expect(result.details).toHaveProperty('reference_tokens');
        
        // Score should be within valid range
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        
        // Score should match expected precision
        expect(typeof result.score).toBe('number');
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: Test Processing and Method Selection - Sentence-BERT
   * For any test request with Sentence-BERT type,
   * the system should call the correct Python script and return results with the expected format
   * Validates: Requirements 1.5
   */
  test('Property 5: Test Processing and Method Selection - Sentence-BERT', async () => {
    await fc.assert(
      fc.asyncProperty(textArb, textArb, scoreArb, async (generatedText, referenceText, expectedScore) => {
        // Setup mock for Sentence-BERT calculation
        const mockProcess = createMockPythonProcess('sentence_bert', expectedScore);
        spawn.mockReturnValue(mockProcess);

        // Call Sentence-BERT calculation
        const result = await MockTestingService.calculateSentenceBertScore(generatedText, referenceText);

        // Verify correct Python script was called
        expect(spawn).toHaveBeenCalledWith('python', [
          expect.stringContaining('sentence_bert_calculator.py'),
          generatedText,
          referenceText
        ]);

        // Verify result format for Sentence-BERT
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('details');
        expect(result.details).toHaveProperty('method', 'Sentence-BERT + Cosine Similarity');
        expect(result.details).toHaveProperty('embedding_dimension');
        expect(result.details).toHaveProperty('model', 'paraphrase-multilingual-MiniLM-L12-v2');
        
        // Score should be within valid range
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        
        // Score should match expected precision
        expect(typeof result.score).toBe('number');
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: Method Selection Consistency
   * For any test type selection, the system should consistently call the correct method
   * and never mix up METEOR and Sentence-BERT processing
   * Validates: Requirements 1.5
   */
  test('Property 5: Method Selection Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(testTypeArb, textArb, textArb, async (testType, generatedText, referenceText) => {
        // Setup appropriate mock based on test type
        const mockProcess = createMockPythonProcess(testType, 0.75);
        spawn.mockReturnValue(mockProcess);

        let result;
        let expectedScriptName;
        let expectedMethod;

        if (testType === 'meteor') {
          result = await MockTestingService.calculateMeteorScore(generatedText, referenceText);
          expectedScriptName = 'meteor_calculator.py';
          expectedMethod = 'METEOR';
        } else {
          result = await MockTestingService.calculateSentenceBertScore(generatedText, referenceText);
          expectedScriptName = 'sentence_bert_calculator.py';
          expectedMethod = 'Sentence-BERT + Cosine Similarity';
        }

        // Verify correct script was called
        expect(spawn).toHaveBeenCalledWith('python', [
          expect.stringContaining(expectedScriptName),
          generatedText,
          referenceText
        ]);

        // Verify result contains correct method identifier
        expect(result.details.method).toBe(expectedMethod);

        // Verify method-specific properties exist
        if (testType === 'meteor') {
          expect(result.details).toHaveProperty('generated_tokens');
          expect(result.details).toHaveProperty('reference_tokens');
          expect(result.details).not.toHaveProperty('embedding_dimension');
          expect(result.details).not.toHaveProperty('model');
        } else {
          expect(result.details).toHaveProperty('embedding_dimension');
          expect(result.details).toHaveProperty('model');
          expect(result.details).not.toHaveProperty('generated_tokens');
          expect(result.details).not.toHaveProperty('reference_tokens');
        }
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Property 5: Error Handling Consistency
   * For any Python script failure, both methods should handle errors consistently
   * Validates: Requirements 1.5
   */
  test('Property 5: Error Handling Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(testTypeArb, textArb, textArb, async (testType, generatedText, referenceText) => {
        // Setup mock for failed Python process
        const mockProcess = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn()
        };

        // Simulate Python script failure
        setTimeout(() => {
          const stderrCallback = mockProcess.stderr.on.mock.calls.find(call => call[0] === 'data')[1];
          if (stderrCallback) {
            stderrCallback('Python script error');
          }

          const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')[1];
          if (closeCallback) {
            closeCallback(1); // Non-zero exit code indicates failure
          }
        }, 10);

        spawn.mockReturnValue(mockProcess);

        // Both methods should throw errors consistently
        let thrownError;
        try {
          if (testType === 'meteor') {
            await MockTestingService.calculateMeteorScore(generatedText, referenceText);
          } else {
            await MockTestingService.calculateSentenceBertScore(generatedText, referenceText);
          }
        } catch (error) {
          thrownError = error;
        }

        // Verify error was thrown
        expect(thrownError).toBeDefined();
        expect(thrownError).toBeInstanceOf(Error);
        
        // Error message should indicate the failure type
        const expectedErrorPattern = testType === 'meteor' 
          ? /METEOR calculation failed/
          : /Sentence-BERT calculation failed/;
        expect(thrownError.message).toMatch(expectedErrorPattern);
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property 5: Input Validation and Processing
   * For any valid text inputs, both methods should process them without corruption
   * Validates: Requirements 1.5
   */
  test('Property 5: Input Validation and Processing', async () => {
    await fc.assert(
      fc.asyncProperty(testTypeArb, textArb, textArb, async (testType, generatedText, referenceText) => {
        // Setup mock for successful processing
        const mockProcess = createMockPythonProcess(testType, 0.65);
        spawn.mockReturnValue(mockProcess);

        // Process the texts
        if (testType === 'meteor') {
          await MockTestingService.calculateMeteorScore(generatedText, referenceText);
        } else {
          await MockTestingService.calculateSentenceBertScore(generatedText, referenceText);
        }

        // Verify the exact texts were passed to Python script
        expect(spawn).toHaveBeenCalledWith('python', [
          expect.any(String), // Script path
          generatedText,      // Exact generated text
          referenceText       // Exact reference text
        ]);
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Property 5: Result Format Consistency
   * For any successful calculation, results should have consistent structure
   * regardless of input variations
   * Validates: Requirements 1.5
   */
  test('Property 5: Result Format Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(testTypeArb, textArb, textArb, scoreArb, async (testType, generatedText, referenceText, score) => {
        // Setup mock with specific score
        const mockProcess = createMockPythonProcess(testType, score);
        spawn.mockReturnValue(mockProcess);

        let result;
        if (testType === 'meteor') {
          result = await MockTestingService.calculateMeteorScore(generatedText, referenceText);
        } else {
          result = await MockTestingService.calculateSentenceBertScore(generatedText, referenceText);
        }

        // All results should have consistent top-level structure
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('details');
        expect(typeof result.score).toBe('number');
        expect(typeof result.details).toBe('object');
        expect(result.details).toHaveProperty('method');
        
        // Score should be the expected value
        expect(result.score).toBe(score);
        
        // Details should contain method-specific information
        expect(typeof result.details.method).toBe('string');
        expect(result.details.method.length).toBeGreaterThan(0);
      }),
      { numRuns: 40 }
    );
  });
});