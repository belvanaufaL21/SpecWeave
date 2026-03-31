/**
 * Property-Based Tests for Database Operations
 * Tests the round-trip data persistence for test_results and scenario_references tables
 * 
 * Property 9: Data Persistence Round-trip
 * Validates: Requirements 3.4
 * 
 * Feature: meteor-sentence-bert-testing, Property 9: Data Persistence Round-trip
 */

const fc = require('fast-check');

// Mock Supabase client for testing
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [{ id: 'test-id' }], error: null }))
    })),
    upsert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [{ id: 'test-id' }], error: null }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [{}], error: null }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }))
};

// Test data generators
const testTypeArb = fc.constantFrom('meteor', 'sentence_bert');

const scoreArb = fc.float({ min: 0, max: 1, noNaN: true }).map(n => 
  Math.round(n * 1000) / 1000 // Round to 3 decimal places
);

const textArb = fc.string({ minLength: 10, maxLength: 500 }).filter(s => 
  s.trim().length > 0
);

const scenarioIdArb = fc.string({ minLength: 5, maxLength: 50 }).map(s => 
  s.replace(/[^a-zA-Z0-9-_]/g, '-')
);

const userIdArb = fc.uuid();

const testDetailsArb = fc.record({
  method: fc.constantFrom('METEOR', 'Sentence-BERT + Cosine Similarity'),
  model: fc.option(fc.constantFrom('paraphrase-multilingual-MiniLM-L12-v2', 'nltk')),
  tokens: fc.option(fc.integer({ min: 1, max: 100 })),
  precision: fc.option(scoreArb),
  recall: fc.option(scoreArb)
});

const testResultArb = fc.record({
  user_id: userIdArb,
  scenario_id: scenarioIdArb,
  test_type: testTypeArb,
  score: scoreArb,
  generated_text: textArb,
  reference_text: textArb,
  test_details: testDetailsArb
});

const tagsArb = fc.array(fc.string({ minLength: 2, maxLength: 20 }), { maxLength: 5 });

const scenarioReferenceArb = fc.record({
  user_id: userIdArb,
  reference_text: textArb,
  description: fc.option(fc.string({ maxLength: 200 })),
  tags: fc.option(tagsArb),
  usage_count: fc.integer({ min: 0, max: 1000 })
});

/**
 * Mock database service for testing
 */
class TestDatabaseService {
  constructor(supabaseClient = mockSupabase) {
    this.supabase = supabaseClient;
    // Track inserted data to simulate constraints
    this.insertedTestResults = new Set();
  }

  async saveTestResult(testData) {
    // Simulate check constraint for test_type
    if (!['meteor', 'sentence_bert'].includes(testData.test_type)) {
      throw new Error('check constraint violation');
    }

    const uniqueKey = `${testData.user_id}-${testData.scenario_id}-${testData.test_type}`;
    
    // Simulate upsert behavior - update if exists, insert if not
    const { data, error } = await this.supabase
      .from('test_results')
      .upsert([testData], {
        onConflict: 'user_id,scenario_id,test_type',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) throw error;
    
    // Track this upsert for constraint simulation
    this.insertedTestResults.add(uniqueKey);
    
    return data[0];
  }

  async getTestResult(userId, scenarioId, testType) {
    const { data, error } = await this.supabase
      .from('test_results')
      .select('*')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .eq('test_type', testType);
    
    if (error) throw error;
    return data[0];
  }

  async saveTestScenarioReference(referenceData) {
    const { data, error } = await this.supabase
      .from('test_scenario_references')
      .insert([referenceData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  async getTestScenarioReference(userId, referenceText) {
    const { data, error } = await this.supabase
      .from('test_scenario_references')
      .select('*')
      .eq('user_id', userId)
      .eq('reference_text', referenceText);
    
    if (error) throw error;
    return data[0];
  }

  async deleteTestResult(userId, scenarioId, testType) {
    const { error } = await this.supabase
      .from('test_results')
      .delete()
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .eq('test_type', testType);
    
    if (error) throw error;
    
    // Remove from tracking for constraint simulation
    const uniqueKey = `${userId}-${scenarioId}-${testType}`;
    this.insertedTestResults.delete(uniqueKey);
  }

  async deleteTestScenarioReference(userId, referenceText) {
    const { error } = await this.supabase
      .from('test_scenario_references')
      .delete()
      .eq('user_id', userId)
      .eq('reference_text', referenceText);
    
    if (error) throw error;
  }

  // Reset method for testing
  reset() {
    this.insertedTestResults.clear();
  }
}

describe('Database Operations Property Tests', () => {
  let dbService;

  beforeEach(() => {
    jest.clearAllMocks();
    dbService = new TestDatabaseService();
    dbService.reset(); // Reset constraint tracking
  });

  /**
   * Property 9: Data Persistence Round-trip
   * For any test result data, saving then retrieving should produce equivalent data
   * Validates: Requirements 3.4
   */
  test('Property 9: Test Results Round-trip Persistence', async () => {
    await fc.assert(
      fc.asyncProperty(testResultArb, async (testData) => {
        // Mock the database responses to simulate round-trip
        const savedData = { ...testData, id: 'test-id', created_at: new Date().toISOString() };
        
        mockSupabase.from.mockReturnValueOnce({
          insert: jest.fn(() => ({
            select: jest.fn(() => Promise.resolve({ data: [savedData], error: null }))
          }))
        });

        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ data: [savedData], error: null }))
              }))
            }))
          }))
        });

        // Save test result
        const saved = await dbService.saveTestResult(testData);
        
        // Retrieve test result
        const retrieved = await dbService.getTestResult(
          testData.user_id, 
          testData.scenario_id, 
          testData.test_type
        );

        // Verify round-trip consistency
        expect(retrieved.user_id).toBe(testData.user_id);
        expect(retrieved.scenario_id).toBe(testData.scenario_id);
        expect(retrieved.test_type).toBe(testData.test_type);
        expect(retrieved.score).toBe(testData.score);
        expect(retrieved.generated_text).toBe(testData.generated_text);
        expect(retrieved.reference_text).toBe(testData.reference_text);
        
        // Test details should be preserved (deep equality for objects)
        if (testData.test_details) {
          expect(retrieved.test_details).toEqual(testData.test_details);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Data Persistence Round-trip (Test Scenario References)
   * For any test scenario reference data, saving then retrieving should produce equivalent data
   * Validates: Requirements 3.4
   */
  test('Property 9: Test Scenario References Round-trip Persistence', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioReferenceArb, async (referenceData) => {
        // Mock the database responses to simulate round-trip
        const savedData = { ...referenceData, id: 'ref-id', created_at: new Date().toISOString() };
        
        mockSupabase.from.mockReturnValueOnce({
          insert: jest.fn(() => ({
            select: jest.fn(() => Promise.resolve({ data: [savedData], error: null }))
          }))
        });

        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: [savedData], error: null }))
            }))
          }))
        });

        // Save scenario reference
        const saved = await dbService.saveTestScenarioReference(referenceData);
        
        // Retrieve scenario reference
        const retrieved = await dbService.getTestScenarioReference(
          referenceData.user_id, 
          referenceData.reference_text
        );

        // Verify round-trip consistency
        expect(retrieved.user_id).toBe(referenceData.user_id);
        expect(retrieved.reference_text).toBe(referenceData.reference_text);
        expect(retrieved.description).toBe(referenceData.description);
        expect(retrieved.usage_count).toBe(referenceData.usage_count);
        
        // Tags array should be preserved
        if (referenceData.tags) {
          expect(retrieved.tags).toEqual(referenceData.tags);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Score Precision Consistency
   * For any score value, it should be stored and retrieved with consistent precision
   */
  test('Property: Score values maintain 3-decimal precision', async () => {
    await fc.assert(
      fc.asyncProperty(scoreArb, userIdArb, scenarioIdArb, testTypeArb, textArb, textArb, 
        async (score, userId, scenarioId, testType, generatedText, referenceText) => {
          // Reset service state for each test
          dbService.reset();
          
          const testData = {
            user_id: userId,
            scenario_id: scenarioId,
            test_type: testType,
            score: score,
            generated_text: generatedText,
            reference_text: referenceText
          };

          const savedData = { ...testData, id: 'test-id' };
          
          mockSupabase.from.mockReturnValue({
            insert: jest.fn(() => ({
              select: jest.fn(() => Promise.resolve({ data: [savedData], error: null }))
            })),
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => Promise.resolve({ data: [savedData], error: null }))
                }))
              }))
            }))
          });

          const saved = await dbService.saveTestResult(testData);
          const retrieved = await dbService.getTestResult(userId, scenarioId, testType);

          // Score should maintain precision
          expect(retrieved.score).toBe(score);
          
          // Score should be within valid range
          expect(retrieved.score).toBeGreaterThanOrEqual(0);
          expect(retrieved.score).toBeLessThanOrEqual(1);
          
          // Score should have at most 3 decimal places
          const scoreStr = retrieved.score.toString();
          const decimalPart = scoreStr.split('.')[1];
          if (decimalPart) {
            expect(decimalPart.length).toBeLessThanOrEqual(3);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Unique Constraint Behavior (Upsert)
   * For any duplicate test result (same user, scenario, test_type), 
   * the system should update the existing record instead of failing
   */
  test('Property: Unique constraint handled by upsert operation', async () => {
    await fc.assert(
      fc.asyncProperty(testResultArb, async (testData) => {
        // Reset service state for each test
        dbService.reset();
        
        // First upsert should succeed
        const savedData = { ...testData, id: 'test-id-1' };
        
        mockSupabase.from.mockReturnValue({
          upsert: jest.fn(() => ({
            select: jest.fn(() => Promise.resolve({ data: [savedData], error: null }))
          }))
        });

        const first = await dbService.saveTestResult(testData);
        expect(first).toBeDefined();

        // Second upsert with same user_id, scenario_id, test_type should succeed and update
        const updatedData = { ...testData, id: 'test-id-1', score: testData.score + 0.1 };
        mockSupabase.from.mockReturnValue({
          upsert: jest.fn(() => ({
            select: jest.fn(() => Promise.resolve({ data: [updatedData], error: null }))
          }))
        });

        const second = await dbService.saveTestResult({ ...testData, score: testData.score + 0.1 });
        expect(second).toBeDefined();
        expect(second.score).toBe(testData.score + 0.1);
      }),
      { numRuns: 20 } // Reduced runs to avoid timeout
    );
  });

  /**
   * Property: Test Type Validation
   * For any test result, test_type should only accept valid values
   */
  test('Property: Test type validation enforces allowed values', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb, 
        scenarioIdArb, 
        fc.string({ minLength: 1 }).filter(s => !['meteor', 'sentence_bert'].includes(s)),
        scoreArb,
        textArb,
        textArb,
        async (userId, scenarioId, invalidTestType, score, generatedText, referenceText) => {
          // Reset service state for each test
          dbService.reset();
          
          const testData = {
            user_id: userId,
            scenario_id: scenarioId,
            test_type: invalidTestType,
            score: score,
            generated_text: generatedText,
            reference_text: referenceText
          };

          // Mock will return success, but our service should throw due to validation
          mockSupabase.from.mockReturnValue({
            insert: jest.fn(() => ({
              select: jest.fn(() => Promise.resolve({ data: [testData], error: null }))
            }))
          });

          // This should throw an error due to check constraint
          await expect(dbService.saveTestResult(testData)).rejects.toThrow('check constraint violation');
        }
      ),
      { numRuns: 20 } // Reduced runs to avoid timeout
    );
  });
});

module.exports = {
  TestDatabaseService,
  testResultArb,
  scenarioReferenceArb,
  scoreArb,
  testTypeArb
};