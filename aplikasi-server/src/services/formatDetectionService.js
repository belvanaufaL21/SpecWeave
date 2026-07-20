/**
 * Format Detection Service
 * Detects whether input is Connextra format user story or general text
 */

/**
 * Detect if input follows Connextra format (As a... I want... So that...)
 * @param {string} input - User input text
 * @returns {Object} Detection result with confidence score
 */
export const detectConnextraFormat = (input) => {
  if (!input || typeof input !== 'string') {
    return {
      isConnextra: false,
      confidence: 0,
      reason: 'Invalid input'
    };
  }

  const text = input.toLowerCase().trim();
  
  // PENGECEKAN FORMAT CONNEXTRA: Definisi pola untuk mendeteksi role, want, benefit
  const patterns = {
    role: [
      /as\s+a\s+/i,           // "as a"
      /sebagai\s+/i,          // "sebagai" (Indonesian)
      /as\s+an\s+/i,          // "as an"
      /sebagai\s+seorang\s+/i // "sebagai seorang"
    ],
    want: [
      /i\s+want\s+/i,         // "i want"
      /saya\s+ingin\s+/i,     // "saya ingin" (Indonesian)
      /i\s+need\s+/i,         // "i need"
      /saya\s+perlu\s+/i,     // "saya perlu"
      /i\s+would\s+like\s+/i  // "i would like"
    ],
    benefit: [
      /so\s+that\s+/i,        // "so that"
      /agar\s+/i,             // "agar" (Indonesian)
      /sehingga\s+/i,         // "sehingga"
      /supaya\s+/i,           // "supaya"
      /in\s+order\s+to\s+/i   // "in order to"
    ]
  };

  // PENGECEKAN FORMAT CONNEXTRA: Cek keberadaan setiap komponen
  const hasRole = patterns.role.some(pattern => pattern.test(text));
  const hasWant = patterns.want.some(pattern => pattern.test(text));
  const hasBenefit = patterns.benefit.some(pattern => pattern.test(text));

  // PENGECEKAN FORMAT CONNEXTRA: Hitung confidence score
  let confidence = 0;
  let matchedComponents = [];

  if (hasRole) {
    confidence += 0.4;
    matchedComponents.push('role');
  }
  if (hasWant) {
    confidence += 0.4;
    matchedComponents.push('want');
  }
  if (hasBenefit) {
    confidence += 0.2;
    matchedComponents.push('benefit');
  }

  // Bonus points for proper structure
  if (hasRole && hasWant && hasBenefit) {
    confidence += 0.1; // Perfect structure bonus
  }

  // Check word count (user stories are typically longer)
  const wordCount = text.split(/\s+/).length;
  if (wordCount >= 8 && wordCount <= 50) {
    confidence += 0.05; // Reasonable length bonus
  }

  // PENGECEKAN FORMAT CONNEXTRA: Tentukan apakah Connextra atau bukan (threshold 80%)
  const isConnextra = confidence >= 0.8;

  return {
    isConnextra,
    confidence: Math.round(confidence * 100) / 100,
    matchedComponents,
    analysis: {
      hasRole,
      hasWant,
      hasBenefit,
      wordCount,
      structure: hasRole && hasWant ? 'partial' : hasRole && hasWant && hasBenefit ? 'complete' : 'incomplete'
    },
    reason: isConnextra 
      ? `Detected Connextra format with ${matchedComponents.join(', ')} components`
      : `Missing components: ${['role', 'want', 'benefit'].filter(c => !matchedComponents.includes(c)).join(', ')}`
  };
};

/**
 * Get format suggestions based on input
 * @param {string} input - User input text
 * @returns {Object} Suggestions for improving format
 */
export const getFormatSuggestions = (input) => {
  const detection = detectConnextraFormat(input);
  
  if (detection.isConnextra) {
    return {
      needsSuggestion: false,
      message: 'Perfect! This follows the Connextra format.',
      suggestions: []
    };
  }

  const suggestions = [];
  const { hasRole, hasWant, hasBenefit } = detection.analysis;

  if (!hasRole) {
    suggestions.push({
      component: 'role',
      suggestion: 'Add "As a [role]" or "Sebagai [peran]" to specify who the user is',
      examples: ['As a customer', 'Sebagai admin', 'As a manager']
    });
  }

  if (!hasWant) {
    suggestions.push({
      component: 'want',
      suggestion: 'Add "I want [feature]" or "saya ingin [fitur]" to describe the desired functionality',
      examples: ['I want to login', 'saya ingin melihat laporan', 'I want to export data']
    });
  }

  if (!hasBenefit) {
    suggestions.push({
      component: 'benefit',
      suggestion: 'Add "so that [benefit]" or "agar [manfaat]" to explain the value',
      examples: ['so that I can access my account', 'agar dapat menganalisis data', 'so that I can track progress']
    });
  }

  return {
    needsSuggestion: true,
    message: `To create a proper user story, consider adding: ${suggestions.map(s => s.component).join(', ')}`,
    suggestions,
    template: 'As a [role], I want [feature], so that [benefit]',
    templateIndonesian: 'Sebagai [peran], saya ingin [fitur], agar [manfaat]'
  };
};

/**
 * Validate user story quality
 * @param {string} input - User input text
 * @returns {Object} Quality assessment
 */
export const validateUserStoryQuality = (input) => {
  const detection = detectConnextraFormat(input);
  
  if (!detection.isConnextra) {
    return {
      isValid: false,
      score: 0,
      issues: ['Not in Connextra format'],
      suggestions: getFormatSuggestions(input).suggestions
    };
  }

  let score = 70; // Base score for Connextra format
  const issues = [];
  const suggestions = [];

  // Check for specificity
  const hasPlaceholders = /\[.*?\]/.test(input);
  if (hasPlaceholders) {
    score -= 20;
    issues.push('Contains placeholder text');
    suggestions.push('Replace placeholders with specific roles, features, and benefits');
  }

  // Check for vague terms
  const vagueTerms = ['something', 'anything', 'stuff', 'things', 'sesuatu', 'hal'];
  const hasVagueTerms = vagueTerms.some(term => input.toLowerCase().includes(term));
  if (hasVagueTerms) {
    score -= 15;
    issues.push('Contains vague terms');
    suggestions.push('Be more specific about what you want to achieve');
  }

  // Check length
  const wordCount = input.split(/\s+/).length;
  if (wordCount < 8) {
    score -= 10;
    issues.push('Too short - add more detail');
  } else if (wordCount > 50) {
    score -= 5;
    issues.push('Too long - consider breaking into multiple stories');
  }

  return {
    isValid: score >= 60,
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
    wordCount,
    confidence: detection.confidence
  };
};

export default {
  detectConnextraFormat,
  getFormatSuggestions,
  validateUserStoryQuality
};