import React, { useState } from 'react';
import GherkinEditor from './GherkinEditor';

const GherkinEditorDemo = () => {
  const [gherkinContent, setGherkinContent] = useState(`Feature: User Authentication
  As a user
  I want to log in to the application
  So that I can access my personal dashboard

  Background:
    Given the application is running
    And the database is accessible

  @smoke @authentication
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I fill in the "email" field with "user@example.com"
    And I fill in the "password" field with "validpassword"
    And I click on the "Login" button
    Then I should be redirected to the "dashboard" page
    And I should see the message "Welcome back!"

  @authentication @error-handling
  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I fill in the "email" field with "user@example.com"
    And I fill in the "password" field with "wrongpassword"
    And I click on the "Login" button
    Then I should see the message "Invalid credentials"
    And I should remain on the login page

  @authentication
  Scenario Outline: Login attempts with different user types
    Given I am on the login page
    When I fill in the "email" field with "<email>"
    And I fill in the "password" field with "<password>"
    And I click on the "Login" button
    Then I should see "<result>"

    Examples:
      | email           | password    | result                    |
      | admin@test.com  | admin123    | Welcome, Administrator!   |
      | user@test.com   | user123     | Welcome back!             |
      | guest@test.com  | guest123    | Welcome, Guest!           |`);

  const [validationErrors, setValidationErrors] = useState([]);

  const handleContentChange = (newContent) => {
    setGherkinContent(newContent);
  };

  const handleValidation = (errors) => {
    setValidationErrors(errors);
  };

  const exportGherkin = () => {
    const blob = new Blob([gherkinContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenario.feature';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearContent = () => {
    setGherkinContent('');
  };

  const loadTemplate = () => {
    const template = `Feature: New Feature
  Brief description of the feature

  Scenario: Basic scenario
    Given initial condition
    When action is performed
    Then expected result occurs`;
    
    setGherkinContent(template);
  };

  return (
    <div className="min-h-screen bg-[#020203] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
            Gherkin Editor Demo
          </h1>
          <p className="text-gray-400">
            Interactive Gherkin editor with syntax highlighting, validation, and auto-completion
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={loadTemplate}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Load Template
          </button>
          
          <button
            onClick={clearContent}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
          
          <button
            onClick={exportGherkin}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Export .feature
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-400">
              Lines: {gherkinContent.split('\n').length}
            </span>
            <span className="text-sm text-gray-400">
              Characters: {gherkinContent.length}
            </span>
            {validationErrors.length > 0 && (
              <span className="text-sm text-red-400">
                Errors: {validationErrors.length}
              </span>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="bg-[#16161e] border border-white/10 rounded-xl overflow-hidden">
          <GherkinEditor
            value={gherkinContent}
            onChange={handleContentChange}
            onValidation={handleValidation}
            height="600px"
          />
        </div>

        {/* Features Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#16161e] border border-white/10 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Syntax Highlighting</h3>
            <p className="text-sm text-gray-400">
              Full Gherkin syntax highlighting with custom theme for better readability
            </p>
          </div>
          
          <div className="p-4 bg-[#16161e] border border-white/10 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Auto-completion</h3>
            <p className="text-sm text-gray-400">
              Smart suggestions for Gherkin keywords, common step patterns, and tags
            </p>
          </div>
          
          <div className="p-4 bg-[#16161e] border border-white/10 rounded-lg">
            <h3 className="text-lg font-semibold text-green-400 mb-2">Real-time Validation</h3>
            <p className="text-sm text-gray-400">
              Instant validation with error highlighting and helpful suggestions
            </p>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">How to Use</h3>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• Press <kbd className="px-1 py-0.5 bg-blue-500/20 rounded text-xs">Ctrl+Space</kbd> to trigger auto-completion</li>
            <li>• Hover over keywords to see documentation</li>
            <li>• Use the Format button to auto-indent your Gherkin content</li>
            <li>• Click Snippets to insert common Gherkin templates</li>
            <li>• Validation errors are highlighted in real-time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GherkinEditorDemo;