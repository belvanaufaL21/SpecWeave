import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import templateService from '../../services/templateService.js';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Textarea from '../common/Textarea.jsx';

const TemplateEditor = ({ template = null, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    template_content: '',
    variables: [],
    tags: []
  });
  
  const [validation, setValidation] = useState({
    content: { valid: true, errors: [], variables: [] },
    variables: { valid: true, errors: [] }
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const [previewVariables, setPreviewVariables] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newTag, setNewTag] = useState('');

  // Common categories for suggestions
  const commonCategories = [
    'Authentication',
    'CRUD Operations',
    'API Integration',
    'UI Components',
    'Testing',
    'Documentation',
    'E-commerce',
    'User Management',
    'Data Processing',
    'Reporting'
  ];

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        category: template.category || '',
        description: template.description || '',
        template_content: template.template_content || '',
        variables: template.variables || [],
        tags: template.tags || []
      });
    }
  }, [template]);

  useEffect(() => {
    // Validate content whenever it changes
    if (formData.template_content) {
      const contentValidation = templateService.validateTemplateContent(formData.template_content);
      setValidation(prev => ({
        ...prev,
        content: contentValidation
      }));

      // Initialize preview variables based on detected variables
      const initialPreviewVars = {};
      contentValidation.variables?.forEach(varName => {
        const existingVar = formData.variables.find(v => v.name === varName);
        initialPreviewVars[varName] = existingVar?.default_value || `{${varName}}`;
      });
      setPreviewVariables(initialPreviewVars);
    }
  }, [formData.template_content]);

  useEffect(() => {
    // Validate variables whenever they change
    if (formData.variables.length > 0) {
      const variablesValidation = templateService.validateTemplateVariables(formData.variables);
      setValidation(prev => ({
        ...prev,
        variables: variablesValidation
      }));
    }
  }, [formData.variables]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleAddVariable = () => {
    const newVariable = {
      name: '',
      type: 'text',
      label: '',
      description: '',
      required: false,
      default_value: '',
      options: []
    };

    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, newVariable]
    }));
  };

  const handleUpdateVariable = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map((variable, i) => 
        i === index ? { ...variable, [field]: value } : variable
      )
    }));
  };

  const handleRemoveVariable = (index) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handlePreviewVariableChange = (varName, value) => {
    setPreviewVariables(prev => ({
      ...prev,
      [varName]: value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) {
      errors.push('Template name is required');
    }

    if (!formData.category.trim()) {
      errors.push('Template category is required');
    }

    if (!formData.template_content.trim()) {
      errors.push('Template content is required');
    }

    if (!validation.content.valid) {
      errors.push(...validation.content.errors);
    }

    if (!validation.variables.valid) {
      errors.push(...validation.variables.errors);
    }

    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let result;
      if (template?.id) {
        // Update existing template
        result = await templateService.updateTemplate(template.id, formData);
      } else {
        // Create new template
        result = await templateService.createTemplate(formData);
      }

      if (onSave) {
        onSave(result.data);
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      setError(err.message || 'Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template?.id) return;

    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await templateService.deleteTemplate(template.id);
      if (onDelete) {
        onDelete(template.id);
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError(err.message || 'Failed to delete template. Please try again.');
    }
  };

  const getPreviewContent = () => {
    return templateService.previewTemplate(formData.template_content, previewVariables);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            {template?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-200px)]">
        {/* Main Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} p-6 overflow-y-auto border-r border-gray-200`}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter template name"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="Enter or select category"
                  className="flex-1"
                  list="categories"
                />
                <datalist id="categories">
                  {commonCategories.map(category => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
                className="w-full"
              />
            </div>
          </div>

          {/* Template Content */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Template Content *
              </label>
              {validation.content.valid ? (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Valid
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {validation.content.errors.length} error(s)
                </div>
              )}
            </div>
            
            <Textarea
              value={formData.template_content}
              onChange={(e) => handleInputChange('template_content', e.target.value)}
              placeholder="Enter your template content. Use {variable_name} for placeholders..."
              rows={10}
              className="w-full font-mono"
            />
            
            {!validation.content.valid && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <ul className="list-disc list-inside text-red-700">
                  {validation.content.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.content.variables && validation.content.variables.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                <p className="text-blue-700 font-medium mb-1">Detected Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {validation.content.variables.map(varName => (
                    <span key={varName} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {varName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Variables Configuration */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Variables Configuration
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddVariable}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Variable
              </Button>
            </div>

            {formData.variables.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                No variables configured. Add variables to make your template dynamic.
              </p>
            ) : (
              <div className="space-y-4">
                {formData.variables.map((variable, index) => (
                  <VariableEditor
                    key={index}
                    variable={variable}
                    index={index}
                    onUpdate={handleUpdateVariable}
                    onRemove={handleRemoveVariable}
                  />
                ))}
              </div>
            )}

            {!validation.variables.valid && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <ul className="list-disc list-inside text-red-700">
                  {validation.variables.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            
            <div className="flex gap-2 mb-2">
              <Input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-gray-500 hover:text-red-500 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 p-6 overflow-y-auto bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-4">Preview</h3>
            
            {/* Preview Variables */}
            {validation.content.variables && validation.content.variables.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Test Variables</h4>
                <div className="space-y-2">
                  {validation.content.variables.map(varName => (
                    <div key={varName}>
                      <label className="block text-xs text-gray-600 mb-1">{varName}</label>
                      <Input
                        type="text"
                        value={previewVariables[varName] || ''}
                        onChange={(e) => handlePreviewVariableChange(varName, e.target.value)}
                        placeholder={`Enter ${varName}`}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Content */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Generated Content</h4>
              <div className="font-mono text-sm whitespace-pre-wrap text-gray-800">
                {getPreviewContent()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !validation.content.valid || !validation.variables.valid}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {template ? 'Update Template' : 'Create Template'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const VariableEditor = ({ variable, index, onUpdate, onRemove }) => {
  const handleAddOption = () => {
    const newOptions = [...(variable.options || []), ''];
    onUpdate(index, 'options', newOptions);
  };

  const handleUpdateOption = (optionIndex, value) => {
    const newOptions = [...(variable.options || [])];
    newOptions[optionIndex] = value;
    onUpdate(index, 'options', newOptions);
  };

  const handleRemoveOption = (optionIndex) => {
    const newOptions = (variable.options || []).filter((_, i) => i !== optionIndex);
    onUpdate(index, 'options', newOptions);
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">Variable {index + 1}</h4>
        <button
          onClick={() => onRemove(index)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Variable Name *
          </label>
          <Input
            type="text"
            value={variable.name || ''}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            placeholder="variable_name"
            size="sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            value={variable.type || 'text'}
            onChange={(e) => onUpdate(index, 'type', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Select</option>
            <option value="boolean">Boolean</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Label
          </label>
          <Input
            type="text"
            value={variable.label || ''}
            onChange={(e) => onUpdate(index, 'label', e.target.value)}
            placeholder="Display label"
            size="sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Default Value
          </label>
          <Input
            type="text"
            value={variable.default_value || ''}
            onChange={(e) => onUpdate(index, 'default_value', e.target.value)}
            placeholder="Default value"
            size="sm"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Description
        </label>
        <Input
          type="text"
          value={variable.description || ''}
          onChange={(e) => onUpdate(index, 'description', e.target.value)}
          placeholder="Variable description"
          size="sm"
        />
      </div>

      <div className="flex items-center mb-3">
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={variable.required || false}
            onChange={(e) => onUpdate(index, 'required', e.target.checked)}
            className="mr-2"
          />
          Required
        </label>
      </div>

      {/* Options for select type */}
      {variable.type === 'select' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-700">
              Options
            </label>
            <Button
              variant="outline"
              size="xs"
              onClick={handleAddOption}
              className="flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Option
            </Button>
          </div>
          
          <div className="space-y-2">
            {(variable.options || []).map((option, optionIndex) => (
              <div key={optionIndex} className="flex gap-2">
                <Input
                  type="text"
                  value={option}
                  onChange={(e) => handleUpdateOption(optionIndex, e.target.value)}
                  placeholder={`Option ${optionIndex + 1}`}
                  size="sm"
                  className="flex-1"
                />
                <button
                  onClick={() => handleRemoveOption(optionIndex)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateEditor;