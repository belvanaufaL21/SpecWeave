import { supabaseAdmin as supabase } from '../config/supabase.js';

export const referenceController = {
  // Get all references for current user (including public ones)
  async getReferences(req, res) {
    try {
      const userId = req.user?.id;
      
      // If no user (offline mode), return empty array to trigger offline mode
      if (!userId) {
        return res.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            userReferences: 0,
            publicReferences: 0,
            offlineMode: true
          }
        });
      }

      // Get user's own references + public references
      const { data, error } = await supabase
        .from('scenario_references')
        .select('*')
        .or(`user_id.eq.${userId},is_public.eq.true`)
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching references:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch references',
          error: error.message
        });
      }

      // Transform data for frontend
      const transformedData = data.map(ref => ({
        id: ref.id,
        title: ref.title,
        description: ref.description,
        gherkinContent: ref.gherkin_content,
        category: ref.category,
        tags: ref.tags || [],
        usageCount: ref.usage_count || 0,
        averageScore: ref.average_score,
        isPublic: ref.is_public,
        isOwner: ref.user_id === userId,
        createdAt: ref.created_at,
        updatedAt: ref.updated_at
      }));

      res.json({
        success: true,
        data: transformedData,
        meta: {
          total: transformedData.length,
          userReferences: transformedData.filter(ref => ref.isOwner).length,
          publicReferences: transformedData.filter(ref => !ref.isOwner).length
        }
      });

    } catch (error) {
      console.error('Error in getReferences:', error);
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
            description: req.body.description,
            gherkinContent: req.body.gherkinContent,
            category: req.body.category || 'general',
            tags: req.body.tags || [],
            usageCount: 0,
            averageScore: null,
            isPublic: req.body.isPublic || false,
            isOwner: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          message: 'Reference created in offline mode',
          offlineMode: true
        });
      }

      const {
        title,
        description,
        gherkinContent,
        category = 'general',
        tags = [],
        isPublic = false
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
          description: description?.trim() || null,
          gherkin_content: gherkinContent.trim(),
          category: category.trim(),
          tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [],
          is_public: isPublic,
          usage_count: 0
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
        description: data.description,
        gherkinContent: data.gherkin_content,
        category: data.category,
        tags: data.tags || [],
        usageCount: data.usage_count || 0,
        averageScore: data.average_score,
        isPublic: data.is_public,
        isOwner: true,
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
        description,
        gherkinContent,
        category,
        tags,
        isPublic
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
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (gherkinContent !== undefined) updateData.gherkin_content = gherkinContent.trim();
      if (category !== undefined) updateData.category = category.trim();
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [];
      if (isPublic !== undefined) updateData.is_public = isPublic;

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
        description: data.description,
        gherkinContent: data.gherkin_content,
        category: data.category,
        tags: data.tags || [],
        usageCount: data.usage_count || 0,
        averageScore: data.average_score,
        isPublic: data.is_public,
        isOwner: true,
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

  // Delete reference
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

      // Check if reference exists and user owns it
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

      if (existingRef.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own references'
        });
      }

      // Delete reference
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
        .select('category, usage_count, average_score, is_public')
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
        totalReferences: data.length,
        publicReferences: data.filter(ref => ref.is_public).length,
        privateReferences: data.filter(ref => !ref.is_public).length,
        totalUsage: data.reduce((sum, ref) => sum + (ref.usage_count || 0), 0),
        averageScore: data.length > 0 
          ? data.reduce((sum, ref) => sum + (ref.average_score || 0), 0) / data.length 
          : 0,
        categoryBreakdown: data.reduce((acc, ref) => {
          acc[ref.category] = (acc[ref.category] || 0) + 1;
          return acc;
        }, {}),
        mostUsedReferences: data
          .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
          .slice(0, 5)
          .map(ref => ({
            category: ref.category,
            usageCount: ref.usage_count || 0,
            averageScore: ref.average_score || 0
          }))
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