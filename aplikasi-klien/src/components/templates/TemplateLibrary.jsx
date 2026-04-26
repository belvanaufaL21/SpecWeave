import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Eye, Edit, Trash2, Copy, Tag } from 'lucide-react';
import templateService from '../../services/templateService.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';

const TemplateLibrary = ({ onSelectTemplate, onCreateTemplate, showActions = true }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showSystemOnly, setShowSystemOnly] = useState(false);
  const [showUserOnly, setShowUserOnly] = useState(false);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, [searchQuery, selectedCategory, showSystemOnly, showUserOnly]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        query: searchQuery,
        category: selectedCategory,
        isSystem: showSystemOnly ? true : (showUserOnly ? false : null)
      };

      const response = await templateService.searchTemplates(filters);
      setTemplates(response.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await templateService.getTemplateCategories();
      setCategories(response.data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSelectTemplate = async (template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleApplyTemplate = async (template, variables = {}) => {
    try {
      const response = await templateService.applyTemplate(template.id, variables);
      if (onSelectTemplate) {
        onSelectTemplate({
          ...template,
          applied_content: response.data.applied_content
        });
      }
    } catch (err) {
      console.error('Failed to apply template:', err);
      setError('Failed to apply template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await templateService.deleteTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError('Failed to delete template. Please try again.');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setShowSystemOnly(false);
    setShowUserOnly(false);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Template Library</h2>
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
              {onCreateTemplate && (
                <Button
                  size="sm"
                  onClick={onCreateTemplate}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Template
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="flex gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showSystemOnly}
                      onChange={(e) => {
                        setShowSystemOnly(e.target.checked);
                        if (e.target.checked) setShowUserOnly(false);
                      }}
                      className="mr-1"
                    />
                    System
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showUserOnly}
                      onChange={(e) => {
                        setShowUserOnly(e.target.checked);
                        if (e.target.checked) setShowSystemOnly(false);
                      }}
                      className="mr-1"
                    />
                    My Templates
                  </label>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Templates Grid */}
      <div className="p-6">
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No templates found matching your criteria.</p>
            {onCreateTemplate && (
              <Button
                className="mt-4"
                onClick={onCreateTemplate}
              >
                Create Your First Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                currentUserId={user?.id}
                onSelect={() => handleSelectTemplate(template)}
                onPreview={() => handlePreviewTemplate(template)}
                onEdit={onCreateTemplate ? () => onCreateTemplate(template) : null}
                onDelete={() => handleDeleteTemplate(template.id)}
                showActions={showActions}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => setShowPreview(false)}
          onApply={handleApplyTemplate}
        />
      )}
    </div>
  );
};

const TemplateCard = ({ 
  template, 
  currentUserId, 
  onSelect, 
  onPreview, 
  onEdit, 
  onDelete, 
  showActions 
}) => {
  const isOwner = template.created_by === currentUserId;
  const isSystem = template.is_system;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {template.category}
            </span>
            {isSystem && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                System
              </span>
            )}
          </div>
        </div>
        
        {showActions && (
          <div className="flex gap-1 ml-2">
            <button
              onClick={onPreview}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
            {isOwner && onEdit && (
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {isOwner && (
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Used {template.usage_count || 0} times
        </div>
        <Button
          size="sm"
          onClick={onSelect}
          className="flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />
          Use Template
        </Button>
      </div>
    </div>
  );
};

const TemplatePreviewModal = ({ template, onClose, onApply }) => {
  const [variables, setVariables] = useState({});
  const [preview, setPreview] = useState('');

  useEffect(() => {
    // Initialize variables with default values
    const initialVariables = {};
    if (template.variables) {
      template.variables.forEach(variable => {
        initialVariables[variable.name] = variable.default_value || '';
      });
    }
    setVariables(initialVariables);
  }, [template]);

  useEffect(() => {
    // Update preview when variables change
    setPreview(templateService.previewTemplate(template.template_content, variables));
  }, [template.template_content, variables]);

  const handleVariableChange = (variableName, value) => {
    setVariables(prev => ({
      ...prev,
      [variableName]: value
    }));
  };

  const handleApply = () => {
    onApply(template, variables);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-600">{template.category}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Variables Panel */}
          {template.variables && template.variables.length > 0 && (
            <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
              <h4 className="font-medium text-gray-900 mb-4">Variables</h4>
              <div className="space-y-4">
                {template.variables.map(variable => (
                  <div key={variable.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {variable.label || variable.name}
                      {variable.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {variable.description && (
                      <p className="text-xs text-gray-500 mb-2">{variable.description}</p>
                    )}
                    
                    {variable.type === 'select' ? (
                      <select
                        value={variables[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {variable.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : variable.type === 'boolean' ? (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={variables[variable.name] || false}
                          onChange={(e) => handleVariableChange(variable.name, e.target.checked)}
                          className="mr-2"
                        />
                        {variable.label || variable.name}
                      </label>
                    ) : (
                      <Input
                        type={variable.type === 'number' ? 'number' : 'text'}
                        value={variables[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        placeholder={variable.placeholder || `Enter ${variable.name}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Panel */}
          <div className={`${template.variables?.length > 0 ? 'w-2/3' : 'w-full'} p-6 overflow-y-auto`}>
            <h4 className="font-medium text-gray-900 mb-4">Preview</h4>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
              {preview}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Template
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;