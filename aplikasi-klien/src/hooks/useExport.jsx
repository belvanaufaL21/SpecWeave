import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useJira } from '../contexts/JiraContext';
import { formatDateTime } from '../utils/localization';

const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { user, profile } = useAuth();
  const { epicContext, hasConnection } = useJira();

  // Generate Excel file from chat messages
  const exportToExcel = async (messages, chatTitle = 'SpecWeave Export') => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Filter AI messages with scenarios
      const aiMessages = messages.filter(msg => 
        msg.role === 'assistant' && 
        msg.content && 
        msg.content.includes('scenarios')
      );

      if (aiMessages.length === 0) {
        throw new Error('No scenarios found to export');
      }

      setExportProgress(20);

      // Parse scenarios from messages
      const allScenarios = [];
      let featureTitle = chatTitle;

      for (const message of aiMessages) {
        try {
          const data = JSON.parse(message.content);
          if (data.feature && data.scenarios) {
            featureTitle = data.feature;
            data.scenarios.forEach((scenario, index) => {
              allScenarios.push({
                feature: data.feature,
                userStory: data.userStory,
                scenarioTitle: scenario.title || `Scenario ${index + 1}`,
                given: scenario.given,
                when: scenario.when,
                then: scenario.then,
                timestamp: message.timestamp || message.createdAt
              });
            });
          }
        } catch (e) {
          console.warn('Failed to parse message content:', e);
        }
      }

      setExportProgress(50);

      // Create workbook data
      const workbookData = {
        scenarios: allScenarios,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: profile?.name || user?.email || 'Unknown User',
          chatTitle: chatTitle,
          totalScenarios: allScenarios.length,
          epicContext: epicContext ? {
            epicKey: epicContext.key,
            epicName: epicContext.name,
            projectKey: epicContext.projectKey
          } : null
        }
      };

      setExportProgress(75);

      // Generate and download file
      await downloadExcelFile(workbookData, featureTitle);
      
      setExportProgress(100);

      // Log export activity
      console.log('Export completed:', {
        scenarios: allScenarios.length,
        feature: featureTitle,
        user: user?.email,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        scenarioCount: allScenarios.length,
        filename: `${sanitizeFilename(featureTitle)}_${new Date().toISOString().split('T')[0]}.xlsx`
      };

    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 1000);
    }
  };

  // Download Excel file using SheetJS
  const downloadExcelFile = async (data, filename) => {
    // Dynamic import to avoid bundle size issues
    const XLSX = await import('xlsx');
    
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Scenarios sheet
    const scenarioData = data.scenarios.map(scenario => ({
      'Feature': scenario.feature,
      'User Story': scenario.userStory,
      'Scenario': scenario.scenarioTitle,
      'Given': scenario.given,
      'When': scenario.when,
      'Then': scenario.then,
      'Created': formatDateTime(scenario.timestamp)
    }));

    const scenarioSheet = XLSX.utils.json_to_sheet(scenarioData);
    
    // Auto-size columns
    const scenarioRange = XLSX.utils.decode_range(scenarioSheet['!ref']);
    const colWidths = [];
    for (let C = scenarioRange.s.c; C <= scenarioRange.e.c; ++C) {
      let maxWidth = 10;
      for (let R = scenarioRange.s.r; R <= scenarioRange.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = scenarioSheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = cell.v.toString().length;
          maxWidth = Math.max(maxWidth, Math.min(cellLength, 50));
        }
      }
      colWidths.push({ width: maxWidth });
    }
    scenarioSheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, scenarioSheet, 'Scenarios');

    // Metadata sheet
    const metadataData = [
      ['Export Information', ''],
      ['Exported At', formatDateTime(data.metadata.exportedAt)],
      ['Exported By', data.metadata.exportedBy],
      ['Chat Title', data.metadata.chatTitle],
      ['Total Scenarios', data.metadata.totalScenarios],
      ['', ''],
      ['JIRA Context', ''],
      ['Epic Key', data.metadata.epicContext?.epicKey || 'Not Set'],
      ['Epic Name', data.metadata.epicContext?.epicName || 'Not Set'],
      ['Project Key', data.metadata.epicContext?.projectKey || 'Not Set'],
      ['', ''],
      ['Generated by SpecWeave', 'AI-Powered Gherkin Generator']
    ];

    const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData);
    metadataSheet['!cols'] = [{ width: 20 }, { width: 40 }];
    XLSX.utils.book_append_sheet(wb, metadataSheet, 'Export Info');

    // Generate and download
    const sanitizedFilename = sanitizeFilename(filename);
    const finalFilename = `${sanitizedFilename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, finalFilename);
  };

  // Sanitize filename for safe download
  const sanitizeFilename = (filename) => {
    return filename
      .replace(/[^a-z0-9\s-_]/gi, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length
  };

  // Export with JIRA integration
  const exportToJira = async (messages, chatTitle) => {
    if (!hasConnection) {
      throw new Error('JIRA connection not configured');
    }

    setIsExporting(true);
    
    try {
      // First export to Excel
      const excelResult = await exportToExcel(messages, chatTitle);
      
      // Then create JIRA tickets (if implemented)
      // This would require backend integration
      console.log('JIRA export not yet implemented');
      
      return {
        ...excelResult,
        jiraTickets: [] // Placeholder for JIRA ticket URLs
      };
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToExcel,
    exportToJira,
    isExporting,
    exportProgress
  };
};

export default useExport;