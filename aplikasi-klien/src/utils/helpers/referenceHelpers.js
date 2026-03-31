import { REFERENCE_CONSTANTS } from '../constants/referenceConstants';

/**
 * Helper functions untuk Reference Service
 */

/**
 * Build URL untuk API calls
 */
export function buildApiUrl(baseUrl, ...segments) {
  const cleanSegments = segments.filter(segment => segment != null);
  return [baseUrl, ...cleanSegments].join('/');
}

  /**
   * Handle API response dengan error handling yang konsisten
   */
  export async function handleApiResponse(response) {
    // Check if response is ok first
    if (!response.ok) {
      // If it's a 500 error, it might be a missing table - let the service handle offline mode
      if (response.status === 500) {
        throw new Error('Server error - switching to offline mode');
      }
      
      // For other errors, try to parse JSON if possible
      try {
        const data = await response.json();
        throw new Error(data.message || `Request failed with status ${response.status}`);
      } catch (jsonError) {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }
    
    // Try to parse JSON response
    try {
      const data = await response.json();
      return data;
    } catch (jsonError) {
      // If JSON parsing fails, return a generic success response
      return {
        success: true,
        data: [],
        message: 'Empty response - switching to offline mode'
      };
    }
  }

/**
 * Format reference untuk few-shot prompting
 */
export function formatReferenceForPrompt(reference) {
  return {
    title: reference.title,
    category: reference.category,
    example: reference.gherkinContent,
    tags: reference.tags || [],
    quality: {
      usageCount: reference.usageCount || 0,
      averageScore: reference.averageScore || 0
    }
  };
}

/**
 * Sort references berdasarkan kualitas (usage count + average score)
 */
export function sortReferencesByQuality(references) {
  const { QUALITY_WEIGHTS } = REFERENCE_CONSTANTS;
  
  return references.sort((a, b) => {
    const scoreA = (a.usageCount || 0) * QUALITY_WEIGHTS.USAGE_COUNT + 
                   (a.averageScore || 0) * QUALITY_WEIGHTS.AVERAGE_SCORE;
    const scoreB = (b.usageCount || 0) * QUALITY_WEIGHTS.USAGE_COUNT + 
                   (b.averageScore || 0) * QUALITY_WEIGHTS.AVERAGE_SCORE;
    return scoreB - scoreA;
  });
}

/**
 * Filter references berdasarkan search query
 */
export function filterReferencesBySearch(references, query) {
  if (!query) return references;
  
  const searchTerm = query.toLowerCase();
  return references.filter(ref => 
    ref.title.toLowerCase().includes(searchTerm) ||
    ref.description?.toLowerCase().includes(searchTerm) ||
    ref.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}

/**
 * Filter references berdasarkan kategori
 */
export function filterReferencesByCategory(references, category) {
  if (!category || category === REFERENCE_CONSTANTS.CATEGORIES.ALL) {
    return references;
  }
  
  return references.filter(ref => ref.category === category);
}

/**
 * Validasi data reference sebelum create/update
 */
export function validateReferenceData(referenceData) {
  const errors = [];
  
  if (!referenceData.title || referenceData.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (!referenceData.category) {
    errors.push('Category is required');
  }
  
  if (!referenceData.gherkinContent || referenceData.gherkinContent.trim().length === 0) {
    errors.push('Gherkin content is required');
  }
  
  if (referenceData.title && referenceData.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (referenceData.description && referenceData.description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate summary statistics dari array references
 */
export function generateReferenceStatistics(references) {
  const stats = {
    totalReferences: references.length,
    publicReferences: 0,
    privateReferences: 0,
    totalUsage: 0,
    averageScore: 0,
    categoryBreakdown: {},
    mostUsedReferences: []
  };
  
  let totalScore = 0;
  let scoreCount = 0;
  
  references.forEach(ref => {
    // Count public/private
    if (ref.isPublic) {
      stats.publicReferences++;
    } else {
      stats.privateReferences++;
    }
    
    // Total usage
    stats.totalUsage += ref.usageCount || 0;
    
    // Average score calculation
    if (ref.averageScore) {
      totalScore += ref.averageScore;
      scoreCount++;
    }
    
    // Category breakdown
    const category = ref.category || 'uncategorized';
    stats.categoryBreakdown[category] = (stats.categoryBreakdown[category] || 0) + 1;
  });
  
  // Calculate average score
  stats.averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
  
  // Most used references (top 5)
  stats.mostUsedReferences = sortReferencesByQuality(references)
    .slice(0, 5)
    .map(ref => ({
      id: ref.id,
      title: ref.title,
      usageCount: ref.usageCount || 0,
      averageScore: ref.averageScore || 0
    }));
  
  return stats;
}

/**
 * Format reference untuk display di UI
 */
export function formatReferenceForDisplay(reference) {
  return {
    ...reference,
    formattedUsageCount: (reference.usageCount || 0).toLocaleString(),
    formattedAverageScore: reference.averageScore 
      ? `${(reference.averageScore * 100).toFixed(1)}%`
      : 'N/A',
    shortDescription: reference.description 
      ? reference.description.length > 100 
        ? `${reference.description.substring(0, 100)}...`
        : reference.description
      : 'No description available'
  };
}