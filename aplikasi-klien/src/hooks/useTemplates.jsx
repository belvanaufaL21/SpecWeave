import { useState, useEffect, useCallback, useRef } from 'react';
import templateService from '../services/templateService.js';

/**
 * Custom hook for template management
 */
export const useTemplates = (options = {}) => {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    autoLoad = true,
    category = null,
    search = '',
    tags = []
  } = options;

  // Use ref to store the latest options to avoid stale closures
  const optionsRef = useRef({ category, search, tags });
  optionsRef.current = { category, search, tags };
  
  // Track if we're currently loading to prevent multiple requests
  const loadingRef = useRef(false);

  // Load templates - stable function that doesn't change on every render
  const loadTemplates = useCallback(async (filters = {}) => {
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      
      return;
    }
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const currentOptions = optionsRef.current;
      const searchFilters = {
        category: currentOptions.category || filters.category,
        search: currentOptions.search || filters.search,
        tags: currentOptions.tags.length > 0 ? currentOptions.tags : filters.tags,
        ...filters
      };

      const response = await templateService.searchTemplates(searchFilters);

      setTemplates(response.data || []);
    } catch (err) {
      console.error('❌ [USE-TEMPLATES] Error loading templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []); // Empty dependency array - function is stable

  // Load categories - stable function
  const loadCategories = useCallback(async () => {
    try {
      const response = await templateService.getTemplateCategories();
      setCategories(response.data || []);
    } catch (err) {
      // Failed to load categories - not critical
      console.warn('Failed to load categories:', err);
    }
  }, []);

  // Create template
  const createTemplate = useCallback(async (templateData) => {
    try {
      setError(null);
      const response = await templateService.createTemplate(templateData);
      
      // Add to local state
      setTemplates(prev => [response.data, ...prev]);
      
      return response.data;
    } catch (err) {
      console.error('Failed to create template:', err);
      setError(err.message || 'Failed to create template');
      throw err;
    }
  }, []);

  // Update template
  const updateTemplate = useCallback(async (templateId, updates) => {
    try {
      setError(null);
      const response = await templateService.updateTemplate(templateId, updates);
      
      // Update local state
      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId ? response.data : template
        )
      );
      
      return response.data;
    } catch (err) {
      console.error('Failed to update template:', err);
      setError(err.message || 'Failed to update template');
      throw err;
    }
  }, []);

  // Delete template
  const deleteTemplate = useCallback(async (templateId) => {
    try {
      setError(null);
      await templateService.deleteTemplate(templateId);
      
      // Remove from local state
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      
      return true;
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError(err.message || 'Failed to delete template');
      throw err;
    }
  }, []);

  // Apply template
  const applyTemplate = useCallback(async (templateId, variables = {}) => {
    try {
      setError(null);
      const response = await templateService.applyTemplate(templateId, variables);
      
      // Update usage count in local state
      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId 
            ? { ...template, usage_count: (template.usage_count || 0) + 1 }
            : template
        )
      );
      
      return response.data;
    } catch (err) {
      console.error('Failed to apply template:', err);
      setError(err.message || 'Failed to apply template');
      throw err;
    }
  }, []);

  // Get template by ID
  const getTemplate = useCallback(async (templateId) => {
    try {
      setError(null);
      const response = await templateService.getTemplateById(templateId);
      return response.data;
    } catch (err) {
      console.error('Failed to get template:', err);
      setError(err.message || 'Failed to get template');
      throw err;
    }
  }, []);

  // Search templates
  const searchTemplates = useCallback(async (filters) => {
    return loadTemplates(filters);
  }, [loadTemplates]);

  // Refresh data
  const refresh = useCallback(() => {
    loadTemplates();
    loadCategories();
  }, [loadTemplates, loadCategories]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadTemplates();
      loadCategories();
    }
  }, [autoLoad]); // Removed loadTemplates and loadCategories from dependencies to prevent infinite loop

  return {
    // Data
    templates,
    categories,
    loading,
    error,

    // Actions
    loadTemplates,
    loadCategories,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    getTemplate,
    searchTemplates,
    refresh,
    clearError
  };
};

/**
 * Hook for template validation
 */
export const useTemplateValidation = () => {
  const validateContent = useCallback((content) => {
    return templateService.validateTemplateContent(content);
  }, []);

  const validateVariables = useCallback((variables) => {
    return templateService.validateTemplateVariables(variables);
  }, []);

  const previewTemplate = useCallback((content, variables) => {
    return templateService.previewTemplate(content, variables);
  }, []);

  return {
    validateContent,
    validateVariables,
    previewTemplate
  };
};

/**
 * Hook for template statistics
 */
export const useTemplateStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await templateService.getTemplateStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load template stats:', err);
      setError(err.message || 'Failed to load template statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  };
};