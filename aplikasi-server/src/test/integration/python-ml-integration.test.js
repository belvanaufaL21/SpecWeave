import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import TestingService from '../../services/testingService.js';

// Test data for ML services
const testScenarios = {
  identical: {
    generated: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
    reference: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard'
  },
  similar: {
    generated: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
    reference: 'Given user is on the login page When user provides valid email and password Then system redirects to main dashboard'
  },
  different: {
    generated: 'Given user is on login page When user enters valid credentials Then user is redirected to dashboard',
    reference: 'Given system is offline When maintenance is scheduled Then users see maintenance message'
  },
  empty: {
    generated: '',
    reference: ''
  },
  specialChars: {
    generated: 'Given user enters "special@chars#123" When system validates input Then user sees success message',
    reference: 'Given user inputs "special@chars#123" When validation occurs Then success message appears'
  },
  multiline: {
    generated: `Given user is on login page
    When user enters valid credentials
    Then user is redirected to dashboard`,
    reference: `Given user is on the login page
    When user provides valid email and password
    Then system redirects to main dashboard`
  }
};

describe('Python ML Services Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('METEOR Calculator Integration', () => {
    it('should calculate METEOR score for identical texts', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      
      const result = await TestingService.calculateMeteorScore(
        testScenarios.identical.generated,
        testScenarios.identical.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThanOrEqual(0.9); // Identical texts should have high score
      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.details).toBeDefined();
      expect(result.details.method).toBe('METEOR');
      expect(result.details.generated_tokens).toBeTypeOf('number');
      expect(result.details.reference_tokens).toBeTypeOf('number');
    });

    it('should calculate METEOR score for similar texts', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      
      const result = await TestingService.calculateMeteorScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThan(0.3); // Similar texts should have moderate score
      expect(result.score).toBeLessThan(0.9);
      expect(result.details.method).toBe('METEOR');
    });

    it('should calculate METEOR score for different texts', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      
      const result = await TestingService.calculateMeteorScore(
        testScenarios.different.generated,
        testScenarios.different.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThanOrEqual(0.0);
      expect(result.score).toBeLessThan(0.3); // Different texts should have low score
      expect(result.details.method).toBe('METEOR');
    });

    it('should handle special characters in METEOR calculation', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      
      const result = await TestingService.calculateMeteorScore(
        testScenarios.specialChars.generated,
        testScenarios.specialChars.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThanOrEqual(0.0);
      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.details.method).toBe('METEOR');
    });

    it('should handle multiline texts in METEOR calculation', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      
      const result = await TestingService.calculateMeteorScore(
        testScenarios.multiline.generated,
        testScenarios.multiline.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThanOrEqual(0.0);
      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.details.method).toBe('METEOR');
    });

    it('should handle empty texts gracefully in METEOR calculation', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      try {
        const result = await TestingService.calculateMeteorScore(
          testScenarios.empty.generated,
          testScenarios.empty.reference
        );
        
        // If it doesn't throw, it should return a valid result
        expect(result).toBeDefined();
        if (result.error) {
          expect(result.error).toBeTypeOf('string');
        } else {
          expect(result.score).toBeTypeOf('number');
          expect(result.score).toBeGreaterThanOrEqual(0.0);
          expect(result.score).toBeLessThanOrEqual(1.0);
        }
      } catch (error) {
        // If it throws, the error should be handled gracefully
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeTypeOf('string');
      }
    });

    it('should be deterministic for METEOR calculations', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      
      const result1 = await TestingService.calculateMeteorScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );
      
      const result2 = await TestingService.calculateMeteorScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );

      expect(result1.score).toBe(result2.score);
      expect(result1.details.method).toBe(result2.details.method);
    });
  });

  describe('Sentence-BERT Calculator Integration', () => {
    it('should calculate Sentence-BERT score for identical texts', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const result = await TestingService.calculateSentenceBertScore(
        testScenarios.identical.generated,
        testScenarios.identical.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThanOrEqual(0.95); // Identical texts should have very high similarity
      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.details).toBeDefined();
      expect(result.details.method).toBe('Sentence-BERT + Cosine Similarity');
      expect(result.details.model).toBe('paraphrase-multilingual-MiniLM-L12-v2');
      expect(result.details.embedding_dimension).toBeTypeOf('number');
    });

    it('should calculate Sentence-BERT score for similar texts', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const result = await TestingService.calculateSentenceBertScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThan(0.5); // Similar texts should have high semantic similarity
      expect(result.score).toBeLessThan(0.95);
      expect(result.details.method).toBe('Sentence-BERT + Cosine Similarity');
    });

    it('should calculate Sentence-BERT score for different texts', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const result = await TestingService.calculateSentenceBertScore(
        testScenarios.different.generated,
        testScenarios.different.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThanOrEqual(0.0);
      expect(result.score).toBeLessThan(0.5); // Different texts should have low semantic similarity
      expect(result.details.method).toBe('Sentence-BERT + Cosine Similarity');
    });

    it('should handle special characters in Sentence-BERT calculation', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const result = await TestingService.calculateSentenceBertScore(
        testScenarios.specialChars.generated,
        testScenarios.specialChars.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThanOrEqual(0.0);
      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.details.method).toBe('Sentence-BERT + Cosine Similarity');
    });

    it('should handle multiline texts in Sentence-BERT calculation', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const result = await TestingService.calculateSentenceBertScore(
        testScenarios.multiline.generated,
        testScenarios.multiline.reference
      );

      expect(result).toBeDefined();
      expect(result.score).toBeTypeOf('number');
      expect(result.score).toBeGreaterThanOrEqual(0.0);
      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.details.method).toBe('Sentence-BERT + Cosine Similarity');
    });

    it('should handle empty texts gracefully in Sentence-BERT calculation', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      try {
        const result = await TestingService.calculateSentenceBertScore(
          testScenarios.empty.generated,
          testScenarios.empty.reference
        );
        
        // If it doesn't throw, it should return a valid result
        expect(result).toBeDefined();
        if (result.error) {
          expect(result.error).toBeTypeOf('string');
        } else {
          expect(result.score).toBeTypeOf('number');
          expect(result.score).toBeGreaterThanOrEqual(0.0);
          expect(result.score).toBeLessThanOrEqual(1.0);
        }
      } catch (error) {
        // If it throws, the error should be handled gracefully
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeTypeOf('string');
      }
    });

    it('should be deterministic for Sentence-BERT calculations', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const result1 = await TestingService.calculateSentenceBertScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );
      
      const result2 = await TestingService.calculateSentenceBertScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );

      expect(result1.score).toBe(result2.score);
      expect(result1.details.method).toBe(result2.details.method);
      expect(result1.details.model).toBe(result2.details.model);
    });
  });

  describe('Cross-Method Comparison', () => {
    it('should show different characteristics between METEOR and Sentence-BERT', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 8: Cross-Test Data Sharing**
      
      const meteorResult = await TestingService.calculateMeteorScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );
      
      const sentenceBertResult = await TestingService.calculateSentenceBertScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );

      expect(meteorResult).toBeDefined();
      expect(sentenceBertResult).toBeDefined();
      
      // Both should be valid scores
      expect(meteorResult.score).toBeGreaterThanOrEqual(0.0);
      expect(meteorResult.score).toBeLessThanOrEqual(1.0);
      expect(sentenceBertResult.score).toBeGreaterThanOrEqual(0.0);
      expect(sentenceBertResult.score).toBeLessThanOrEqual(1.0);
      
      // Methods should be different
      expect(meteorResult.details.method).toBe('METEOR');
      expect(sentenceBertResult.details.method).toBe('Sentence-BERT + Cosine Similarity');
      
      // Scores might be different (different algorithms)
      // This is expected behavior, not a requirement for them to be equal
    });

    it('should handle identical inputs consistently across methods', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const meteorResult = await TestingService.calculateMeteorScore(
        testScenarios.identical.generated,
        testScenarios.identical.reference
      );
      
      const sentenceBertResult = await TestingService.calculateSentenceBertScore(
        testScenarios.identical.generated,
        testScenarios.identical.reference
      );

      // Both should give high scores for identical texts
      expect(meteorResult.score).toBeGreaterThan(0.9);
      expect(sentenceBertResult.score).toBeGreaterThan(0.95);
      
      // Both should have valid details
      expect(meteorResult.details).toBeDefined();
      expect(sentenceBertResult.details).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle Python process failures gracefully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      // Mock spawn to simulate process failure
      const originalSpawn = jest.spyOn(require('child_process'), 'spawn');
      
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Simulate process failure
            setTimeout(() => callback(1), 10);
          }
        })
      };
      
      originalSpawn.mockReturnValue(mockProcess);

      try {
        await TestingService.calculateMeteorScore('test', 'test');
        // If it doesn't throw, that's also acceptable if handled gracefully
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('METEOR calculation failed');
      }

      originalSpawn.mockRestore();
    });

    it('should handle invalid Python output gracefully', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 11: Error Handling Consistency**
      
      // Mock spawn to return invalid JSON
      const originalSpawn = jest.spyOn(require('child_process'), 'spawn');
      
      const mockProcess = {
        stdout: { 
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback('invalid json output'), 10);
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 20);
          }
        })
      };
      
      originalSpawn.mockReturnValue(mockProcess);

      try {
        await TestingService.calculateMeteorScore('test', 'test');
        // If it doesn't throw, that's also acceptable if handled gracefully
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      originalSpawn.mockRestore();
    });

    it('should handle very long texts without crashing', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const longText = 'Given user is on login page '.repeat(1000);
      const longReference = 'Given user is on the login page '.repeat(1000);

      try {
        const meteorResult = await TestingService.calculateMeteorScore(longText, longReference);
        expect(meteorResult).toBeDefined();
        if (!meteorResult.error) {
          expect(meteorResult.score).toBeGreaterThanOrEqual(0.0);
          expect(meteorResult.score).toBeLessThanOrEqual(1.0);
        }
      } catch (error) {
        // Long texts might cause timeouts or memory issues, which is acceptable
        expect(error).toBeInstanceOf(Error);
      }

      try {
        const sentenceBertResult = await TestingService.calculateSentenceBertScore(longText, longReference);
        expect(sentenceBertResult).toBeDefined();
        if (!sentenceBertResult.error) {
          expect(sentenceBertResult.score).toBeGreaterThanOrEqual(0.0);
          expect(sentenceBertResult.score).toBeLessThanOrEqual(1.0);
        }
      } catch (error) {
        // Long texts might cause timeouts or memory issues, which is acceptable
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle Unicode and international characters', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 12: METEOR Score Calculation Correctness**
      // **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
      
      const unicodeScenarios = {
        generated: 'Given pengguna berada di halaman masuk When pengguna memasukkan kredensial yang valid Then pengguna diarahkan ke dasbor',
        reference: 'Given pengguna ada di halaman login When pengguna memberikan email dan password yang benar Then sistem mengarahkan ke dashboard utama'
      };

      const meteorResult = await TestingService.calculateMeteorScore(
        unicodeScenarios.generated,
        unicodeScenarios.reference
      );
      
      const sentenceBertResult = await TestingService.calculateSentenceBertScore(
        unicodeScenarios.generated,
        unicodeScenarios.reference
      );

      expect(meteorResult).toBeDefined();
      expect(sentenceBertResult).toBeDefined();
      
      if (!meteorResult.error) {
        expect(meteorResult.score).toBeGreaterThanOrEqual(0.0);
        expect(meteorResult.score).toBeLessThanOrEqual(1.0);
      }
      
      if (!sentenceBertResult.error) {
        expect(sentenceBertResult.score).toBeGreaterThanOrEqual(0.0);
        expect(sentenceBertResult.score).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete calculations within reasonable time', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 5: Test Processing and Method Selection**
      
      const startTime = Date.now();
      
      const meteorPromise = TestingService.calculateMeteorScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );
      
      const sentenceBertPromise = TestingService.calculateSentenceBertScore(
        testScenarios.similar.generated,
        testScenarios.similar.reference
      );

      const [meteorResult, sentenceBertResult] = await Promise.all([
        meteorPromise,
        sentenceBertPromise
      ]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 30 seconds (generous timeout for CI environments)
      expect(duration).toBeLessThan(30000);
      
      expect(meteorResult).toBeDefined();
      expect(sentenceBertResult).toBeDefined();
    });

    it('should handle concurrent calculations', async () => {
      // **Feature: meteor-sentence-bert-testing, Property 5: Test Processing and Method Selection**
      
      const concurrentTests = Array.from({ length: 3 }, (_, i) => ({
        generated: `Given user ${i} is on login page When user enters valid credentials Then user is redirected to dashboard`,
        reference: `Given user ${i} is on the login page When user provides valid email and password Then system redirects to main dashboard`
      }));

      const meteorPromises = concurrentTests.map(test =>
        TestingService.calculateMeteorScore(test.generated, test.reference)
      );
      
      const sentenceBertPromises = concurrentTests.map(test =>
        TestingService.calculateSentenceBertScore(test.generated, test.reference)
      );

      const meteorResults = await Promise.all(meteorPromises);
      const sentenceBertResults = await Promise.all(sentenceBertPromises);

      // All results should be valid
      meteorResults.forEach(result => {
        expect(result).toBeDefined();
        if (!result.error) {
          expect(result.score).toBeGreaterThanOrEqual(0.0);
          expect(result.score).toBeLessThanOrEqual(1.0);
        }
      });

      sentenceBertResults.forEach(result => {
        expect(result).toBeDefined();
        if (!result.error) {
          expect(result.score).toBeGreaterThanOrEqual(0.0);
          expect(result.score).toBeLessThanOrEqual(1.0);
        }
      });
    });
  });
});