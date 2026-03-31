/**
 * METEOR Service for evaluating Gherkin scenario quality
 * METEOR (Metric for Evaluation of Translation with Explicit ORdering) 
 * adapted for Gherkin scenario quality assessment
 */
class MeteorService {
  constructor() {
    this.qualityThresholds = {
      excellent: 0.8,
      good: 0.6,
      fair: 0.4,
      poor: 0.0
    };
  }

  /**
   * Extract scenario text from parsed Gherkin for evaluation
   */
  extractScenarioText(parsedGherkin) {
    try {
      if (!parsedGherkin || !parsedGherkin.scenarios) {
        return '';
      }

      return parsedGherkin.scenarios
        .map(scenario => {
          const steps = scenario.steps || [];
          return steps.map(step => `${step.keyword} ${step.text}`).join(' ');
        })
        .join(' ');
    } catch (error) {
      console.warn('Error extracting scenario text:', error);
      return '';
    }
  }

  /**
   * Generate reference text based on scenario analysis
   */
  generateReferenceText(parsedGherkin) {
    try {
      // This is a simplified reference generation
      // In a real implementation, this would use more sophisticated NLP
      const scenarios = parsedGherkin.scenarios || [];
      
      return scenarios
        .map(scenario => {
          const steps = scenario.steps || [];
          
          // Generate ideal reference based on common Gherkin patterns
          const givenSteps = steps.filter(s => s.keyword?.toLowerCase().includes('given'));
          const whenSteps = steps.filter(s => s.keyword?.toLowerCase().includes('when'));
          const thenSteps = steps.filter(s => s.keyword?.toLowerCase().includes('then'));
          
          return `Given ${givenSteps.length} preconditions When ${whenSteps.length} actions Then ${thenSteps.length} outcomes`;
        })
        .join(' ');
    } catch (error) {
      console.warn('Error generating reference text:', error);
      return 'Given preconditions When actions Then outcomes';
    }
  }

  /**
   * Evaluate scenario quality using METEOR-inspired metrics
   */
  async evaluateScenario(candidateText, referenceText) {
    try {
      // Simplified METEOR calculation
      // In production, this would use proper METEOR implementation
      const candidate = candidateText.toLowerCase().split(/\s+/);
      const reference = referenceText.toLowerCase().split(/\s+/);
      
      // Calculate basic precision and recall
      const matches = candidate.filter(word => reference.includes(word));
      const precision = matches.length / candidate.length || 0;
      const recall = matches.length / reference.length || 0;
      
      // F-mean calculation with weighted formula: (10 * P * R) / (9P + R)
      const fmean = (9 * precision + recall) > 0 ? (10 * precision * recall) / (9 * precision + recall) : 0;
      
      // Simplified fragmentation penalty
      const fragmentationPenalty = Math.max(0, 1 - (matches.length / Math.min(candidate.length, reference.length)));
      
      // METEOR score (simplified)
      const meteorScore = Math.max(0, fmean - fragmentationPenalty);
      
      return {
        meteor_score: Number(meteorScore.toFixed(4)),
        precision: Number(precision.toFixed(4)),
        recall: Number(recall.toFixed(4)),
        fmean: Number(fmean.toFixed(4)),
        fragmentation_penalty: Number(fragmentationPenalty.toFixed(4))
      };
    } catch (error) {
      console.error('Error in METEOR evaluation:', error);
      return {
        meteor_score: 0,
        precision: 0,
        recall: 0,
        fmean: 0,
        fragmentation_penalty: 1
      };
    }
  }

  /**
   * Evaluate multiple scenarios in batch
   */
  async evaluateMultipleScenarios(candidates, references) {
    const results = [];
    for (let i = 0; i < candidates.length; i++) {
      const result = await this.evaluateScenario(candidates[i], references[i] || '');
      results.push(result);
    }
    return results;
  }

  /**
   * Get quality assessment based on METEOR score
   */
  getQualityAssessment(meteorScore) {
    if (meteorScore >= this.qualityThresholds.excellent) {
      return {
        level: 'excellent',
        description: 'High-quality scenario with excellent structure and clarity',
        recommendation: 'Scenario meets high quality standards'
      };
    } else if (meteorScore >= this.qualityThresholds.good) {
      return {
        level: 'good',
        description: 'Well-structured scenario with good clarity',
        recommendation: 'Minor improvements could enhance quality'
      };
    } else if (meteorScore >= this.qualityThresholds.fair) {
      return {
        level: 'fair',
        description: 'Acceptable scenario that could benefit from improvements',
        recommendation: 'Consider improving structure and clarity'
      };
    } else {
      return {
        level: 'poor',
        description: 'Scenario needs significant improvement in structure and clarity',
        recommendation: 'Requires major restructuring for better quality'
      };
    }
  }

  /**
   * Check if score meets quality threshold
   */
  meetsQualityThreshold(meteorScore) {
    return meteorScore >= this.qualityThresholds.good;
  }
}

export default MeteorService;