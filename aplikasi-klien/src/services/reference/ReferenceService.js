import { REFERENCE_CONSTANTS } from '../../utils/constants/referenceConstants';
import { 
  buildApiUrl, 
  handleApiResponse, 
  formatReferenceForPrompt,
  sortReferencesByQuality 
} from '../../utils/helpers/referenceHelpers';

/**
 * Service untuk mengelola reference library (knowledge base)
 * Digunakan untuk few-shot prompting dan meningkatkan akurasi LLM
 */
class ReferenceService {
  constructor() {
    this.baseURL = REFERENCE_CONSTANTS.API_ENDPOINTS.BASE;
  }

  /**
   * Dapatkan semua references
   */
  async getReferences() {
    try {
      const response = await fetch(this.baseURL);
      return await handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching references:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Buat reference baru
   */
  async createReference(referenceData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: REFERENCE_CONSTANTS.DEFAULT_HEADERS,
        body: JSON.stringify(referenceData),
      });

      return await handleApiResponse(response);
    } catch (error) {
      console.error('Error creating reference:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update reference
   */
  async updateReference(referenceId, referenceData) {
    try {
      const url = buildApiUrl(this.baseURL, referenceId);
      const response = await fetch(url, {
        method: 'PUT',
        headers: REFERENCE_CONSTANTS.DEFAULT_HEADERS,
        body: JSON.stringify(referenceData),
      });

      return await handleApiResponse(response);
    } catch (error) {
      console.error('Error updating reference:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Hapus reference
   */
  async deleteReference(referenceId) {
    try {
      const url = buildApiUrl(this.baseURL, referenceId);
      const response = await fetch(url, {
        method: 'DELETE',
      });

      return await handleApiResponse(response);
    } catch (error) {
      console.error('Error deleting reference:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Track penggunaan reference untuk analytics
   */
  async trackUsage(referenceId, meteorScore = null) {
    try {
      const url = buildApiUrl(this.baseURL, referenceId, 'usage');
      const response = await fetch(url, {
        method: 'POST',
        headers: REFERENCE_CONSTANTS.DEFAULT_HEADERS,
        body: JSON.stringify({
          score: meteorScore
        }),
      });

      return await handleApiResponse(response);
    } catch (error) {
      console.error('Error tracking usage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Dapatkan statistik reference
   */
  async getStatistics() {
    try {
      const url = buildApiUrl(this.baseURL, 'statistics');
      const response = await fetch(url);
      return await handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        success: false,
        error: error.message,
        data: REFERENCE_CONSTANTS.DEFAULT_STATISTICS
      };
    }
  }

  /**
   * Dapatkan references berdasarkan kategori
   */
  async getReferencesByCategory(category) {
    const result = await this.getReferences();
    
    if (!result.success) {
      return result;
    }

    const filteredData = result.data.filter(ref => 
      category === REFERENCE_CONSTANTS.CATEGORIES.ALL || ref.category === category
    );

    return {
      ...result,
      data: filteredData
    };
  }

  /**
   * Cari references
   */
  async searchReferences(query, category = REFERENCE_CONSTANTS.CATEGORIES.ALL) {
    const result = await this.getReferences();
    
    if (!result.success) {
      return result;
    }

    const searchTerm = query.toLowerCase();
    const filteredData = result.data.filter(ref => {
      const matchesSearch = !query || 
        ref.title.toLowerCase().includes(searchTerm) ||
        ref.description?.toLowerCase().includes(searchTerm) ||
        ref.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
      
      const matchesCategory = category === REFERENCE_CONSTANTS.CATEGORIES.ALL || ref.category === category;
      
      return matchesSearch && matchesCategory;
    });

    return {
      ...result,
      data: filteredData
    };
  }

  /**
   * Dapatkan references terbaik untuk few-shot prompting
   */
  async getBestReferences(limit = REFERENCE_CONSTANTS.DEFAULT_LIMITS.BEST_REFERENCES, category = null) {
    const result = await this.getReferences();
    
    if (!result.success) {
      return result;
    }

    let filteredData = result.data;
    
    // Filter berdasarkan kategori jika ditentukan
    if (category && category !== REFERENCE_CONSTANTS.CATEGORIES.ALL) {
      filteredData = filteredData.filter(ref => ref.category === category);
    }

    // Sort berdasarkan kualitas
    const sortedData = sortReferencesByQuality(filteredData);

    return {
      ...result,
      data: sortedData.slice(0, limit)
    };
  }

  /**
   * Format reference untuk prompting
   */
  formatForPrompt(reference) {
    return formatReferenceForPrompt(reference);
  }

  /**
   * Dapatkan references yang sudah diformat untuk LLM prompting
   */
  async getFormattedReferences(category = null, limit = REFERENCE_CONSTANTS.DEFAULT_LIMITS.FORMATTED_REFERENCES) {
    const result = await this.getBestReferences(limit, category);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        data: []
      };
    }

    const formattedData = result.data.map(ref => this.formatForPrompt(ref));

    return {
      success: true,
      data: formattedData,
      meta: {
        count: formattedData.length,
        category: category || REFERENCE_CONSTANTS.CATEGORIES.ALL,
        purpose: REFERENCE_CONSTANTS.PURPOSES.FEW_SHOT_PROMPTING
      }
    };
  }
}

export const referenceService = new ReferenceService();
export default referenceService;