import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

const GherkinEditor = ({ 
  value = '', 
  onChange, 
  onValidation,
  readOnly = false,
  height = '400px',
  theme = 'vs-dark'
}) => {
  const [editorValue, setEditorValue] = useState(value);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Gherkin keywords for syntax highlighting and validation
  const gherkinKeywords = [
    'Feature', 'Background', 'Scenario', 'Scenario Outline', 'Examples',
    'Given', 'When', 'Then', 'And', 'But', '*',
    '@', 'Rule', 'Example'
  ];

  // Common Gherkin step patterns for validation
  const commonStepPatterns = [
    /^(Given|When|Then|And|But|\*)\s+.+/,
    /^@\w+(\s+@\w+)*$/,  // Tags
    /^Feature:\s*.+/,     // Feature declaration
    /^Scenario:\s*.+/,    // Scenario declaration
    /^Scenario Outline:\s*.+/, // Scenario Outline
    /^Background:\s*$/,   // Background
    /^Examples:\s*$/,     // Examples
    /^\s*\|.*\|$/,       // Table rows
    /^\s*$/,             // Empty lines
    /^\s*#.*$/           // Comments
  ];

  // Auto-completion suggestions
  const getAutoCompletionSuggestions = (model, position) => {
    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    const currentLine = model.getLineContent(position.lineNumber);
    const currentWord = model.getWordUntilPosition(position);

    const suggestions = [];

    // Gherkin keyword suggestions
    const keywordSuggestions = [
      {
        label: 'Feature',
        kind: monacoRef.current.languages.CompletionItemKind.Keyword,
        insertText: 'Feature: ${1:Feature name}\n  ${2:Feature description}\n\n  Scenario: ${3:Scenario name}\n    Given ${4:precondition}\n    When ${5:action}\n    Then ${6:expected result}',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Create a new Feature with scenario template'
      },
      {
        label: 'Scenario',
        kind: monacoRef.current.languages.CompletionItemKind.Keyword,
        insertText: 'Scenario: ${1:Scenario name}\n  Given ${2:precondition}\n  When ${3:action}\n  Then ${4:expected result}',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Create a new Scenario with Given-When-Then template'
      },
      {
        label: 'Scenario Outline',
        kind: monacoRef.current.languages.CompletionItemKind.Keyword,
        insertText: 'Scenario Outline: ${1:Scenario name}\n  Given ${2:precondition with <parameter>}\n  When ${3:action with <parameter>}\n  Then ${4:expected result with <parameter>}\n\n  Examples:\n    | ${5:parameter} |\n    | ${6:value1}    |\n    | ${7:value2}    |',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Create a Scenario Outline with Examples table'
      },
      {
        label: 'Background',
        kind: monacoRef.current.languages.CompletionItemKind.Keyword,
        insertText: 'Background:\n  Given ${1:common precondition}',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Create a Background section for common steps'
      },
      {
        label: 'Given',
        kind: monacoRef.current.languages.CompletionItemKind.Keyword,
        insertText: 'Given ${1:precondition}',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Given step - describes the initial context'
      },
      {
        label: 'When',
        kind: monacoRef.current.languages.CompletionItemKind.Keyword,
        insertText: 'When ${1:action}',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'When step - describes the action or event'
      },
      {
        label: 'Then',
        kind: monacoRef.current.languages.CompletionItemKind.Keyword,
        insertText: 'Then ${1:expected result}',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Then step - describes the expected outcome'
      },
      {
        label: 'And',
        kind: monacoRef.current.languages.CompletionItemKind.Keyword,
        insertText: 'And ${1:additional step}',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'And step - continues the previous step type'
      },
      {
        label: 'But',
        kind: monacoRef.current.languages.CompletionItemKind.Keyword,
        insertText: 'But ${1:exception or contrast}',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'But step - expresses a contrast or exception'
      }
    ];

    // Common step patterns
    const stepPatterns = [
      {
        label: 'I am logged in as a user',
        kind: monacoRef.current.languages.CompletionItemKind.Snippet,
        insertText: 'I am logged in as a "${1:role}" user',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Common authentication step'
      },
      {
        label: 'I navigate to the page',
        kind: monacoRef.current.languages.CompletionItemKind.Snippet,
        insertText: 'I navigate to the "${1:page name}" page',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Navigation step'
      },
      {
        label: 'I click on the button',
        kind: monacoRef.current.languages.CompletionItemKind.Snippet,
        insertText: 'I click on the "${1:button name}" button',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Button click action'
      },
      {
        label: 'I fill in the field',
        kind: monacoRef.current.languages.CompletionItemKind.Snippet,
        insertText: 'I fill in the "${1:field name}" field with "${2:value}"',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Form field input'
      },
      {
        label: 'I should see the message',
        kind: monacoRef.current.languages.CompletionItemKind.Snippet,
        insertText: 'I should see the message "${1:message text}"',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Message verification'
      },
      {
        label: 'I should be redirected to',
        kind: monacoRef.current.languages.CompletionItemKind.Snippet,
        insertText: 'I should be redirected to the "${1:page name}" page',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Redirection verification'
      },
      {
        label: 'the system should display',
        kind: monacoRef.current.languages.CompletionItemKind.Snippet,
        insertText: 'the system should display "${1:element or message}"',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'System display verification'
      },
      {
        label: 'the database should contain',
        kind: monacoRef.current.languages.CompletionItemKind.Snippet,
        insertText: 'the database should contain a ${1:record type} with ${2:field} "${3:value}"',
        insertTextRules: monacoRef.current.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Database verification'
      }
    ];

    // Context-aware suggestions
    const lineStart = currentLine.trim();
    
    if (lineStart === '' || position.column === 1) {
      // At the beginning of a line, suggest keywords
      suggestions.push(...keywordSuggestions);
    } else if (lineStart.startsWith('Given') || lineStart.startsWith('When') || lineStart.startsWith('Then') || lineStart.startsWith('And') || lineStart.startsWith('But')) {
      // Inside a step, suggest step patterns
      suggestions.push(...stepPatterns);
    }

    // Tag suggestions
    if (currentLine.trim().startsWith('@') || currentWord.word.startsWith('@')) {
      const tagSuggestions = [
        {
          label: '@smoke',
          kind: monacoRef.current.languages.CompletionItemKind.Keyword,
          insertText: '@smoke',
          documentation: 'Smoke test tag'
        },
        {
          label: '@regression',
          kind: monacoRef.current.languages.CompletionItemKind.Keyword,
          insertText: '@regression',
          documentation: 'Regression test tag'
        },
        {
          label: '@integration',
          kind: monacoRef.current.languages.CompletionItemKind.Keyword,
          insertText: '@integration',
          documentation: 'Integration test tag'
        },
        {
          label: '@api',
          kind: monacoRef.current.languages.CompletionItemKind.Keyword,
          insertText: '@api',
          documentation: 'API test tag'
        },
        {
          label: '@ui',
          kind: monacoRef.current.languages.CompletionItemKind.Keyword,
          insertText: '@ui',
          documentation: 'UI test tag'
        },
        {
          label: '@critical',
          kind: monacoRef.current.languages.CompletionItemKind.Keyword,
          insertText: '@critical',
          documentation: 'Critical test tag'
        }
      ];
      suggestions.push(...tagSuggestions);
    }

    return { suggestions };
  };

  // Initialize Monaco Editor
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Gherkin language
    monaco.languages.register({ id: 'gherkin' });

    // Define Gherkin syntax highlighting
    monaco.languages.setMonarchTokensProvider('gherkin', {
      keywords: gherkinKeywords,
      tokenizer: {
        root: [
          // Feature declaration
          [/^Feature:.*$/, 'keyword.feature'],
          
          // Scenario declarations
          [/^(Scenario|Scenario Outline):.*$/, 'keyword.scenario'],
          
          // Background
          [/^Background:.*$/, 'keyword.background'],
          
          // Examples
          [/^Examples:.*$/, 'keyword.examples'],
          
          // Step keywords
          [/^(Given|When|Then|And|But|\*)/, 'keyword.step'],
          
          // Tags
          [/^@\w+/, 'tag'],
          
          // Table separators
          [/\|/, 'delimiter.table'],
          
          // Comments
          [/#.*$/, 'comment'],
          
          // Strings in quotes
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          
          // Numbers
          [/\d+/, 'number'],
          
          // Whitespace
          [/[ \t\r\n]+/, 'white']
        ],
        
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ],
        
        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop']
        ]
      }
    });

    // Define Gherkin theme
    monaco.editor.defineTheme('gherkin-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword.feature', foreground: '#C586C0', fontStyle: 'bold' },
        { token: 'keyword.scenario', foreground: '#4EC9B0', fontStyle: 'bold' },
        { token: 'keyword.background', foreground: '#DCDCAA', fontStyle: 'bold' },
        { token: 'keyword.examples', foreground: '#DCDCAA', fontStyle: 'bold' },
        { token: 'keyword.step', foreground: '#569CD6', fontStyle: 'bold' },
        { token: 'tag', foreground: '#D7BA7D' },
        { token: 'delimiter.table', foreground: '#808080' },
        { token: 'comment', foreground: '#6A9955', fontStyle: 'italic' },
        { token: 'string', foreground: '#CE9178' },
        { token: 'number', foreground: '#B5CEA8' }
      ],
      colors: {
        'editor.background': '#0a0a0f',
        'editor.foreground': '#D4D4D4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#C6C6C6',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41'
      }
    });

    // Set the theme
    monaco.editor.setTheme('gherkin-dark');

    // Register auto-completion provider
    monaco.languages.registerCompletionItemProvider('gherkin', {
      provideCompletionItems: (model, position) => {
        return getAutoCompletionSuggestions(model, position);
      }
    });

    // Register hover provider for documentation
    monaco.languages.registerHoverProvider('gherkin', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const hoverInfo = {
          'Feature': 'A Feature represents a business functionality. It contains multiple scenarios that test different aspects of that functionality.',
          'Scenario': 'A Scenario describes a specific example of how the system should behave under certain conditions.',
          'Given': 'Given steps describe the initial context or preconditions for the scenario.',
          'When': 'When steps describe the action or event that triggers the behavior being tested.',
          'Then': 'Then steps describe the expected outcome or result of the action.',
          'And': 'And steps continue the previous step type (Given, When, or Then).',
          'But': 'But steps express a contrast or exception to the previous step.',
          'Background': 'Background contains steps that are common to all scenarios in a feature.',
          'Examples': 'Examples provide concrete data for Scenario Outlines with parameters.'
        };

        const info = hoverInfo[word.word];
        if (info) {
          return {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: word.endColumn
            },
            contents: [
              { value: `**${word.word}**` },
              { value: info }
            ]
          };
        }

        return null;
      }
    });

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'line',
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: readOnly,
      cursorStyle: 'line',
      automaticLayout: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10
      }
    });

    // Add validation on content change
    editor.onDidChangeModelContent(() => {
      const currentValue = editor.getValue();
      setEditorValue(currentValue);
      validateGherkin(currentValue);
      
      if (onChange) {
        onChange(currentValue);
      }
    });
  };

  // Validate Gherkin syntax
  const validateGherkin = (content) => {
    setIsValidating(true);
    const errors = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        return;
      }

      // Check if line matches any valid Gherkin pattern
      const isValid = commonStepPatterns.some(pattern => pattern.test(line));
      
      if (!isValid) {
        errors.push({
          line: index + 1,
          column: 1,
          message: `Invalid Gherkin syntax: "${trimmedLine}"`,
          severity: 'error'
        });
      }

      // Additional specific validations
      
      // Check for proper indentation of steps
      if (/^(Given|When|Then|And|But|\*)/.test(trimmedLine)) {
        if (line.startsWith(' ') && !line.startsWith('  ')) {
          errors.push({
            line: index + 1,
            column: 1,
            message: 'Steps should be indented with 2 spaces',
            severity: 'warning'
          });
        }
      }

      // Check for missing colons after keywords
      if (/^(Feature|Scenario|Scenario Outline|Background|Examples)\s+[^:]*$/.test(trimmedLine)) {
        errors.push({
          line: index + 1,
          column: trimmedLine.length,
          message: 'Missing colon after keyword',
          severity: 'error'
        });
      }

      // Check for empty feature/scenario names
      if (/^(Feature|Scenario|Scenario Outline):\s*$/.test(trimmedLine)) {
        errors.push({
          line: index + 1,
          column: trimmedLine.length,
          message: 'Feature/Scenario name cannot be empty',
          severity: 'error'
        });
      }
    });

    setValidationErrors(errors);
    setIsValidating(false);

    // Update Monaco markers
    if (editorRef.current && monacoRef.current) {
      const markers = errors.map(error => ({
        startLineNumber: error.line,
        startColumn: error.column,
        endLineNumber: error.line,
        endColumn: error.column + 10,
        message: error.message,
        severity: error.severity === 'error' 
          ? monacoRef.current.MarkerSeverity.Error 
          : monacoRef.current.MarkerSeverity.Warning
      }));

      monacoRef.current.editor.setModelMarkers(
        editorRef.current.getModel(),
        'gherkin-validation',
        markers
      );
    }

    // Call validation callback
    if (onValidation) {
      onValidation(errors);
    }
  };

  // Update editor value when prop changes
  useEffect(() => {
    if (value !== editorValue && editorRef.current) {
      setEditorValue(value);
      editorRef.current.setValue(value);
    }
  }, [value]);

  // Format Gherkin content
  const formatContent = () => {
    if (!editorRef.current) return;

    const content = editorRef.current.getValue();
    const lines = content.split('\n');
    const formattedLines = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        formattedLines.push('');
        return;
      }

      if (trimmed.startsWith('#')) {
        formattedLines.push(trimmed);
        return;
      }

      if (/^(Feature|Scenario|Scenario Outline|Background|Examples):/.test(trimmed)) {
        formattedLines.push(trimmed);
        return;
      }

      if (/^@\w+/.test(trimmed)) {
        formattedLines.push(trimmed);
        return;
      }

      if (/^(Given|When|Then|And|But|\*)/.test(trimmed)) {
        formattedLines.push(`  ${trimmed}`);
        return;
      }

      if (/^\|.*\|$/.test(trimmed)) {
        formattedLines.push(`    ${trimmed}`);
        return;
      }

      formattedLines.push(line);
    });

    const formattedContent = formattedLines.join('\n');
    editorRef.current.setValue(formattedContent);
  };

  // Insert Gherkin snippet
  const insertSnippet = (snippet) => {
    if (!editorRef.current) return;

    const position = editorRef.current.getPosition();
    const range = {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    };

    editorRef.current.executeEdits('insert-snippet', [{
      range: range,
      text: snippet
    }]);

    editorRef.current.focus();
  };

  return (
    <div className="gherkin-editor-container">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-[#16161e] border border-white/10 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-white">Gherkin Editor</span>
          </div>
          
          {isValidating && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Validating...
            </div>
          )}
          
          {!isValidating && validationErrors.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
            </div>
          )}
          
          {!isValidating && validationErrors.length === 0 && editorValue.trim() && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Valid Gherkin
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={formatContent}
            className="px-3 py-1 text-xs bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-600/30 transition-colors"
            title="Format Gherkin"
          >
            Format
          </button>
          
          <div className="relative group">
            <button className="px-3 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/30 transition-colors">
              Snippets
            </button>
            
            <div className="absolute right-0 top-8 w-48 bg-[#16161e] border border-white/10 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => insertSnippet('Feature: \n  \n  Scenario: \n    Given \n    When \n    Then ')}
                  className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-white/10 rounded"
                >
                  Feature Template
                </button>
                <button
                  onClick={() => insertSnippet('Scenario: \n  Given \n  When \n  Then ')}
                  className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-white/10 rounded"
                >
                  Scenario Template
                </button>
                <button
                  onClick={() => insertSnippet('Given ')}
                  className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-white/10 rounded"
                >
                  Given Step
                </button>
                <button
                  onClick={() => insertSnippet('When ')}
                  className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-white/10 rounded"
                >
                  When Step
                </button>
                <button
                  onClick={() => insertSnippet('Then ')}
                  className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-white/10 rounded"
                >
                  Then Step
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="border border-t-0 border-white/10 rounded-b-lg overflow-hidden">
        <Editor
          height={height}
          language="gherkin"
          value={editorValue}
          theme="gherkin-dark"
          onMount={handleEditorDidMount}
          options={{
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: readOnly,
            cursorStyle: 'line',
            automaticLayout: true
          }}
        />
      </div>

      {/* Validation Errors Panel */}
      {validationErrors.length > 0 && (
        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <h4 className="text-sm font-medium text-red-400 mb-2">Validation Errors:</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {validationErrors.map((error, index) => (
              <div key={index} className="text-xs text-red-300 flex items-start gap-2">
                <span className="text-red-500 font-mono">Line {error.line}:</span>
                <span>{error.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GherkinEditor;