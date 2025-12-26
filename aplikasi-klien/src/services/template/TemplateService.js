import { supabase } from '../../config/supabase.js';
import { TEMPLATE_CONSTANTS } from '../../utils/constants/templateConstants';
import { 
  getAuthHeaders,
  handleApiResponse,
  validateTemplateContent,
  validateTemplateVariables,
  previewTemplate
} from '../../utils/helpers/templateHelpers';

/**
 * Service untuk mengelola template Gherkin
 * Handles template CRUD operations dan variable processing
 */
class TemplateService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || TEMPLATE_CONSTANTS.DEFAULT_BASE_URL;
  }

  /**
   * Dapatkan semua templates dengan filter opsional
   */
  async getTemplates(options = {}) {
    const { category, search, tags } = options;
    const params = new URLSearchParams();
    
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (tags && tags.length > 0) params.append('tags', tags.join(','));

    const response = await fetch(`${this.baseUrl}/templates?${params}`, {
      method: 'GET',
      headers: await getAuthHeaders()
    });

    return handleApiResponse(response);
  }

  /**
   * Dapatkan template berdasarkan ID
   */
  async getTemplateById(templateId) {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'GET',
      headers: await getAuthHeaders()
    });

    return handleApiResponse(response);
  }

  /**
   * Buat template baru
   */
  async createTemplate(templateData) {
    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(templateData)
    });

    return handleApiResponse(response);
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, updates) {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    return handleApiResponse(response);
  }

  /**
   * Hapus template
   */
  async deleteTemplate(templateId) {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders()
    });

    return handleApiResponse(response);
  }

  /**
   * Apply template dengan variables
   */
  async applyTemplate(templateId, variables = {}) {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}/apply`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ variables })
    });

    return handleApiResponse(response);
  }

  /**
   * Dapatkan kategori template
   */
  async getTemplateCategories() {
    const response = await fetch(`${this.baseUrl}/templates/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return handleApiResponse(response);
  }

  /**
   * Dapatkan statistik template (admin only)
   */
  async getTemplateStats() {
    const response = await fetch(`${this.baseUrl}/templates/stats`, {
      method: 'GET',
      headers: await getAuthHeaders()
    });

    return handleApiResponse(response);
  }

  /**
   * Cari templates dengan filter advanced
   */
  async searchTemplates(filters = {}) {
    const {
      query = '',
      category = '',
      tags = [],
      isSystem = null,
      sortBy = TEMPLATE_CONSTANTS.SORT_OPTIONS.USAGE_COUNT,
      sortOrder = TEMPLATE_CONSTANTS.SORT_ORDER.DESC,
      limit = TEMPLATE_CONSTANTS.DEFAULT_LIMITS.SEARCH,
      offset = 0
    } = filters;

    const params = new URLSearchParams();
    
    if (query) params.append('search', query);
    if (category) params.append('category', category);
    if (tags.length > 0) params.append('tags', tags.join(','));
    if (isSystem !== null) params.append('is_system', isSystem);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortOrder) params.append('sort_order', sortOrder);
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);

    const response = await fetch(`${this.baseUrl}/templates?${params}`, {
      method: 'GET',
      headers: await getAuthHeaders()
    });

    return handleApiResponse(response);
  }

  /**
   * Validasi konten template
   */
  validateTemplateContent(content) {
    return validateTemplateContent(content);
  }

  /**
   * Validasi konfigurasi variables template
   */
  validateTemplateVariables(variables) {
    return validateTemplateVariables(variables);
  }

  /**
   * Preview template dengan sample variables
   */
  previewTemplate(content, variables = {}) {
    return previewTemplate(content, variables);
  }
}

export default new TemplateService();