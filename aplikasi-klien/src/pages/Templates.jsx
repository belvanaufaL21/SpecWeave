import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import TemplateLibrary from '../components/templates/TemplateLibrary.jsx';
import TemplateEditor from '../components/templates/TemplateEditor.jsx';
import Button from '../components/common/Button.jsx';

const Templates = () => {
  const [currentView, setCurrentView] = useState('library'); // 'library', 'create', 'edit'
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleCreateTemplate = (template = null) => {
    setSelectedTemplate(template);
    setCurrentView(template ? 'edit' : 'create');
  };

  const handleSaveTemplate = (savedTemplate) => {
    setCurrentView('library');
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = (templateId) => {
    setCurrentView('library');
    setSelectedTemplate(null);
  };

  const handleCancel = () => {
    setCurrentView('library');
    setSelectedTemplate(null);
  };

  const handleSelectTemplate = (template) => {
    // This would typically be used in the chat interface
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          {currentView !== 'library' && (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Library
            </Button>
          )}
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {currentView === 'library' && 'Template Library'}
              {currentView === 'create' && 'Create New Template'}
              {currentView === 'edit' && 'Edit Template'}
            </h1>
            <p className="mt-2 text-gray-600">
              {currentView === 'library' && 'Browse and manage your user story templates'}
              {currentView === 'create' && 'Create a new reusable template for user stories'}
              {currentView === 'edit' && 'Edit your existing template'}
            </p>
          </div>
        </div>

        {/* Content */}
        {currentView === 'library' && (
          <TemplateLibrary
            onSelectTemplate={handleSelectTemplate}
            onCreateTemplate={handleCreateTemplate}
            showActions={true}
          />
        )}

        {(currentView === 'create' || currentView === 'edit') && (
          <TemplateEditor
            template={selectedTemplate}
            onSave={handleSaveTemplate}
            onCancel={handleCancel}
            onDelete={handleDeleteTemplate}
          />
        )}
      </div>
    </div>
  );
};

export default Templates;