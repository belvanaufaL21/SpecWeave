import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestingService from '../testingService';

// Mock the API
vi.mock('../api.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

import api from '../api.js';

describe('TestingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateTestRequest', () => {
    it('validates valid test request', () => {
      const validRequest = {
        scenarioId: 'test-123',
        generatedText: 'Given test scenario',
        referenceText: 'Given reference scenario',
        testType: 'meteor'
      };

      const result = TestingService.validateTestRequest(validRequest);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates invalid test request - missing fields', () => {
      const invalidRequest = {
        scenarioId: '',
        generatedText: '',
        referenceText: '',
        testType: 'invalid'
      };

      const result = TestingService.validateTestRequest(invalidRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Scenario ID is required');
      expect(result.errors).toContain('Generated text is required');
      expect(result.errors).toContain('Reference text is required');
      expect(result.errors).toContain('Valid test type is required (meteor or sentence_bert)');
    });

    it('validates test type', () => {
      const request = {
        scenarioId: 'test-123',
        generatedText: 'Given test',
        referenceText: 'Given reference',
        testType: 'sentence_bert'
      };

      const result = TestingService.validateTestRequest(request);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('formatScore', () => {
    it('formats score correctly for METEOR', () => {
      const formatted = TestingService.formatScore(0.75, 'meteor');
      expect(formatted).toBe('75% (METEOR)');
    });

    it('formats score correctly for Sentence-BERT', () => {
      const formatted = TestingService.formatScore(0.85, 'sentence_bert');
      expect(formatted).toBe('85% (Sentence-BERT)');
    });

    it('handles invalid score', () => {
      const formatted = TestingService.formatScore(null, 'meteor');
      expect(formatted).toBe('N/A');
    });
  });

  describe('getQualityLevel', () => {
    it('returns excellent for high scores', () => {
      const quality = TestingService.getQualityLevel(0.85);
      expect(quality.label).toBe('Excellent');
      expect(quality.color).toBe('green');
    });

    it('returns good for medium-high scores', () => {
      const quality = TestingService.getQualityLevel(0.65);
      expect(quality.label).toBe('Good');
      expect(quality.color).toBe('blue');
    });

    it('returns fair for medium scores', () => {
      const quality = TestingService.getQualityLevel(0.45);
      expect(quality.label).toBe('Fair');
      expect(quality.color).toBe('yellow');
    });

    it('returns poor for low scores', () => {
      const quality = TestingService.getQualityLevel(0.25);
      expect(quality.label).toBe('Poor');
      expect(quality.color).toBe('red');
    });

    it('handles invalid score', () => {
      const quality = TestingService.getQualityLevel(null);
      expect(quality.label).toBe('Unknown');
      expect(quality.color).toBe('gray');
    });
  });

  describe('getTestTypeDisplayName', () => {
    it('returns correct display names', () => {
      expect(TestingService.getTestTypeDisplayName('meteor')).toBe('METEOR');
      expect(TestingService.getTestTypeDisplayName('sentence_bert')).toBe('Sentence-BERT');
      expect(TestingService.getTestTypeDisplayName('unknown')).toBe('unknown');
    });
  });

  describe('submitTest', () => {
    it('calls correct API endpoint for METEOR test', async () => {
      const mockResponse = { data: { success: true, result: { score: 0.75 } } };
      api.post.mockResolvedValue(mockResponse);

      const testRequest = {
        testType: 'meteor',
        scenarioId: 'test-123',
        generatedText: 'Generated text',
        referenceText: 'Reference text'
      };

      await TestingService.submitTest(testRequest);

      expect(api.post).toHaveBeenCalledWith('/testing/meteor', {
        scenarioId: 'test-123',
        generatedText: 'Generated text',
        referenceText: 'Reference text'
      });
    });

    it('calls correct API endpoint for Sentence-BERT test', async () => {
      const mockResponse = { data: { success: true, result: { score: 0.85 } } };
      api.post.mockResolvedValue(mockResponse);

      const testRequest = {
        testType: 'sentence_bert',
        scenarioId: 'test-123',
        generatedText: 'Generated text',
        referenceText: 'Reference text'
      };

      await TestingService.submitTest(testRequest);

      expect(api.post).toHaveBeenCalledWith('/testing/sentence-bert', {
        scenarioId: 'test-123',
        generatedText: 'Generated text',
        referenceText: 'Reference text'
      });
    });

    it('throws error for invalid test type', async () => {
      const testRequest = {
        testType: 'invalid',
        scenarioId: 'test-123',
        generatedText: 'Generated text',
        referenceText: 'Reference text'
      };

      await expect(TestingService.submitTest(testRequest)).rejects.toThrow('Tipe pengujian tidak valid: invalid');
    });
  });

  describe('formatTestResult', () => {
    it('formats test result correctly with saved testResult (authenticated)', () => {
      const apiResult = {
        testResult: {
          id: 'result-123',
          scenario_id: 'scenario-123',
          test_type: 'meteor',
          score: 0.75,
          test_details: { method: 'METEOR' },
          generated_text: 'Generated',
          reference_text: 'Reference',
          created_at: '2024-01-01T00:00:00Z'
        },
        meteorMetrics: {
          score: 0.75,
          details: { method: 'METEOR' }
        }
      };

      const formatted = TestingService.formatTestResult(apiResult);

      expect(formatted).toEqual({
        id: 'result-123',
        scenarioId: 'scenario-123',
        testType: 'meteor',
        score: 0.75,
        details: { method: 'METEOR' },
        detailed_metrics: { method: 'METEOR' },
        generatedText: 'Generated',
        referenceText: 'Reference',
        createdAt: '2024-01-01T00:00:00Z',
        formattedScore: '75% (METEOR)',
        qualityLevel: { label: 'Good', color: 'blue' }
      });
    });

    it('formats test result correctly with meteorMetrics only (unauthenticated)', () => {
      const apiResult = {
        testResult: null,
        meteorMetrics: {
          score: 0.85,
          details: { method: 'METEOR', precision: 0.9, recall: 0.8 }
        }
      };

      const formatted = TestingService.formatTestResult(apiResult);

      expect(formatted).toEqual(expect.objectContaining({
        id: null,
        scenarioId: null,
        testType: 'meteor',
        score: 0.85,
        details: { method: 'METEOR', precision: 0.9, recall: 0.8 },
        detailed_metrics: { method: 'METEOR', precision: 0.9, recall: 0.8 },
        generatedText: null,
        referenceText: null,
        formattedScore: '85% (METEOR)',
        qualityLevel: { label: 'Excellent', color: 'green' }
      }));
      
      // Check that createdAt is a valid ISO string
      expect(formatted.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('formats test result correctly with sentenceBertMetrics only (unauthenticated)', () => {
      const apiResult = {
        testResult: null,
        sentenceBertMetrics: {
          score: 0.92,
          details: { method: 'Sentence-BERT', similarity: 0.92 }
        }
      };

      const formatted = TestingService.formatTestResult(apiResult);

      expect(formatted).toEqual(expect.objectContaining({
        id: null,
        scenarioId: null,
        testType: 'sentence_bert',
        score: 0.92,
        details: { method: 'Sentence-BERT', similarity: 0.92 },
        detailed_metrics: { method: 'Sentence-BERT', similarity: 0.92 },
        generatedText: null,
        referenceText: null,
        formattedScore: '92% (Sentence-BERT)',
        qualityLevel: { label: 'Excellent', color: 'green' }
      }));
    });

    it('handles null result', () => {
      const formatted = TestingService.formatTestResult(null);
      expect(formatted).toBeNull();
    });

    it('handles result without testResult or metrics', () => {
      const formatted = TestingService.formatTestResult({});
      expect(formatted).toBeNull();
    });
  });
});