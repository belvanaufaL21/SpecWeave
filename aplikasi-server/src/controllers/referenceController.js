import { supabaseAdmin as supabase } from '../config/supabase.js';
import cleanLogger from '../config/cleanLogging.js';

export const referenceController = {
  // Get all references for current user
  async getReferences(req, res) {
    try {
      const userId = req.user?.id;
      
      cleanLogger.debug('REFERENCE-CONTROLLER', 'Getting references for user', { userId: userId || 'anonymous' });
      
      // Get references: templates (user_id IS NULL) + user's own references
      let query = supabase
        .from('scenario_references')
        .select('*');
      
      if (userId) {
        // If user is authenticated, get templates + their own references
        query = query.or(`user_id.is.null,user_id.eq.${userId}`);
        cleanLogger.debug('REFERENCE-CONTROLLER', 'Authenticated user - getting templates + personal references');
      } else {
        // If no user, only show templates
        query = query.is('user_id', null);
        cleanLogger.debug('REFERENCE-CONTROLLER', 'Anonymous user - showing templates only');
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) {
        cleanLogger.error('REFERENCE-CONTROLLER', 'Error fetching references', { error: error.message });
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch references',
          error: error.message
        });
      }

      cleanLogger.debug('REFERENCE-CONTROLLER', `Found ${data.length} references before filtering`);

      // Get user's hidden templates if authenticated
      let hiddenTemplateIds = [];
      if (userId) {
        const { data: hiddenData } = await supabase
          .from('user_hidden_templates')
          .select('template_id')
          .eq('user_id', userId);
        
        if (hiddenData) {
          hiddenTemplateIds = hiddenData.map(h => h.template_id);
          cleanLogger.debug('REFERENCE-CONTROLLER', `User has ${hiddenTemplateIds.length} hidden templates`);
        }
      }

      // Filter out hidden templates
      const filteredData = data.filter(ref => {
        // If it's a template and user has hidden it, exclude it
        if (!ref.user_id && hiddenTemplateIds.includes(ref.id)) {
          return false;
        }
        return true;
      });

      cleanLogger.debug('REFERENCE-CONTROLLER', `Showing ${filteredData.length} references after filtering`);

      // Transform data for frontend
      const transformedData = filteredData.map(ref => ({
        id: ref.id,
        title: ref.title,
        gherkinContent: ref.gherkin_content,
        createdAt: ref.created_at,
        updatedAt: ref.updated_at,
        isTemplate: !ref.user_id, // Template if no user_id
        isOwner: ref.user_id === userId // User owns it if user_id matches
      }));

      const response = {
        success: true,
        data: transformedData,
        meta: {
          total: transformedData.length,
          templates: transformedData.filter(ref => ref.isTemplate).length,
          userReferences: transformedData.filter(ref => ref.isOwner).length,
          authenticated: !!userId
        }
      };
      
      cleanLogger.debug('REFERENCE-CONTROLLER', 'Response meta', response.meta);

      res.json(response);

    } catch (error) {
      cleanLogger.error('REFERENCE-CONTROLLER', 'Error in getReferences', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Create new reference
  async createReference(req, res) {
    try {
      const userId = req.user?.id;
      
      // If no user (offline mode), return success to let frontend handle offline storage
      if (!userId) {
        return res.json({
          success: true,
          data: {
            id: Date.now().toString(),
            title: req.body.title,
            gherkinContent: req.body.gherkinContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          message: 'Reference created in offline mode',
          offlineMode: true
        });
      }

      const {
        title,
        gherkinContent
      } = req.body;

      // Validation
      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }

      if (!gherkinContent?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Gherkin content is required'
        });
      }

      // Insert new reference
      const { data, error } = await supabase
        .from('scenario_references')
        .insert({
          user_id: userId,
          title: title.trim(),
          gherkin_content: gherkinContent.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating reference:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create reference',
          error: error.message
        });
      }

      // Transform response
      const transformedData = {
        id: data.id,
        title: data.title,
        gherkinContent: data.gherkin_content,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      res.status(201).json({
        success: true,
        data: transformedData,
        message: 'Reference created successfully'
      });

    } catch (error) {
      console.error('Error in createReference:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Update reference
  async updateReference(req, res) {
    try {
      const userId = req.user?.id;
      const referenceId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const {
        title,
        gherkinContent
      } = req.body;

      // Check if reference exists and user owns it
      const { data: existingRef, error: fetchError } = await supabase
        .from('scenario_references')
        .select('user_id')
        .eq('id', referenceId)
        .single();

      if (fetchError || !existingRef) {
        return res.status(404).json({
          success: false,
          message: 'Reference not found'
        });
      }

      // Cannot update templates (user_id is null) - user should copy it instead
      if (!existingRef.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Cannot edit template. Please copy it to your library first.',
          shouldCopy: true
        });
      }

      if (existingRef.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own references'
        });
      }

      // Prepare update data
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (title !== undefined) updateData.title = title.trim();
      if (gherkinContent !== undefined) updateData.gherkin_content = gherkinContent.trim();

      // Update reference
      const { data, error } = await supabase
        .from('scenario_references')
        .update(updateData)
        .eq('id', referenceId)
        .select()
        .single();

      if (error) {
        console.error('Error updating reference:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update reference',
          error: error.message
        });
      }

      // Transform response
      const transformedData = {
        id: data.id,
        title: data.title,
        gherkinContent: data.gherkin_content,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      res.json({
        success: true,
        data: transformedData,
        message: 'Reference updated successfully'
      });

    } catch (error) {
      console.error('Error in updateReference:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Delete reference (or hide template)
  async deleteReference(req, res) {
    try {
      const userId = req.user?.id;
      const referenceId = req.params.id;
      
      // If no user (offline mode), return success to let frontend handle offline storage
      if (!userId) {
        return res.json({
          success: true,
          message: 'Reference deleted in offline mode',
          offlineMode: true
        });
      }

      // Check if reference exists
      const { data: existingRef, error: fetchError } = await supabase
        .from('scenario_references')
        .select('user_id, title')
        .eq('id', referenceId)
        .single();

      if (fetchError || !existingRef) {
        return res.status(404).json({
          success: false,
          message: 'Reference not found'
        });
      }

      // If it's a template (user_id is null), hide it instead of deleting
      if (!existingRef.user_id) {
        // Check if already hidden
        const { data: alreadyHidden } = await supabase
          .from('user_hidden_templates')
          .select('id')
          .eq('user_id', userId)
          .eq('template_id', referenceId)
          .single();

        if (alreadyHidden) {
          return res.json({
            success: true,
            message: `Template "${existingRef.title}" already hidden`
          });
        }

        // Hide the template for this user
        const { error: hideError } = await supabase
          .from('user_hidden_templates')
          .insert({
            user_id: userId,
            template_id: referenceId
          });

        if (hideError) {
          console.error('Error hiding template:', hideError);
          return res.status(500).json({
            success: false,
            message: 'Failed to hide template',
            error: hideError.message
          });
        }

        return res.json({
          success: true,
          message: `Template "${existingRef.title}" hidden successfully`,
          isHidden: true
        });
      }

      // If it's user's own reference, check ownership
      if (existingRef.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own references'
        });
      }

      // Delete user's own reference
      const { error } = await supabase
        .from('scenario_references')
        .delete()
        .eq('id', referenceId);

      if (error) {
        console.error('Error deleting reference:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete reference',
          error: error.message
        });
      }

      res.json({
        success: true,
        message: `Reference "${existingRef.title}" deleted successfully`
      });

    } catch (error) {
      console.error('Error in deleteReference:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Unhide a template (restore hidden template)
  async unhideTemplate(req, res) {
    try {
      const userId = req.user?.id;
      const templateId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify it's actually a template
      const { data: template, error: fetchError } = await supabase
        .from('scenario_references')
        .select('user_id, title')
        .eq('id', templateId)
        .single();

      if (fetchError || !template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      if (template.user_id) {
        return res.status(400).json({
          success: false,
          message: 'This is not a template, cannot unhide'
        });
      }

      // Remove from hidden templates
      const { error } = await supabase
        .from('user_hidden_templates')
        .delete()
        .eq('user_id', userId)
        .eq('template_id', templateId);

      if (error) {
        console.error('Error unhiding template:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to unhide template',
          error: error.message
        });
      }

      res.json({
        success: true,
        message: `Template "${template.title}" restored successfully`
      });

    } catch (error) {
      console.error('Error in unhideTemplate:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Increment usage count when reference is used
  async incrementUsage(req, res) {
    try {
      const userId = req.user?.id;
      const referenceId = req.params.id;
      const { score } = req.body; // Optional METEOR score for this usage
      
      // If no user (offline mode), return success
      if (!userId) {
        return res.json({
          success: true,
          message: 'Usage tracked in offline mode',
          data: {
            usageCount: 1,
            averageScore: score || 0
          },
          offlineMode: true
        });
      }

      // Get current reference data
      const { data: currentRef, error: fetchError } = await supabase
        .from('scenario_references')
        .select('usage_count, average_score')
        .eq('id', referenceId)
        .single();

      if (fetchError || !currentRef) {
        return res.status(404).json({
          success: false,
          message: 'Reference not found'
        });
      }

      const currentUsageCount = currentRef.usage_count || 0;
      const currentAvgScore = currentRef.average_score || 0;
      
      // Calculate new average score if score is provided
      let newAvgScore = currentAvgScore;
      if (score !== undefined && score >= 0 && score <= 1) {
        if (currentUsageCount === 0) {
          newAvgScore = score;
        } else {
          // Calculate running average
          newAvgScore = ((currentAvgScore * currentUsageCount) + score) / (currentUsageCount + 1);
        }
      }

      // Update usage count and average score
      const { error } = await supabase
        .from('scenario_references')
        .update({
          usage_count: currentUsageCount + 1,
          average_score: newAvgScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', referenceId);

      if (error) {
        console.error('Error updating usage count:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update usage count',
          error: error.message
        });
      }

      res.json({
        success: true,
        message: 'Usage count updated successfully',
        data: {
          usageCount: currentUsageCount + 1,
          averageScore: newAvgScore
        }
      });

    } catch (error) {
      console.error('Error in incrementUsage:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get reference statistics
  async getStatistics(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user's reference statistics
      const { data, error } = await supabase
        .from('scenario_references')
        .select('id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching statistics:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch statistics',
          error: error.message
        });
      }

      // Calculate statistics
      const stats = {
        totalReferences: data.length
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error in getStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};
