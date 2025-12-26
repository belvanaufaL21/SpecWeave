import EnhancedMeteorService from '../services/enhancedMeteorService.js';

const enhancedMeteorService = new EnhancedMeteorService();

class EnhancedMeteorController {
  /**
   * Validate Gherkin syntax
   */
  async validateGherkin(req, res) {
    try {
      const { scenarioText } = req.body;

      if (!scenarioText) {
        return res.status(400).json({
          success: false,
          message: 'Scenario text is required'
        });
      }

      const validationResult = enhancedMeteorService.validateGherkinSyntax(scenarioText);

      res.json({
        success: true,
        data: validationResult
      });
    } catch (error) {
      console.error('Gherkin validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate Gherkin syntax',
        error: error.message
      });
    }
  }

  /**
   * Perform detailed METEOR evaluation
   */
  async evaluateDetailed(req, res) {
    try {
      const { generatedScenario, referenceScenario, scenarioIndex, options = {} } = req.body;

      if (!generatedScenario || !referenceScenario) {
        return res.status(400).json({
          success: false,
          message: 'Both generated and reference scenarios are required'
        });
      }

      console.log('🔍 Enhanced METEOR evaluation request:', {
        generatedLength: generatedScenario.length,
        referenceLength: referenceScenario.length,
        scenarioIndex,
        options
      });

      const result = await enhancedMeteorService.evaluateScenarioDetailed(
        generatedScenario,
        referenceScenario,
        options
      );

      // Include original scenario data in the response
      const responseData = {
        ...result,
        generatedScenario,
        referenceScenario,
        scenarioIndex
      };

      // Store the test result if user is authenticated
      if (req.user) {
        try {
          await this.storeTestResult(req.user.id, {
            generatedScenario,
            referenceScenario,
            scenarioIndex,
            result: responseData,
            options
          });
        } catch (storeError) {
          console.error('Failed to store test result:', storeError);
          // Don't fail the request if storage fails
        }
      }

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('Enhanced METEOR evaluation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform METEOR evaluation',
        error: error.message
      });
    }
  }

  /**
   * Get test history for a user
   */
  async getTestHistory(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { limit = 50, offset = 0, scenarioIndex } = req.query;

      // For now, return empty array since we haven't implemented storage yet
      // This will be implemented in the next phase
      res.json({
        success: true,
        data: {
          tests: [],
          total: 0,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Get test history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve test history',
        error: error.message
      });
    }
  }

  /**
   * Store test result (placeholder for future implementation)
   */
  async storeTestResult(userId, testData) {
    // This will be implemented when we add the database schema
    // For now, just log the test result
    console.log('📊 Test result to store:', {
      userId,
      timestamp: new Date().toISOString(),
      meteorScore: testData.result.meteor_score,
      scenarioIndex: testData.scenarioIndex
    });
  }

  /**
   * Get METEOR configuration
   */
  async getConfiguration(req, res) {
    try {
      // Return default configuration for now
      const config = {
        alpha: 0.9,
        beta: 3.0,
        gamma: 0.5,
        thresholds: {
          excellent: 0.7,
          good: 0.5,
          fair: 0.3
        },
        options: {
          includeWordAlignment: true,
          includeComponentBreakdown: true,
          includeSimilarityMatrix: false
        }
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Get configuration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get configuration',
        error: error.message
      });
    }
  }

  /**
   * Update METEOR configuration
   */
  async updateConfiguration(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { alpha, beta, gamma, thresholds, options } = req.body;

      // Validate configuration values
      if (alpha !== undefined && (alpha < 0 || alpha > 1)) {
        return res.status(400).json({
          success: false,
          message: 'Alpha must be between 0 and 1'
        });
      }

      if (beta !== undefined && beta < 0) {
        return res.status(400).json({
          success: false,
          message: 'Beta must be non-negative'
        });
      }

      if (gamma !== undefined && (gamma < 0 || gamma > 1)) {
        return res.status(400).json({
          success: false,
          message: 'Gamma must be between 0 and 1'
        });
      }

      // For now, just return success
      // Configuration storage will be implemented in later phases
      console.log('⚙️ Configuration update request:', {
        userId,
        alpha,
        beta,
        gamma,
        thresholds,
        options
      });

      res.json({
        success: true,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      console.error('Update configuration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update configuration',
        error: error.message
      });
    }
  }

  /**
   * Export test results
   */
  async exportResults(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { format = 'json', dateFrom, dateTo } = req.query;

      // For now, return empty export
      // This will be implemented when we have test history storage
      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        date_range: { from: dateFrom, to: dateTo },
        tests: [],
        summary: {
          total_tests: 0,
          average_score: 0,
          score_distribution: {
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0
          }
        }
      };

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="meteor_test_results.csv"');
        
        const csvHeader = 'Date,Scenario Index,METEOR Score,Precision,Recall,F-Score,Quality Level\n';
        res.send(csvHeader);
      } else {
        res.json({
          success: true,
          data: exportData
        });
      }
    } catch (error) {
      console.error('Export results error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export results',
        error: error.message
      });
    }
  }

  /**
   * Get user's scenario references
   */
  async getReferences(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { category, search } = req.query;

      // Mock data for now - will be replaced with database query once table is created
      const mockReferences = [
        {
          id: '1',
          user_id: userId,
          title: 'Login Authentication',
          description: 'Basic login scenario with email and password validation',
          gherkin_content: `Feature: User Authentication

Scenario: Successful login with valid credentials
  Given pengguna berada di halaman login
  When pengguna memasukkan email "user@example.com"
  And pengguna memasukkan password "validpassword"
  And pengguna mengklik tombol "Login"
  Then pengguna berhasil masuk ke dashboard
  And pengguna melihat pesan "Selamat datang"`,
          category: 'authentication',
          tags: ['login', 'authentication', 'security'],
          usage_count: 5,
          average_score: 0.85,
          is_public: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          user_id: userId,
          title: 'Form Validation',
          description: 'Form validation scenario with required fields and error handling',
          gherkin_content: `Feature: Form Validation

Scenario: Form submission with missing required fields
  Given pengguna berada di halaman formulir pendaftaran
  When pengguna mengosongkan field "Email"
  And pengguna mengklik tombol "Submit"
  Then sistem menampilkan pesan error "Email wajib diisi"
  And formulir tidak terkirim
  And fokus berpindah ke field "Email"`,
          category: 'form',
          tags: ['validation', 'form', 'error-handling'],
          usage_count: 3,
          average_score: 0.78,
          is_public: true,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          user_id: userId,
          title: 'API Integration',
          description: 'API call scenario with success and error handling',
          gherkin_content: `Feature: API Integration

Scenario: Successful API data retrieval
  Given sistem terhubung dengan API eksternal
  When pengguna meminta data dari endpoint "/api/users"
  Then sistem mengirim request GET ke API
  And API mengembalikan status code 200
  And sistem menerima data dalam format JSON
  And data ditampilkan kepada pengguna`,
          category: 'api',
          tags: ['api', 'integration', 'http'],
          usage_count: 7,
          average_score: 0.92,
          is_public: true,
          created_at: new Date().toISOString()
        }
      ];

      let filteredReferences = mockReferences;

      if (category && category !== 'all') {
        filteredReferences = filteredReferences.filter(ref => ref.category === category);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredReferences = filteredReferences.filter(ref => 
          ref.title.toLowerCase().includes(searchLower) ||
          ref.description.toLowerCase().includes(searchLower) ||
          ref.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      res.json({
        success: true,
        data: filteredReferences
      });
    } catch (error) {
      console.error('Get references error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get references',
        error: error.message
      });
    }
  }

  /**
   * Create new scenario reference
   */
  async createReference(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { title, description, gherkinContent, category = 'general', tags = [] } = req.body;

      if (!title || !gherkinContent) {
        return res.status(400).json({
          success: false,
          message: 'Title and Gherkin content are required'
        });
      }

      // Mock response for now - will be replaced with database insert once table is created
      const newReference = {
        id: Date.now().toString(),
        user_id: userId,
        title: title.trim(),
        description: description?.trim(),
        gherkin_content: gherkinContent.trim(),
        category: category.trim(),
        tags: Array.isArray(tags) ? tags : [],
        usage_count: 0,
        average_score: null,
        is_public: false,
        created_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: newReference
      });
    } catch (error) {
      console.error('Create reference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create reference',
        error: error.message
      });
    }
  }

  /**
   * Update scenario reference
   */
  async updateReference(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { id } = req.params;
      const { title, description, gherkinContent, category, tags } = req.body;

      // Mock response for now - will be replaced with database update once table is created
      const updatedReference = {
        id,
        user_id: userId,
        title: title?.trim() || 'Updated Reference',
        description: description?.trim(),
        gherkin_content: gherkinContent?.trim() || 'Updated content',
        category: category?.trim() || 'general',
        tags: Array.isArray(tags) ? tags : [],
        usage_count: 0,
        average_score: null,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: updatedReference
      });
    } catch (error) {
      console.error('Update reference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update reference',
        error: error.message
      });
    }
  }

  /**
   * Delete scenario reference
   */
  async deleteReference(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { id } = req.params;

      // Mock response for now - will be replaced with database delete once table is created
      res.json({
        success: true,
        message: 'Reference deleted successfully'
      });
    } catch (error) {
      console.error('Delete reference error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete reference',
        error: error.message
      });
    }
  }
}

export default new EnhancedMeteorController();