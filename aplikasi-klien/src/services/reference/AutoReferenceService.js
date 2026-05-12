import { referenceService } from './ReferenceService';

/**
 * Service untuk menganalisis pola reference dan menggunakan LLM untuk generate scenario
 * Menggantikan sistem manual selection dengan analisis otomatis
 */
class AutoReferenceService {
  constructor() {
    this.patternCache = new Map();
    this.lastCacheUpdate = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 menit
  }

  /**
   * Analisis pola dari semua reference yang ada
   */
  async analyzeReferencePatterns() {
    try {
      
      // Check cache first
      if (this.patternCache.size > 0 && 
          this.lastCacheUpdate && 
          Date.now() - this.lastCacheUpdate < this.CACHE_DURATION) {
        
        return Array.from(this.patternCache.values());
      }

      // Get all references
      const result = await referenceService.getReferences();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch references');
      }

      const references = result.data || [];
      
      // Clear cache
      this.patternCache.clear();

      // Analyze patterns by category and common structures
      const patterns = this.extractPatterns(references);
      
      // Cache patterns
      patterns.forEach((pattern, index) => {
        this.patternCache.set(`pattern_${index}`, pattern);
      });
      this.lastCacheUpdate = Date.now();

      return patterns;

    } catch (error) {
      console.error('❌ [AUTO-REFERENCE] Error analyzing patterns:', error);
      return [];
    }
  }

  /**
   * Extract patterns dari references
   */
  extractPatterns(references) {
    const patterns = [];
    const categoryGroups = {};
    const structureGroups = {};
    const usedReferenceIds = new Set(); // Track which references have been used

    // Shuffle references untuk diversifikasi
    const shuffledReferences = this.shuffleArray([...references]);

    // Group by category
    shuffledReferences.forEach(ref => {
      const category = ref.category || 'general';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(ref);
    });

    // Extract category-based patterns
    Object.entries(categoryGroups).forEach(([category, refs]) => {
      if (refs.length > 0) {
        const pattern = this.extractCategoryPattern(category, refs, usedReferenceIds);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    });

    // Extract structure-based patterns
    shuffledReferences.forEach(ref => {
      const structure = this.analyzeGherkinStructure(ref.gherkinContent);
      const structureKey = this.getStructureKey(structure);
      
      if (!structureGroups[structureKey]) {
        structureGroups[structureKey] = [];
      }
      structureGroups[structureKey].push(ref);
    });

    // Add structure patterns
    Object.entries(structureGroups).forEach(([structureKey, refs]) => {
      if (refs.length >= 2) { // Only if pattern appears multiple times
        const pattern = this.extractStructurePattern(structureKey, refs, usedReferenceIds);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    });

    return patterns;
  }

  /**
   * Shuffle array untuk randomisasi
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Extract pattern berdasarkan kategori
   */
  extractCategoryPattern(category, references, usedReferenceIds = new Set()) {
    const commonGivenSteps = this.findCommonSteps(references, 'given');
    const commonWhenSteps = this.findCommonSteps(references, 'when');
    const commonThenSteps = this.findCommonSteps(references, 'then');

    // Pilih references yang belum digunakan, atau gunakan semua jika semua sudah digunakan
    const availableRefs = references.filter(ref => !usedReferenceIds.has(ref.id));
    const refsToUse = availableRefs.length > 0 ? availableRefs : references;
    
    // Ambil maksimal 2 examples per pattern untuk menghindari duplikasi
    const selectedExamples = refsToUse.slice(0, 2).map(ref => {
      usedReferenceIds.add(ref.id); // Mark as used
      return {
        id: ref.id,  // IMPORTANT: Include ID for tracking
        title: ref.title,
        gherkinContent: ref.gherkinContent
      };
    });

    return {
      type: 'category',
      category: category,
      weight: references.length,
      commonPatterns: {
        given: commonGivenSteps,
        when: commonWhenSteps,
        then: commonThenSteps
      },
      examples: selectedExamples,
      usage: {
        totalUsage: references.reduce((sum, ref) => sum + (ref.usageCount || 0), 0),
        averageScore: this.calculateAverageScore(references)
      }
    };
  }

  /**
   * Extract pattern berdasarkan struktur
   */
  extractStructurePattern(structureKey, references, usedReferenceIds = new Set()) {
    const structure = this.parseStructureKey(structureKey);
    
    // Pilih references yang belum digunakan
    const availableRefs = references.filter(ref => !usedReferenceIds.has(ref.id));
    const refsToUse = availableRefs.length > 0 ? availableRefs : references;
    
    // Ambil maksimal 1 example per structure pattern
    const selectedExamples = refsToUse.slice(0, 1).map(ref => {
      usedReferenceIds.add(ref.id); // Mark as used
      return {
        id: ref.id,  // IMPORTANT: Include ID for tracking
        title: ref.title,
        gherkinContent: ref.gherkinContent,
        category: ref.category
      };
    });
    
    return {
      type: 'structure',
      structure: structure,
      weight: references.length,
      examples: selectedExamples,
      usage: {
        totalUsage: references.reduce((sum, ref) => sum + (ref.usageCount || 0), 0),
        averageScore: this.calculateAverageScore(references)
      }
    };
  }

  /**
   * Analisis struktur Gherkin
   */
  analyzeGherkinStructure(gherkinContent) {
    const lines = gherkinContent.split('\n').map(line => line.trim()).filter(line => line);
    const structure = {
      givenCount: 0,
      whenCount: 0,
      thenCount: 0,
      hasAnd: false,
      hasBackground: false
    };

    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('given ')) {
        structure.givenCount++;
      } else if (lowerLine.startsWith('when ')) {
        structure.whenCount++;
      } else if (lowerLine.startsWith('then ')) {
        structure.thenCount++;
      } else if (lowerLine.startsWith('and ')) {
        structure.hasAnd = true;
      } else if (lowerLine.startsWith('background:')) {
        structure.hasBackground = true;
      }
    });

    return structure;
  }

  /**
   * Generate structure key untuk grouping
   */
  getStructureKey(structure) {
    return `g${structure.givenCount}_w${structure.whenCount}_t${structure.thenCount}_${structure.hasAnd ? 'and' : 'noand'}`;
  }

  /**
   * Parse structure key kembali ke object
   */
  parseStructureKey(structureKey) {
    const parts = structureKey.split('_');
    return {
      givenCount: parseInt(parts[0].substring(1)),
      whenCount: parseInt(parts[1].substring(1)),
      thenCount: parseInt(parts[2].substring(1)),
      hasAnd: parts[3] === 'and'
    };
  }

  /**
   * Find common steps dalam references
   */
  findCommonSteps(references, stepType) {
    const stepCounts = {};
    
    references.forEach(ref => {
      const steps = this.extractSteps(ref.gherkinContent, stepType);
      steps.forEach(step => {
        const normalizedStep = this.normalizeStep(step);
        stepCounts[normalizedStep] = (stepCounts[normalizedStep] || 0) + 1;
      });
    });

    // Return steps that appear in at least 30% of references
    const threshold = Math.max(1, Math.floor(references.length * 0.3));
    return Object.entries(stepCounts)
      .filter(([step, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([step, count]) => ({
        step,
        frequency: count,
        percentage: (count / references.length * 100).toFixed(1)
      }));
  }

  /**
   * Extract steps berdasarkan type (given/when/then)
   */
  extractSteps(gherkinContent, stepType) {
    const lines = gherkinContent.split('\n').map(line => line.trim()).filter(line => line);
    const steps = [];
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith(`${stepType} `)) {
        steps.push(line.substring(stepType.length + 1).trim());
      }
    });

    return steps;
  }

  /**
   * Normalize step untuk comparison
   */
  normalizeStep(step) {
    return step
      .toLowerCase()
      .replace(/["'][^"']*["']/g, '"VALUE"') // Replace quoted values
      .replace(/\d+/g, 'NUMBER') // Replace numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate average score dari references
   */
  calculateAverageScore(references) {
    const scoresWithValues = references.filter(ref => ref.averageScore != null);
    if (scoresWithValues.length === 0) return null;
    
    const sum = scoresWithValues.reduce((sum, ref) => sum + ref.averageScore, 0);
    return sum / scoresWithValues.length;
  }

  /**
   * Generate scenario berdasarkan user story dan patterns
   */
  async generateScenarioFromUserStory(userStory, options = {}) {
    try {
      
      // Get all references directly
      const result = await referenceService.getReferences();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch references');
      }

      const allReferences = result.data || [];
      
      if (allReferences.length === 0) {
        console.warn('⚠️ [AUTO-REFERENCE] No references found, using basic generation');
        return this.generateBasicScenario(userStory);
      }

      // Shuffle all references untuk randomisasi
      const shuffledReferences = this.shuffleArray([...allReferences]);
      
      // Ambil maksimal 5 references, atau semua jika kurang dari 5
      const maxReferences = Math.min(shuffledReferences.length, 5);
      const selectedReferences = shuffledReferences.slice(0, maxReferences);
      
      // Buat pattern sederhana dengan selected references
      const patterns = [{
        type: 'random-selection',
        examples: selectedReferences.map(ref => ({
          id: ref.id,  // IMPORTANT: Include ID for tracking
          title: ref.title,
          gherkinContent: ref.gherkinContent
        })),
        weight: selectedReferences.length
      }];
      
      console.log('📝 [AUTO-REFERENCE] Selected references for few-shot:', {
        totalAvailable: allReferences.length,
        selected: selectedReferences.length,
        selectedTitles: selectedReferences.map(r => r.title)
      });

      return {
        success: true,
        prompt: userStory, // Return original user story, backend will handle few-shot
        patterns: patterns,
        meta: {
          totalReferences: allReferences.length,
          selectedReferences: selectedReferences.length,
          generationType: 'random-few-shot'
        }
      };

    } catch (error) {
      console.error('❌ [AUTO-REFERENCE] Error generating scenario:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.generateBasicScenario(userStory)
      };
    }
  }

  /**
   * Select patterns yang paling relevan dengan user story
   */
  selectRelevantPatterns(userStory, patterns) {
    const userStoryLower = userStory.toLowerCase();
    const scoredPatterns = [];

    patterns.forEach(pattern => {
      let score = 0;
      
      // Score berdasarkan kategori
      if (pattern.type === 'category') {
        const categoryKeywords = this.getCategoryKeywords(pattern.category);
        categoryKeywords.forEach(keyword => {
          if (userStoryLower.includes(keyword)) {
            score += 10;
          }
        });
      }

      // Score berdasarkan usage dan quality
      if (pattern.usage) {
        score += Math.min(pattern.usage.totalUsage || 0, 50); // Max 50 points
        if (pattern.usage.averageScore) {
          score += pattern.usage.averageScore * 20; // Max 20 points
        }
      }

      // Score berdasarkan weight (jumlah references)
      score += Math.min(pattern.weight || 0, 30); // Max 30 points

      // Score berdasarkan kesamaan dengan examples
      if (pattern.examples) {
        pattern.examples.forEach(example => {
          const similarity = this.calculateTextSimilarity(userStory, example.title);
          score += similarity * 15; // Max 15 points per example
        });
      }

      if (score > 0) {
        scoredPatterns.push({
          ...pattern,
          relevanceScore: score
        });
      }
    });

    // Sort by relevance score and return top patterns
    return scoredPatterns
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Top 5 most relevant patterns
  }

  /**
   * Get keywords untuk kategori
   */
  getCategoryKeywords(category) {
    const keywords = {
      'authentication': ['login', 'auth', 'sign in', 'password', 'user', 'account'],
      'form': ['form', 'input', 'submit', 'validation', 'field'],
      'api': ['api', 'service', 'request', 'response', 'data', 'fetch'],
      'search': ['search', 'find', 'filter', 'query', 'result'],
      'registration': ['register', 'signup', 'create account', 'sign up'],
      'ecommerce': ['product', 'cart', 'order', 'payment', 'buy', 'purchase'],
      'general': []
    };

    return keywords[category] || [];
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Create prompt dengan patterns untuk LLM
   */
  createPromptWithPatterns(userStory, patterns, options = {}) {
    let prompt = `Generate a Gherkin scenario based on the following user story and reference patterns:\n\n`;
    prompt += `USER STORY:\n${userStory}\n\n`;

    if (patterns.length > 0) {
      prompt += `REFERENCE PATTERNS (use these as guidance):\n\n`;
      
      patterns.forEach((pattern, index) => {
        prompt += `Pattern ${index + 1} (${pattern.type}, relevance: ${pattern.relevanceScore?.toFixed(1) || 'N/A'}):\n`;
        
        if (pattern.type === 'category') {
          prompt += `Category: ${pattern.category}\n`;
          if (pattern.commonPatterns) {
            if (pattern.commonPatterns.given?.length > 0) {
              prompt += `Common Given steps: ${pattern.commonPatterns.given.map(p => p.step).join(', ')}\n`;
            }
            if (pattern.commonPatterns.when?.length > 0) {
              prompt += `Common When steps: ${pattern.commonPatterns.when.map(p => p.step).join(', ')}\n`;
            }
            if (pattern.commonPatterns.then?.length > 0) {
              prompt += `Common Then steps: ${pattern.commonPatterns.then.map(p => p.step).join(', ')}\n`;
            }
          }
        }

        if (pattern.examples?.length > 0) {
          prompt += `Example:\n${pattern.examples[0].gherkinContent}\n`;
        }
        
        prompt += `\n`;
      });
    }

    prompt += `INSTRUCTIONS:\n`;
    prompt += `1. Create a comprehensive Gherkin scenario that follows the patterns above\n`;
    prompt += `2. Use Indonesian language for the steps\n`;
    prompt += `3. Include Feature description and Scenario title\n`;
    prompt += `4. Follow Given-When-Then structure\n`;
    prompt += `5. Make it specific and testable\n`;
    
    if (options.includeBackground) {
      prompt += `6. Include Background section if needed\n`;
    }
    
    if (options.multipleScenarios) {
      prompt += `7. Generate multiple scenarios if the user story is complex\n`;
    }

    return prompt;
  }

  /**
   * Generate basic scenario tanpa patterns (fallback)
   */
  generateBasicScenario(userStory) {
    return {
      success: true,
      prompt: `Generate a Gherkin scenario for this user story:\n\n${userStory}\n\nUse Indonesian language and follow Given-When-Then structure.`,
      patterns: [],
      meta: {
        patternCount: 0,
        relevantPatternCount: 0,
        generationType: 'basic'
      }
    };
  }

  /**
   * Clear pattern cache (untuk testing atau refresh)
   */
  clearCache() {
    this.patternCache.clear();
    this.lastCacheUpdate = null;
    console.log('🗑️ [AUTO-REFERENCE] Pattern cache cleared');
  }
}

export const autoReferenceService = new AutoReferenceService();
export default autoReferenceService;