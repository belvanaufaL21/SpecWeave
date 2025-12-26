import supabaseService from '../services/supabaseService.js';
import { AppError } from '../middlewares/errorHandler.js';

/**
 * Template Controller
 * Handles template management operations
 */

/**
 * Get all templates (system + user's own)
 */
export const getTemplates = async (req, res, next) => {
  try {
    const { category } = req.query;
    const userId = req.user?.id;

    const templates = await supabaseService.getTemplates(category, userId);

    res.json({
      success: true,
      data: templates,
      total: templates.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template by ID
 */
export const getTemplateById = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = req.user?.id;

    // Get template with access control
    const { data: template, error } = await supabaseService.admin
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .or(`is_system.eq.true,created_by.eq.${userId}`)
      .single();

    if (error) {
      throw new AppError('Template not found', 404);
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new template (user only)
 */
export const createTemplate = async (req, res, next) => {
  try {
    const { name, category, description, template_content, variables, tags } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name || !category || !template_content) {
      throw new AppError('Name, category, and template content are required', 400);
    }

    // Validate variables format if provided
    if (variables && !Array.isArray(variables)) {
      throw new AppError('Variables must be an array', 400);
    }

    const templateData = {
      name: name.trim(),
      category: category.trim(),
      description: description?.trim() || null,
      template_content: template_content.trim(),
      variables: variables || [],
      is_system: false,
      created_by: userId,
      tags: tags || []
    };

    const newTemplate = await supabaseService.createTemplate(templateData);

    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Template created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update template (user's own only)
 */
export const updateTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { name, category, description, template_content, variables, tags } = req.body;
    const userId = req.user.id;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (template_content !== undefined) updates.template_content = template_content.trim();
    if (variables !== undefined) updates.variables = variables;
    if (tags !== undefined) updates.tags = tags;

    const updatedTemplate = await supabaseService.updateTemplate(templateId, userId, updates);

    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete template (user's own only)
 */
export const deleteTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const { error } = await supabaseService.admin
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('created_by', userId)
      .eq('is_system', false);

    if (error) {
      throw new AppError('Failed to delete template or template not found', 404);
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply template with variables
 */
export const applyTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { variables } = req.body;
    const userId = req.user?.id;

    // Get template
    const { data: template, error } = await supabaseService.admin
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .or(`is_system.eq.true,created_by.eq.${userId}`)
      .single();

    if (error) {
      throw new AppError('Template not found', 404);
    }

    // Apply variables to template content
    let appliedContent = template.template_content;
    
    if (variables && typeof variables === 'object') {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        appliedContent = appliedContent.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    // Increment usage count
    await supabaseService.incrementTemplateUsage(templateId);

    res.json({
      success: true,
      data: {
        template_id: templateId,
        template_name: template.name,
        applied_content: appliedContent,
        variables_used: variables || {}
      },
      message: 'Template applied successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template categories
 */
export const getTemplateCategories = async (req, res, next) => {
  try {
    const { data: categories, error } = await supabaseService.admin
      .from('templates')
      .select('category')
      .order('category');

    if (error) {
      throw new AppError('Failed to get template categories', 500);
    }

    // Get unique categories
    const uniqueCategories = [...new Set(categories.map(c => c.category))];

    res.json({
      success: true,
      data: uniqueCategories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template usage statistics (admin only)
 */
export const getTemplateStats = async (req, res, next) => {
  try {
    const { data: stats, error } = await supabaseService.admin
      .from('template_usage_stats')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) {
      throw new AppError('Failed to get template statistics', 500);
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};