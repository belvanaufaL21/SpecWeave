import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import supabaseService from './supabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced METEOR Evaluation Service
 * Provides detailed, component-level METEOR evaluation for interactive testing
 */
class EnhancedMeteorService {
  constructor() {
    this.pythonPath = 'python';
    this.scriptPath = path.join(__dirname, '../../../skrip-utilitas/enhanced_meteor_evaluator.py');
    this.supabase = supabaseService.admin; // Use admin client for database operations
    
    console.log("🚀 Enhanced METEOR Service initialized");
    console.log("📍 Python script path:", this.scriptPath);
  }

  /**
   * Evaluate a single scenario with detailed breakdown
   * @param {string} generatedScenario - Generated Gherkin scenario text
   * @param {string} referenceScenario - User-provided reference scenario
   * @param {Object} options - Evaluation options
   * @returns {Promise<Object>} Detailed METEOR evaluation results
   */
  async evaluateScenarioDetailed(generatedScenario, referenceScenario, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      console.log("🔍 Enhanced METEOR: Starting detailed evaluation...");
      
      try {
        const inputData = JSON.stringify({
          generated: generatedScenario,
          reference: referenceScenario,
          options: {
            includeWordAlignment: true,
            includeComponentBreakdown: true,
            includeSimilarityMatrix: true,
            ...options
          }
        });

        const pythonProcess = spawn(this.pythonPath, [this.scriptPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          const evaluationTime = Date.now() - startTime;
          
          if (code !== 0) {
            console.error('Enhanced METEOR evaluation failed:', stderr);
            reject(new Error(`Enhanced METEOR evaluation failed: ${stderr}`));
            return;
          }

          try {
            const result = JSON.parse(stdout);
            
            // Enhance result with additional metadata
            const enhancedResult = {
              ...result,
              evaluation_metadata: {
                evaluation_time_ms: evaluationTime,
                timestamp: new Date().toISOString(),
                service_version: '2.0.0',
                evaluation_type: 'detailed_interactive'
              },
              comparison_report: this.generateComparisonReport(result, generatedScenario, referenceScenario),
              improvement_suggestions: this.generateImprovementSuggestions(result, generatedScenario, referenceScenario)
            };
            
            console.log(`✅ Enhanced METEOR completed in ${evaluationTime}ms, score: ${result.meteor_score}`);
            resolve(enhancedResult);
          } catch (parseError) {
            console.error('Failed to parse enhanced METEOR result:', parseError);
            reject(new Error(`Failed to parse result: ${parseError.message}`));
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('Failed to start enhanced METEOR process:', error);
          reject(new Error(`Failed to start evaluation: ${error.message}`));
        });

        pythonProcess.stdin.write(inputData);
        pythonProcess.stdin.end();

      } catch (error) {
        console.error('Enhanced METEOR evaluation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate detailed comparison report
   * @param {Object} meteorResult - Raw METEOR evaluation result
   * @param {string} generated - Generated scenario text
   * @param {string} reference - Reference scenario text
   * @returns {Object} Detailed comparison report
   */
  generateComparisonReport(meteorResult, generated, reference) {
    const generatedWords = this.tokenizeScenario(generated);
    const referenceWords = this.tokenizeScenario(reference);
    
    return {
      overall_similarity: meteorResult.meteor_score,
      structural_similarity: this.calculateStructuralSimilarity(generated, reference),
      vocabulary_similarity: this.calculateVocabularySimilarity(generatedWords, referenceWords),
      word_matches: this.analyzeWordMatches(meteorResult.word_alignment || [], generatedWords, referenceWords),
      missing_elements: this.findMissingElements(generatedWords, referenceWords),
      extra_elements: this.findExtraElements(generatedWords, referenceWords),
      gherkin_structure_analysis: this.analyzeGherkinStructure(generated, reference)
    };
  }

  /**
   * Generate improvement suggestions based on evaluation results
   * @param {Object} meteorResult - METEOR evaluation result
   * @param {string} generated - Generated scenario text
   * @param {string} reference - Reference scenario text
   * @returns {Array} Array of improvement suggestions
   */
  generateImprovementSuggestions(meteorResult, generated, reference) {
    const suggestions = [];
    const score = meteorResult.meteor_score;

    // Score-based suggestions
    if (score < 0.3) {
      suggestions.push({
        type: 'critical',
        category: 'overall_quality',
        title: 'Significant Quality Issues Detected',
        description: 'The generated scenario has substantial differences from the reference. Consider regenerating with more specific prompts.',
        priority: 'high',
        actionable_steps: [
          'Review the user story for clarity and completeness',
          'Provide more specific context in the prompt',
          'Consider breaking down complex scenarios into smaller parts'
        ]
      });
    } else if (score < 0.5) {
      suggestions.push({
        type: 'improvement',
        category: 'structure',
        title: 'Structure and Content Improvements Needed',
        description: 'The scenario structure or content could be improved to better match the reference.',
        priority: 'medium',
        actionable_steps: [
          'Review Given-When-Then structure for completeness',
          'Ensure all key elements from the reference are covered',
          'Check for proper Gherkin syntax and formatting'
        ]
      });
    }

    // Structural analysis suggestions
    const structuralIssues = this.analyzeStructuralIssues(generated, reference);
    if (structuralIssues.length > 0) {
      suggestions.push({
        type: 'structural',
        category: 'gherkin_structure',
        title: 'Gherkin Structure Issues',
        description: 'Issues found in the Gherkin scenario structure.',
        priority: 'medium',
        issues: structuralIssues,
        actionable_steps: [
          'Ensure proper Given-When-Then format',
          'Add missing scenario components',
          'Improve step clarity and specificity'
        ]
      });
    }

    // Vocabulary suggestions
    if (meteorResult.precision < 0.6) {
      suggestions.push({
        type: 'vocabulary',
        category: 'word_choice',
        title: 'Vocabulary and Terminology',
        description: 'Consider using more precise terminology that matches the reference.',
        priority: 'low',
        actionable_steps: [
          'Use domain-specific terminology consistently',
          'Match the vocabulary style of the reference',
          'Ensure technical terms are used correctly'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Tokenize scenario text for analysis
   * @param {string} text - Scenario text
   * @returns {Array} Array of tokens
   */
  tokenizeScenario(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Calculate structural similarity between scenarios
   * @param {string} generated - Generated scenario
   * @param {string} reference - Reference scenario
   * @returns {number} Structural similarity score (0-1)
   */
  calculateStructuralSimilarity(generated, reference) {
    const genStructure = this.extractGherkinStructure(generated);
    const refStructure = this.extractGherkinStructure(reference);
    
    let matches = 0;
    let total = Math.max(genStructure.length, refStructure.length);
    
    for (let i = 0; i < Math.min(genStructure.length, refStructure.length); i++) {
      if (genStructure[i].type === refStructure[i].type) {
        matches++;
      }
    }
    
    return total > 0 ? matches / total : 0;
  }

  /**
   * Calculate vocabulary similarity
   * @param {Array} generatedWords - Generated scenario words
   * @param {Array} referenceWords - Reference scenario words
   * @returns {number} Vocabulary similarity score (0-1)
   */
  calculateVocabularySimilarity(generatedWords, referenceWords) {
    const genSet = new Set(generatedWords);
    const refSet = new Set(referenceWords);
    const intersection = new Set([...genSet].filter(x => refSet.has(x)));
    const union = new Set([...genSet, ...refSet]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Analyze word matches from METEOR alignment
   * @param {Array} alignment - Word alignment from METEOR
   * @param {Array} generatedWords - Generated words
   * @param {Array} referenceWords - Reference words
   * @returns {Array} Word match analysis
   */
  analyzeWordMatches(alignment, generatedWords, referenceWords) {
    const matches = [];
    
    // If no alignment provided, create basic matching
    if (!alignment || alignment.length === 0) {
      generatedWords.forEach((genWord, genIndex) => {
        const refIndex = referenceWords.indexOf(genWord);
        if (refIndex !== -1) {
          matches.push({
            generated_word: genWord,
            reference_word: genWord,
            similarity: 1.0,
            match_type: 'exact',
            position: { generated: genIndex, reference: refIndex }
          });
        }
      });
    } else {
      // Use provided alignment
      alignment.forEach(align => {
        matches.push({
          generated_word: align.generated || '',
          reference_word: align.reference || '',
          similarity: align.similarity || 0,
          match_type: align.similarity === 1.0 ? 'exact' : align.similarity > 0.7 ? 'similar' : 'different',
          position: align.position || { generated: 0, reference: 0 }
        });
      });
    }
    
    return matches;
  }

  /**
   * Find missing elements in generated scenario
   * @param {Array} generatedWords - Generated words
   * @param {Array} referenceWords - Reference words
   * @returns {Array} Missing elements
   */
  findMissingElements(generatedWords, referenceWords) {
    const genSet = new Set(generatedWords);
    return referenceWords.filter(word => !genSet.has(word));
  }

  /**
   * Find extra elements in generated scenario
   * @param {Array} generatedWords - Generated words
   * @param {Array} referenceWords - Reference words
   * @returns {Array} Extra elements
   */
  findExtraElements(generatedWords, referenceWords) {
    const refSet = new Set(referenceWords);
    return generatedWords.filter(word => !refSet.has(word));
  }

  /**
   * Extract Gherkin structure from scenario text
   * @param {string} text - Scenario text
   * @returns {Array} Gherkin structure elements
   */
  extractGherkinStructure(text) {
    const structure = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    lines.forEach(line => {
      if (line.match(/^(given|ketika|when|then|maka|and|dan)/i)) {
        const type = line.match(/^(given|ketika|when|then|maka|and|dan)/i)[1].toLowerCase();
        structure.push({
          type: this.normalizeGherkinKeyword(type),
          content: line,
          length: line.length
        });
      }
    });
    
    return structure;
  }

  /**
   * Normalize Gherkin keywords to English
   * @param {string} keyword - Gherkin keyword
   * @returns {string} Normalized keyword
   */
  normalizeGherkinKeyword(keyword) {
    const mapping = {
      'given': 'given',
      'ketika': 'when',
      'when': 'when',
      'then': 'then',
      'maka': 'then',
      'and': 'and',
      'dan': 'and'
    };
    return mapping[keyword.toLowerCase()] || keyword;
  }

  /**
   * Analyze Gherkin structure between scenarios
   * @param {string} generated - Generated scenario
   * @param {string} reference - Reference scenario
   * @returns {Object} Structure analysis
   */
  analyzeGherkinStructure(generated, reference) {
    const genStructure = this.extractGherkinStructure(generated);
    const refStructure = this.extractGherkinStructure(reference);
    
    return {
      generated_steps: genStructure.length,
      reference_steps: refStructure.length,
      structure_match: genStructure.length === refStructure.length,
      missing_step_types: this.findMissingStepTypes(genStructure, refStructure),
      extra_step_types: this.findExtraStepTypes(genStructure, refStructure),
      step_order_match: this.compareStepOrder(genStructure, refStructure)
    };
  }

  /**
   * Find missing step types
   * @param {Array} genStructure - Generated structure
   * @param {Array} refStructure - Reference structure
   * @returns {Array} Missing step types
   */
  findMissingStepTypes(genStructure, refStructure) {
    const genTypes = new Set(genStructure.map(step => step.type));
    const refTypes = new Set(refStructure.map(step => step.type));
    return [...refTypes].filter(type => !genTypes.has(type));
  }

  /**
   * Find extra step types
   * @param {Array} genStructure - Generated structure
   * @param {Array} refStructure - Reference structure
   * @returns {Array} Extra step types
   */
  findExtraStepTypes(genStructure, refStructure) {
    const genTypes = new Set(genStructure.map(step => step.type));
    const refTypes = new Set(refStructure.map(step => step.type));
    return [...genTypes].filter(type => !refTypes.has(type));
  }

  /**
   * Compare step order between structures
   * @param {Array} genStructure - Generated structure
   * @param {Array} refStructure - Reference structure
   * @returns {boolean} Whether step order matches
   */
  compareStepOrder(genStructure, refStructure) {
    if (genStructure.length !== refStructure.length) return false;
    
    for (let i = 0; i < genStructure.length; i++) {
      if (genStructure[i].type !== refStructure[i].type) {
        return false;
      }
    }
    return true;
  }

  /**
   * Analyze structural issues in generated scenario
   * @param {string} generated - Generated scenario
   * @param {string} reference - Reference scenario
   * @returns {Array} Array of structural issues
   */
  analyzeStructuralIssues(generated, reference) {
    const issues = [];
    const genStructure = this.extractGherkinStructure(generated);
    const refStructure = this.extractGherkinStructure(reference);
    
    // Check for missing Given-When-Then
    const genTypes = new Set(genStructure.map(step => step.type));
    const requiredTypes = ['given', 'when', 'then'];
    
    requiredTypes.forEach(type => {
      if (!genTypes.has(type)) {
        issues.push({
          type: 'missing_step',
          severity: 'high',
          description: `Missing ${type.toUpperCase()} step in scenario`,
          suggestion: `Add a ${type.toUpperCase()} step to complete the scenario structure`
        });
      }
    });
    
    // Check for proper step order
    if (!this.compareStepOrder(genStructure, refStructure)) {
      issues.push({
        type: 'step_order',
        severity: 'medium',
        description: 'Step order differs from reference scenario',
        suggestion: 'Consider reordering steps to match the reference structure'
      });
    }
    
    return issues;
  }

  /**
   * Validate Gherkin syntax
   * @param {string} scenarioText - Scenario text to validate
   * @returns {Object} Validation result
   */
  validateGherkinSyntax(scenarioText) {
    const errors = [];
    const warnings = [];
    
    // Basic Gherkin validation
    const lines = scenarioText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let hasGiven = false;
    let hasWhen = false;
    let hasThen = false;
    
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.startsWith('given') || lowerLine.startsWith('ketika')) {
        hasGiven = true;
      } else if (lowerLine.startsWith('when') || lowerLine.startsWith('ketika')) {
        hasWhen = true;
      } else if (lowerLine.startsWith('then') || lowerLine.startsWith('maka')) {
        hasThen = true;
      } else if (!lowerLine.startsWith('and') && !lowerLine.startsWith('dan') && 
                 !lowerLine.startsWith('feature') && !lowerLine.startsWith('scenario')) {
        warnings.push({
          line: index + 1,
          message: 'Line does not start with a recognized Gherkin keyword',
          suggestion: 'Ensure all steps start with Given, When, Then, or And'
        });
      }
    });
    
    if (!hasGiven) {
      errors.push({
        type: 'missing_given',
        message: 'Scenario is missing a Given step',
        suggestion: 'Add a Given step to establish the initial context'
      });
    }
    
    if (!hasWhen) {
      errors.push({
        type: 'missing_when',
        message: 'Scenario is missing a When step',
        suggestion: 'Add a When step to describe the action being tested'
      });
    }
    
    if (!hasThen) {
      errors.push({
        type: 'missing_then',
        message: 'Scenario is missing a Then step',
        suggestion: 'Add a Then step to describe the expected outcome'
      });
    }
    
    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      structure_analysis: {
        has_given: hasGiven,
        has_when: hasWhen,
        has_then: hasThen,
        total_lines: lines.length
      }
    };
  }
}

export default EnhancedMeteorService;