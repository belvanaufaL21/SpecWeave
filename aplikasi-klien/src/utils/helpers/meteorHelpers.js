import { METEOR_CONSTANTS } from '../constants/meteorConstants';

/**
 * Helper functions untuk METEOR Analysis
 */

/**
 * Analisis perbedaan struktural antara ground truth dan generated text
 */
export function analyzeStructuralDifferences(groundTruth, generated) {
  const differences = {
    missingSteps: [],
    extraSteps: [],
    structuralIssues: []
  };

  // Basic structural analysis
  const gtLines = groundTruth.split('\n').filter(line => line.trim());
  const genLines = generated.split('\n').filter(line => line.trim());

  // Check for basic Gherkin structure
  const hasFeature = generated.includes(METEOR_CONSTANTS.GHERKIN_STRUCTURE.FEATURE);
  const hasScenario = generated.includes(METEOR_CONSTANTS.GHERKIN_STRUCTURE.SCENARIO);
  const hasGiven = generated.includes(METEOR_CONSTANTS.GHERKIN_STRUCTURE.GIVEN);
  const hasWhen = generated.includes(METEOR_CONSTANTS.GHERKIN_STRUCTURE.WHEN);
  const hasThen = generated.includes(METEOR_CONSTANTS.GHERKIN_STRUCTURE.THEN);

  if (!hasFeature) differences.structuralIssues.push('Missing Feature declaration');
  if (!hasScenario) differences.structuralIssues.push('Missing Scenario declaration');
  if (!hasGiven) differences.structuralIssues.push('Missing Given steps');
  if (!hasWhen) differences.structuralIssues.push('Missing When steps');
  if (!hasThen) differences.structuralIssues.push('Missing Then steps');

  return differences;
}

/**
 * Dapatkan insight kualitas berdasarkan skor METEOR
 */
export function getQualityInsight(meteorScore) {
  const { QUALITY_THRESHOLDS, QUALITY_LEVELS, QUALITY_COLORS, QUALITY_MESSAGES, RECOMMENDATIONS } = METEOR_CONSTANTS;

  if (meteorScore >= QUALITY_THRESHOLDS.EXCELLENT) {
    return {
      level: QUALITY_LEVELS.EXCELLENT,
      message: QUALITY_MESSAGES.EXCELLENT,
      color: QUALITY_COLORS.EXCELLENT,
      recommendations: RECOMMENDATIONS.EXCELLENT
    };
  } else if (meteorScore >= QUALITY_THRESHOLDS.GOOD) {
    return {
      level: QUALITY_LEVELS.GOOD,
      message: QUALITY_MESSAGES.GOOD,
      color: QUALITY_COLORS.GOOD,
      recommendations: RECOMMENDATIONS.GOOD
    };
  } else if (meteorScore >= QUALITY_THRESHOLDS.FAIR) {
    return {
      level: QUALITY_LEVELS.FAIR,
      message: QUALITY_MESSAGES.FAIR,
      color: QUALITY_COLORS.FAIR,
      recommendations: RECOMMENDATIONS.FAIR
    };
  } else {
    return {
      level: QUALITY_LEVELS.POOR,
      message: QUALITY_MESSAGES.POOR,
      color: QUALITY_COLORS.POOR,
      recommendations: RECOMMENDATIONS.POOR
    };
  }
}

/**
 * Interpretasi metrik berdasarkan nilai
 */
function interpretMetric(value, metricType) {
  const { METRIC_THRESHOLDS, METRIC_INTERPRETATIONS } = METEOR_CONSTANTS;
  
  if (value >= METRIC_THRESHOLDS.HIGH) {
    return METRIC_INTERPRETATIONS[metricType].HIGH;
  } else if (value >= METRIC_THRESHOLDS.MEDIUM) {
    return METRIC_INTERPRETATIONS[metricType].MEDIUM;
  } else {
    return METRIC_INTERPRETATIONS[metricType].LOW;
  }
}

/**
 * Format laporan analisis lengkap
 */
export function formatAnalysisReport(groundTruth, generated, meteorMetrics) {
  const insight = getQualityInsight(meteorMetrics.meteorScore);
  const structural = analyzeStructuralDifferences(groundTruth, generated);

  return {
    summary: `Skor METEOR ${(meteorMetrics.meteorScore * 100).toFixed(1)}% menunjukkan kualitas ${insight.level}.`,
    insight,
    structural,
    metrics: {
      precision: {
        value: meteorMetrics.precision,
        interpretation: interpretMetric(meteorMetrics.precision, 'PRECISION')
      },
      recall: {
        value: meteorMetrics.recall,
        interpretation: interpretMetric(meteorMetrics.recall, 'RECALL')
      },
      fScore: {
        value: meteorMetrics.fScore,
        interpretation: interpretMetric(meteorMetrics.fScore, 'F_SCORE')
      }
    }
  };
}

/**
 * Validasi struktur Gherkin
 */
export function validateGherkinStructure(text) {
  const { GHERKIN_STRUCTURE } = METEOR_CONSTANTS;
  const issues = [];

  if (!text.includes(GHERKIN_STRUCTURE.FEATURE)) {
    issues.push('Missing Feature declaration');
  }
  
  if (!text.includes(GHERKIN_STRUCTURE.SCENARIO)) {
    issues.push('Missing Scenario declaration');
  }

  const hasGiven = text.includes(GHERKIN_STRUCTURE.GIVEN);
  const hasWhen = text.includes(GHERKIN_STRUCTURE.WHEN);
  const hasThen = text.includes(GHERKIN_STRUCTURE.THEN);

  if (!hasGiven) issues.push('Missing Given steps');
  if (!hasWhen) issues.push('Missing When steps');
  if (!hasThen) issues.push('Missing Then steps');

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Hitung persentase kemiripan sederhana
 */
export function calculateSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = Math.max(words1.length, words2.length);
  
  return totalWords > 0 ? commonWords.length / totalWords : 0;
}